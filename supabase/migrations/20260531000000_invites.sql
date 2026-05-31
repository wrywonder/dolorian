-- Phase 8 · Invite-by-contact + requests inbox
--
-- Adds the ability to invite a parent by email or phone — even before they
-- have joined — and to surface incoming connection requests on the You tab.
--
-- The hard part is RLS: parents can only SELECT parents they're already
-- connected to (see 20260518000001_rls.sql). That breaks invites two ways:
--   1. We can't look up a parent by email/phone to invite them.
--   2. We can't show "X wants to connect" before the edge is connected.
-- Both are solved with SECURITY DEFINER functions that run server-side and
-- bypass RLS for exactly these narrow operations.

-- ─────── parents: denormalized contact for lookup ───────
-- Email lives in auth.users; we copy it onto the parent row at onboarding so
-- invites can resolve against it without granting access to auth.users.
alter table parents add column if not exists email text;

-- Case-insensitive uniqueness on contact handles. Partial so existing rows
-- with NULL contact don't collide.
create unique index if not exists parents_email_unique
  on parents (lower(email)) where email is not null;
create unique index if not exists parents_phone_unique
  on parents (phone_e164) where phone_e164 is not null;

-- Backfill the two existing beta accounts from auth.users (migration runs as
-- superuser, so auth.users is readable here). Safe no-op for fresh databases.
update parents p
  set email = lower(u.email)
  from auth.users u
  where u.id = p.auth_user_id
    and u.email is not null
    and p.email is null;

-- ─────── invites: pending invites to not-yet-joined parents ───────
create table if not exists invites (
  id uuid primary key default uuid_generate_v4(),
  inviter_id uuid not null references parents(id) on delete cascade,
  -- exactly one contact handle is stored, normalized (email lowercased,
  -- phone in E.164). The other is null.
  invitee_email text,
  invitee_phone text,
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  resolved_connection_id uuid references connections(id) on delete set null,
  constraint invites_one_handle check (
    (invitee_email is not null)::int + (invitee_phone is not null)::int = 1
  )
);

-- One pending invite per (inviter, handle) — re-inviting is idempotent.
create unique index if not exists invites_inviter_email_unique
  on invites (inviter_id, lower(invitee_email))
  where invitee_email is not null and status = 'pending';
create unique index if not exists invites_inviter_phone_unique
  on invites (inviter_id, invitee_phone)
  where invitee_phone is not null and status = 'pending';
create index if not exists invites_email_idx
  on invites (lower(invitee_email)) where invitee_email is not null;
create index if not exists invites_phone_idx
  on invites (invitee_phone) where invitee_phone is not null;

alter table invites enable row level security;

-- Inviters manage their own invites. Invitees never read this table directly;
-- resolution happens through resolve_my_invites() at sign-up.
create policy invites_own_only on invites
  for all using (inviter_id = current_parent_id())
  with check (inviter_id = current_parent_id());

-- ─────── send_invite(email, phone) ───────
-- Looks up an existing parent by either handle. If found, opens a pending
-- connection request. If not, records an invite that resolves when they join.
-- Returns: { outcome: 'request_sent' | 'already_connected' | 'invited', ... }
create or replace function public.send_invite(
  target_email text default null,
  target_phone text default null
) returns jsonb
  language plpgsql volatile security definer
  set search_path = public
as $$
declare
  me uuid := current_parent_id();
  norm_email text := nullif(lower(trim(target_email)), '');
  norm_phone text := nullif(trim(target_phone), '');
  target uuid;
  a uuid;
  b uuid;
  existing connections%rowtype;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if norm_email is null and norm_phone is null then
    raise exception 'an email or phone is required';
  end if;

  -- Find an existing parent by either handle.
  select id into target from parents
   where (norm_email is not null and lower(email) = norm_email)
      or (norm_phone is not null and phone_e164 = norm_phone)
   limit 1;

  if target = me then
    raise exception 'you cannot invite yourself';
  end if;

  if target is not null then
    -- They're already on the app → open (or reuse) a connection request.
    a := least(me, target);
    b := greatest(me, target);
    select * into existing from connections where parent_a = a and parent_b = b;

    if found then
      if existing.status = 'connected' then
        return jsonb_build_object('outcome', 'already_connected', 'parent_id', target);
      end if;
      -- They already sent me a pending request — don't clobber it into an
      -- outgoing one; it's already waiting in my inbox to accept.
      if existing.status = 'pending' and existing.initiated_by <> me then
        return jsonb_build_object('outcome', 'request_sent', 'parent_id', target);
      end if;
      -- Otherwise (my own pending, or a prior declined) re-open as pending from me.
      update connections
         set status = 'pending', initiated_by = me, responded_at = null
       where id = existing.id;
      return jsonb_build_object('outcome', 'request_sent', 'parent_id', target);
    end if;

    insert into connections (parent_a, parent_b, status, initiated_by)
    values (a, b, 'pending', me);
    return jsonb_build_object('outcome', 'request_sent', 'parent_id', target);
  end if;

  -- Not on the app yet → store an invite to resolve at their sign-up.
  insert into invites (inviter_id, invitee_email, invitee_phone)
  values (me, norm_email, norm_phone)
  on conflict do nothing;
  return jsonb_build_object('outcome', 'invited');
end;
$$;

-- ─────── get_incoming_requests() ───────
-- Pending connections where I'm the recipient (not the initiator), joined to
-- the inviter's display fields. SECURITY DEFINER so the inviter's parent row
-- is visible even before we're connected.
create or replace function public.get_incoming_requests()
  returns table (
    connection_id uuid,
    parent_id uuid,
    display_name text,
    neighborhood text,
    avatar_color text,
    avatar_initials text,
    created_at timestamptz
  )
  language sql stable security definer
  set search_path = public
as $$
  select c.id, p.id, p.display_name, p.neighborhood,
         p.avatar_color, p.avatar_initials, c.created_at
    from connections c
    join parents p on p.id = c.initiated_by
   where c.status = 'pending'
     and c.initiated_by <> current_parent_id()
     and (c.parent_a = current_parent_id() or c.parent_b = current_parent_id())
   order by c.created_at desc;
$$;

-- ─────── respond_to_request(connection_id, accept) ───────
create or replace function public.respond_to_request(
  connection_id uuid,
  accept boolean
) returns void
  language plpgsql volatile security definer
  set search_path = public
as $$
declare
  me uuid := current_parent_id();
  conn connections%rowtype;
begin
  select * into conn from connections where id = connection_id;
  if not found then
    raise exception 'request not found';
  end if;
  if conn.parent_a <> me and conn.parent_b <> me then
    raise exception 'not your request';
  end if;
  if conn.initiated_by = me then
    raise exception 'cannot respond to your own request';
  end if;
  if conn.status <> 'pending' then
    raise exception 'request already resolved';
  end if;

  update connections
     set status = case when accept then 'connected' else 'declined' end,
         responded_at = now()
   where id = connection_id;
end;
$$;

-- ─────── resolve_my_invites() ───────
-- Called right after a new parent finishes onboarding. Finds invites
-- addressed to their email/phone and turns each into a pending connection
-- (initiated by the original inviter), then marks the invite accepted.
create or replace function public.resolve_my_invites()
  returns int
  language plpgsql volatile security definer
  set search_path = public
as $$
declare
  me uuid := current_parent_id();
  my_email text;
  my_phone text;
  inv record;
  a uuid;
  b uuid;
  conn_id uuid;
  resolved int := 0;
begin
  if me is null then
    return 0;
  end if;
  select lower(email), phone_e164 into my_email, my_phone from parents where id = me;

  for inv in
    select * from invites
     where status = 'pending'
       and (
         (invitee_email is not null and my_email is not null
            and lower(invitee_email) = my_email)
         or (invitee_phone is not null and my_phone is not null
            and invitee_phone = my_phone)
       )
       and inviter_id <> me
  loop
    a := least(me, inv.inviter_id);
    b := greatest(me, inv.inviter_id);

    insert into connections (parent_a, parent_b, status, initiated_by)
    values (a, b, 'pending', inv.inviter_id)
    on conflict (parent_a, parent_b) do update set id = connections.id
    returning id into conn_id;

    update invites
       set status = 'accepted', resolved_connection_id = conn_id
     where id = inv.id;
    resolved := resolved + 1;
  end loop;

  return resolved;
end;
$$;

-- ─────── get_outgoing_requests() ───────
-- Everything I've sent that's still pending, in one list:
--   kind='request' → a parent who's on the app but hasn't responded
--   kind='invite'  → a contact handle for someone who hasn't joined yet
-- SECURITY DEFINER so the recipient parent row is visible while pending.
create or replace function public.get_outgoing_requests()
  returns table (
    kind text,
    id uuid,
    parent_id uuid,
    display_name text,
    neighborhood text,
    avatar_color text,
    avatar_initials text,
    handle text,
    created_at timestamptz
  )
  language sql stable security definer
  set search_path = public
as $$
  select 'request'::text, c.id, p.id, p.display_name, p.neighborhood,
         p.avatar_color, p.avatar_initials, null::text, c.created_at
    from connections c
    join parents p
      on p.id = case when c.parent_a = current_parent_id()
                     then c.parent_b else c.parent_a end
   where c.status = 'pending'
     and c.initiated_by = current_parent_id()
  union all
  select 'invite'::text, i.id, null::uuid, null::text, null::text,
         null::text, null::text,
         coalesce(i.invitee_email, i.invitee_phone), i.created_at
    from invites i
   where i.inviter_id = current_parent_id()
     and i.status = 'pending'
  order by created_at desc;
$$;

-- ─────── cancel_outgoing(kind, id) ───────
-- Withdraw a sent request (mark the pending connection declined) or revoke a
-- pending invite. Only the sender can cancel, and only while still pending.
create or replace function public.cancel_outgoing(
  target_kind text,
  target_id uuid
) returns void
  language plpgsql volatile security definer
  set search_path = public
as $$
declare
  me uuid := current_parent_id();
begin
  if target_kind = 'request' then
    update connections
       set status = 'declined', responded_at = now()
     where id = target_id and initiated_by = me and status = 'pending';
  elsif target_kind = 'invite' then
    update invites
       set status = 'revoked'
     where id = target_id and inviter_id = me and status = 'pending';
  else
    raise exception 'unknown kind: %', target_kind;
  end if;
end;
$$;

-- Allow signed-in users to call these RPCs.
grant execute on function public.send_invite(text, text) to authenticated;
grant execute on function public.get_incoming_requests() to authenticated;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.resolve_my_invites() to authenticated;
grant execute on function public.get_outgoing_requests() to authenticated;
grant execute on function public.cancel_outgoing(text, uuid) to authenticated;
