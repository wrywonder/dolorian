-- Your Village: secure connection transitions, invitations, circles,
-- per-connection privacy, contact consent, reports, audit history, and push tokens.

create extension if not exists pgcrypto;

-- ─────── Private contact details ───────

create table public.parent_private_contacts (
  parent_id uuid primary key references public.parents(id) on delete cascade,
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);

insert into public.parent_private_contacts (parent_id, phone_e164)
select id, phone_e164 from public.parents where phone_e164 is not null
on conflict (parent_id) do update set phone_e164 = excluded.phone_e164;

-- Preserve the legacy column during rollout so the migration is reversible.
-- New app code reads and writes only parent_private_contacts.
-- Keep the retained value out of the public API by replacing broad parent
-- privileges with column-level grants that intentionally omit phone_e164.
revoke select, insert, update on table public.parents from anon, authenticated;
grant select (
  id, auth_user_id, display_name, neighborhood, avatar_color, avatar_initials,
  calendar_connected_at, calendar_provider, created_at, avatar_url, bio,
  profile_background, visibility_mode, profile_background_url
) on table public.parents to authenticated;
grant insert (
  auth_user_id, display_name, neighborhood, avatar_color, avatar_initials,
  calendar_connected_at, calendar_provider, avatar_url, bio,
  profile_background, visibility_mode, profile_background_url
) on table public.parents to authenticated;
grant update (
  display_name, neighborhood, avatar_color, avatar_initials,
  calendar_connected_at, calendar_provider, avatar_url, bio,
  profile_background, visibility_mode, profile_background_url
) on table public.parents to authenticated;

create table public.contact_shares (
  owner_id uuid not null references public.parents(id) on delete cascade,
  recipient_id uuid not null references public.parents(id) on delete cascade,
  phone_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (owner_id, recipient_id),
  constraint contact_shares_distinct check (owner_id <> recipient_id)
);

-- ─────── Directional blocks and connection preferences ───────

create table public.parent_blocks (
  blocker_id uuid not null references public.parents(id) on delete cascade,
  blocked_id uuid not null references public.parents(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint parent_blocks_distinct check (blocker_id <> blocked_id)
);

-- Preserve existing blocks before moving block state out of connections.
insert into public.parent_blocks (blocker_id, blocked_id, created_at)
select initiated_by,
  case when initiated_by = parent_a then parent_b else parent_a end,
  coalesce(responded_at, created_at)
from public.connections
where status = 'blocked'
  and initiated_by in (parent_a, parent_b)
on conflict do nothing;

-- Preserve legacy blocked rows during rollout. Security helpers consult
-- parent_blocks first, so retained rows cannot restore access or visibility.

create table public.connection_preferences (
  owner_id uuid not null references public.parents(id) on delete cascade,
  other_id uuid not null references public.parents(id) on delete cascade,
  favorite boolean not null default false,
  muted boolean not null default false,
  location_visible boolean not null default true,
  note text check (note is null or char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (owner_id, other_id),
  constraint connection_preferences_distinct check (owner_id <> other_id)
);

-- ─────── Circles ───────

create table public.connection_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.parents(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  emoji text not null default '✨' check (char_length(emoji) between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_circles_unique_name unique (owner_id, name)
);

create table public.connection_circle_members (
  circle_id uuid not null references public.connection_circles(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (circle_id, parent_id)
);

-- ─────── Expiring invitations ───────

create table public.connection_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.parents(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses int not null default 10 check (max_uses between 1 and 50),
  use_count int not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index connection_invites_inviter_idx
  on public.connection_invites (inviter_id, created_at desc);

create table public.connection_invite_uses (
  invite_id uuid not null references public.connection_invites(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (invite_id, parent_id)
);

-- ─────── Safety, audit, and notifications ───────

create table public.connection_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.parents(id) on delete cascade,
  reported_id uuid not null references public.parents(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'impersonation', 'privacy', 'unsafe_behavior', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint connection_reports_distinct check (reporter_id <> reported_id)
);

create index connection_reports_status_idx
  on public.connection_reports (status, created_at desc);

create table public.connection_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.parents(id) on delete cascade,
  subject_id uuid references public.parents(id) on delete set null,
  action text not null check (action in (
    'request_sent', 'request_accepted', 'request_declined', 'request_cancelled',
    'connection_removed', 'parent_blocked', 'parent_unblocked',
    'invite_created', 'invite_redeemed', 'invite_revoked',
    'report_submitted', 'phone_shared', 'phone_unshared'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index connection_audit_actor_idx
  on public.connection_audit_log (actor_id, created_at desc);

create table public.parent_push_tokens (
  token text primary key,
  parent_id uuid not null references public.parents(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  device_id text,
  updated_at timestamptz not null default now()
);

create index parent_push_tokens_parent_idx on public.parent_push_tokens (parent_id);

create table public.parent_notification_preferences (
  parent_id uuid primary key references public.parents(id) on delete cascade,
  connection_requests boolean not null default true,
  connection_acceptances boolean not null default true,
  invite_redemptions boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.connection_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.parents(id) on delete cascade,
  actor_id uuid references public.parents(id) on delete set null,
  notification_type text not null check (notification_type in (
    'connection_request', 'connection_accepted', 'invite_redeemed'
  )),
  title text not null,
  body text not null,
  url text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index connection_notifications_recipient_idx
  on public.connection_notifications (recipient_id, created_at desc);

-- ─────── Relationship helpers ───────

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select exists (
      select 1 from public.parent_blocks
      where (blocker_id = a and blocked_id = b)
         or (blocker_id = b and blocked_id = a)
    );
  $$;

create or replace function public.are_connected(a uuid, b uuid) returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select not public.is_blocked_between(a, b) and exists (
      select 1 from public.connections
      where parent_a = least(a, b)
        and parent_b = greatest(a, b)
        and status = 'connected'
    );
  $$;

create or replace function public.has_connection_edge(a uuid, b uuid) returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select not public.is_blocked_between(a, b) and exists (
      select 1 from public.connections
      where parent_a = least(a, b)
        and parent_b = greatest(a, b)
        and status in ('pending', 'connected')
    );
  $$;

create or replace function public.can_see_location_from(owner uuid, viewer uuid) returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select public.are_connected(owner, viewer)
      and coalesce((
        select location_visible
        from public.connection_preferences
        where owner_id = owner and other_id = viewer
      ), true);
  $$;

-- ─────── Harden direct table policies ───────

drop policy if exists connections_insert_initiated_by_me on public.connections;
drop policy if exists connections_update_either_party on public.connections;
drop policy if exists connections_delete_either_party on public.connections;

drop policy if exists parents_select_self_or_connected on public.parents;
create policy parents_select_self_or_connected on public.parents
  for select using (
    id = public.current_parent_id()
    or public.are_connected(id, public.current_parent_id())
    or public.has_connection_edge(id, public.current_parent_id())
  );

drop policy if exists locations_select_self_or_visible_connections on public.parent_locations;
create policy locations_select_self_or_visible_connections on public.parent_locations
  for select using (
    parent_id = public.current_parent_id()
    or (
      (visible or (auto_share_at is not null and auto_share_at <= now()))
      and expires_at is not null
      and expires_at > now()
      and public.can_see_location_from(parent_id, public.current_parent_id())
    )
  );

alter table public.parent_private_contacts enable row level security;
alter table public.contact_shares enable row level security;
alter table public.parent_blocks enable row level security;
alter table public.connection_preferences enable row level security;
alter table public.connection_circles enable row level security;
alter table public.connection_circle_members enable row level security;
alter table public.connection_invites enable row level security;
alter table public.connection_invite_uses enable row level security;
alter table public.connection_reports enable row level security;
alter table public.connection_audit_log enable row level security;
alter table public.parent_push_tokens enable row level security;
alter table public.parent_notification_preferences enable row level security;
alter table public.connection_notifications enable row level security;

create policy private_contacts_own on public.parent_private_contacts
  for select using (parent_id = public.current_parent_id());

create policy contact_shares_owner_select on public.contact_shares
  for select using (owner_id = public.current_parent_id());

create policy blocks_owner_select on public.parent_blocks
  for select using (blocker_id = public.current_parent_id());

create policy preferences_own_all on public.connection_preferences
  for all using (owner_id = public.current_parent_id())
  with check (owner_id = public.current_parent_id());

create policy circles_own_all on public.connection_circles
  for all using (owner_id = public.current_parent_id())
  with check (owner_id = public.current_parent_id());

create policy circle_members_own_all on public.connection_circle_members
  for all using (
    exists (
      select 1 from public.connection_circles c
      where c.id = circle_id and c.owner_id = public.current_parent_id()
    )
  )
  with check (
    exists (
      select 1 from public.connection_circles c
      where c.id = circle_id and c.owner_id = public.current_parent_id()
    )
  );

create policy invites_owner_select on public.connection_invites
  for select using (inviter_id = public.current_parent_id());

create policy invite_uses_participant_select on public.connection_invite_uses
  for select using (
    parent_id = public.current_parent_id()
    or exists (
      select 1 from public.connection_invites i
      where i.id = invite_id and i.inviter_id = public.current_parent_id()
    )
  );

create policy reports_reporter_select on public.connection_reports
  for select using (reporter_id = public.current_parent_id());

create policy audit_actor_select on public.connection_audit_log
  for select using (actor_id = public.current_parent_id());

create policy push_tokens_own_select on public.parent_push_tokens
  for select using (parent_id = public.current_parent_id());

create policy notification_preferences_own_all on public.parent_notification_preferences
  for all using (parent_id = public.current_parent_id())
  with check (parent_id = public.current_parent_id());

create policy connection_notifications_recipient on public.connection_notifications
  for select using (recipient_id = public.current_parent_id());

create policy connection_notifications_mark_read on public.connection_notifications
  for update using (recipient_id = public.current_parent_id())
  with check (recipient_id = public.current_parent_id());

-- ─────── Internal audit helper ───────

create or replace function public.write_connection_audit(
  p_actor uuid,
  p_subject uuid,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
) returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  begin
    insert into public.connection_audit_log (actor_id, subject_id, action, metadata)
    values (p_actor, p_subject, p_action, coalesce(p_metadata, '{}'::jsonb));
  end;
  $$;

create or replace function public.write_connection_notification(
  p_recipient uuid,
  p_actor uuid,
  p_type text
) returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    actor_first_name text;
    pref public.parent_notification_preferences;
  begin
    select split_part(display_name, ' ', 1) into actor_first_name
    from public.parents where id = p_actor;
    select * into pref from public.parent_notification_preferences where parent_id = p_recipient;

    if p_type = 'connection_request' and coalesce(pref.connection_requests, true) then
      insert into public.connection_notifications
        (recipient_id, actor_id, notification_type, title, body, url)
      values
        (p_recipient, p_actor, p_type, 'A new hello 👋', actor_first_name || ' would like to join your village.', '/village?tab=requests');
    elsif p_type = 'connection_accepted' and coalesce(pref.connection_acceptances, true) then
      insert into public.connection_notifications
        (recipient_id, actor_id, notification_type, title, body, url)
      values
        (p_recipient, p_actor, p_type, 'Your village grew ✨', actor_first_name || ' accepted your connection.', '/profile/' || p_actor::text);
    elsif p_type = 'invite_redeemed' and coalesce(pref.invite_redemptions, true) then
      insert into public.connection_notifications
        (recipient_id, actor_id, notification_type, title, body, url)
      values
        (p_recipient, p_actor, p_type, 'Your invite found a friend ✨', actor_first_name || ' joined your village.', '/profile/' || p_actor::text);
    end if;
  end;
  $$;

-- ─────── Guarded connection state machine ───────

create or replace function public.request_connection(other uuid)
returns public.connections
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    a uuid;
    b uuid;
    edge public.connections;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if other is null or other = me then raise exception 'Choose another parent'; end if;
    if not exists (select 1 from public.parents where id = other) then raise exception 'Parent not found'; end if;
    if public.is_blocked_between(me, other) then raise exception 'This connection is unavailable'; end if;

    if (
      select count(*) from public.connection_audit_log
      where actor_id = me and action = 'request_sent' and created_at > now() - interval '1 hour'
    ) >= 10 then
      raise exception 'You have sent several requests recently. Try again later.';
    end if;

    a := least(me, other);
    b := greatest(me, other);
    select * into edge from public.connections
      where parent_a = a and parent_b = b
      for update;

    if edge.id is null then
      insert into public.connections (parent_a, parent_b, status, initiated_by)
      values (a, b, 'pending', me)
      returning * into edge;
    elsif edge.status = 'connected' then
      return edge;
    elsif edge.status = 'pending' then
      if edge.initiated_by <> me then
        raise exception 'This parent already sent you a request';
      end if;
      return edge;
    elsif edge.status = 'declined' then
      if edge.initiated_by = me
        and coalesce(edge.responded_at, edge.created_at) > now() - interval '72 hours' then
        raise exception 'Give them a little time before asking again';
      end if;
      update public.connections set
        status = 'pending', initiated_by = me, created_at = now(), responded_at = null
      where id = edge.id returning * into edge;
    else
      raise exception 'This connection is unavailable';
    end if;

    perform public.write_connection_audit(me, other, 'request_sent');
    perform public.write_connection_notification(other, me, 'connection_request');
    return edge;
  end;
  $$;

create or replace function public.respond_connection(other uuid, accept boolean)
returns public.connections
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    edge public.connections;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if public.is_blocked_between(me, other) then raise exception 'This connection is unavailable'; end if;

    select * into edge from public.connections
    where parent_a = least(me, other)
      and parent_b = greatest(me, other)
      and status = 'pending'
      and initiated_by = other
    for update;

    if edge.id is null then raise exception 'No incoming request found'; end if;

    update public.connections
    set status = case when accept then 'connected' else 'declined' end,
        responded_at = now()
    where id = edge.id
    returning * into edge;

    perform public.write_connection_audit(
      me, other,
      case when accept then 'request_accepted' else 'request_declined' end
    );
    if accept then
      perform public.write_connection_notification(other, me, 'connection_accepted');
    end if;
    return edge;
  end;
  $$;

create or replace function public.cancel_connection_request(other uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    deleted_count int;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    delete from public.connections
    where parent_a = least(me, other)
      and parent_b = greatest(me, other)
      and status = 'pending'
      and initiated_by = me;
    get diagnostics deleted_count = row_count;
    if deleted_count = 0 then raise exception 'No sent request found'; end if;
    perform public.write_connection_audit(me, other, 'request_cancelled');
  end;
  $$;

create or replace function public.remove_connection(other uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    deleted_count int;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    delete from public.connections
    where parent_a = least(me, other)
      and parent_b = greatest(me, other)
      and status = 'connected';
    get diagnostics deleted_count = row_count;
    if deleted_count = 0 then raise exception 'Connection not found'; end if;

    delete from public.contact_shares
      where (owner_id = me and recipient_id = other) or (owner_id = other and recipient_id = me);
    delete from public.connection_preferences
      where (owner_id = me and other_id = other) or (owner_id = other and other_id = me);
    delete from public.connection_circle_members m using public.connection_circles c
      where m.circle_id = c.id and m.parent_id in (me, other)
        and c.owner_id in (me, other);
    perform public.write_connection_audit(me, other, 'connection_removed');
  end;
  $$;

create or replace function public.block_parent(other uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if other is null or other = me then raise exception 'Choose another parent'; end if;

    insert into public.parent_blocks (blocker_id, blocked_id)
    values (me, other) on conflict do nothing;
    delete from public.connections
      where parent_a = least(me, other) and parent_b = greatest(me, other);
    delete from public.contact_shares
      where (owner_id = me and recipient_id = other) or (owner_id = other and recipient_id = me);
    delete from public.connection_preferences
      where (owner_id = me and other_id = other) or (owner_id = other and other_id = me);
    delete from public.connection_circle_members m using public.connection_circles c
      where m.circle_id = c.id and m.parent_id in (me, other)
        and c.owner_id in (me, other);
    perform public.write_connection_audit(me, other, 'parent_blocked');
  end;
  $$;

create or replace function public.unblock_parent(other uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    deleted_count int;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    delete from public.parent_blocks where blocker_id = me and blocked_id = other;
    get diagnostics deleted_count = row_count;
    if deleted_count = 0 then raise exception 'Blocked parent not found'; end if;
    perform public.write_connection_audit(me, other, 'parent_unblocked');
  end;
  $$;

-- ─────── Invites and suggestions ───────

create or replace function public.create_connection_invite(p_max_uses int default 10)
returns public.connection_invites
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    result public.connection_invites;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if p_max_uses < 1 or p_max_uses > 50 then raise exception 'Invalid invite limit'; end if;
    if (
      select count(*) from public.connection_invites
      where inviter_id = me and revoked_at is null and expires_at > now()
    ) >= 5 then raise exception 'Revoke an active invite before creating another'; end if;

    insert into public.connection_invites (inviter_id, max_uses)
    values (me, p_max_uses) returning * into result;
    perform public.write_connection_audit(me, null, 'invite_created', jsonb_build_object('invite_id', result.id));
    return result;
  end;
  $$;

create or replace function public.revoke_connection_invite(invite_id uuid)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    changed int;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    update public.connection_invites set revoked_at = now()
    where id = invite_id and inviter_id = me and revoked_at is null;
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'Active invite not found'; end if;
    perform public.write_connection_audit(me, null, 'invite_revoked', jsonb_build_object('invite_id', invite_id));
  end;
  $$;

create or replace function public.preview_connection_invite(p_reference text)
returns jsonb
  language plpgsql stable security definer
  set search_path = public, pg_temp
  as $$
  declare
    invite public.connection_invites;
    inviter public.parents;
  begin
    select * into invite from public.connection_invites
    where token::text = btrim(p_reference) or code = upper(btrim(p_reference))
    limit 1;
    if invite.id is null then return jsonb_build_object('found', false); end if;
    select * into inviter from public.parents where id = invite.inviter_id;
    return jsonb_build_object(
      'found', true,
      'active', invite.revoked_at is null and invite.expires_at > now() and invite.use_count < invite.max_uses,
      'token', invite.token,
      'code', invite.code,
      'expires_at', invite.expires_at,
      'inviter', jsonb_build_object(
        'id', inviter.id,
        'display_name', inviter.display_name,
        'neighborhood', inviter.neighborhood,
        'avatar_color', inviter.avatar_color,
        'avatar_initials', inviter.avatar_initials,
        'avatar_url', inviter.avatar_url
      )
    );
  end;
  $$;

create or replace function public.redeem_connection_invite(p_reference text)
returns public.connections
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    invite public.connection_invites;
    edge public.connections;
  begin
    if me is null then raise exception 'Sign in before accepting this invite'; end if;
    select * into invite from public.connection_invites
    where token::text = btrim(p_reference) or code = upper(btrim(p_reference))
    for update;
    if invite.id is null then raise exception 'Invite not found'; end if;
    if invite.inviter_id = me then raise exception 'This is your own invite'; end if;
    if invite.revoked_at is not null or invite.expires_at <= now() or invite.use_count >= invite.max_uses then
      raise exception 'This invite is no longer active';
    end if;
    if public.is_blocked_between(me, invite.inviter_id) then raise exception 'This connection is unavailable'; end if;

    select * into edge from public.connections
    where parent_a = least(me, invite.inviter_id)
      and parent_b = greatest(me, invite.inviter_id)
    for update;
    if edge.id is null then
      insert into public.connections (parent_a, parent_b, status, initiated_by, responded_at)
      values (least(me, invite.inviter_id), greatest(me, invite.inviter_id), 'connected', invite.inviter_id, now())
      returning * into edge;
    else
      update public.connections set status = 'connected', responded_at = now()
      where id = edge.id returning * into edge;
    end if;

    insert into public.connection_invite_uses (invite_id, parent_id)
    values (invite.id, me) on conflict do nothing;
    if found then
      update public.connection_invites set use_count = use_count + 1 where id = invite.id;
    end if;
    perform public.write_connection_audit(me, invite.inviter_id, 'invite_redeemed', jsonb_build_object('invite_id', invite.id));
    perform public.write_connection_notification(invite.inviter_id, me, 'invite_redeemed');
    return edge;
  end;
  $$;

create or replace function public.suggested_connections(p_limit int default 8)
returns table (
  id uuid,
  display_name text,
  neighborhood text,
  avatar_color text,
  avatar_initials text,
  avatar_url text,
  mutual_count int
)
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    with me_edges as (
      select case when c.parent_a = public.current_parent_id() then c.parent_b else c.parent_a end as friend_id
      from public.connections c
      where c.status = 'connected'
        and public.current_parent_id() in (c.parent_a, c.parent_b)
    ), candidates as (
      select case when c.parent_a = m.friend_id then c.parent_b else c.parent_a end as candidate_id,
             count(*)::int as mutual_count
      from me_edges m
      join public.connections c on m.friend_id in (c.parent_a, c.parent_b) and c.status = 'connected'
      where public.current_parent_id() not in (c.parent_a, c.parent_b)
      group by 1
    )
    select p.id, p.display_name, p.neighborhood, p.avatar_color, p.avatar_initials, p.avatar_url, c.mutual_count
    from candidates c
    join public.parents p on p.id = c.candidate_id
    where not public.is_blocked_between(public.current_parent_id(), p.id)
      and not exists (
        select 1 from public.connections existing
        where existing.parent_a = least(public.current_parent_id(), p.id)
          and existing.parent_b = greatest(public.current_parent_id(), p.id)
          and existing.status in ('pending', 'connected')
      )
    order by c.mutual_count desc, p.display_name
    limit greatest(0, least(coalesce(p_limit, 8), 20));
  $$;

create or replace function public.blocked_parents()
returns table (
  id uuid,
  display_name text,
  neighborhood text,
  avatar_color text,
  avatar_initials text,
  avatar_url text,
  blocked_at timestamptz
)
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select p.id, p.display_name, p.neighborhood, p.avatar_color, p.avatar_initials, p.avatar_url, b.created_at
    from public.parent_blocks b
    join public.parents p on p.id = b.blocked_id
    where b.blocker_id = public.current_parent_id()
    order by b.created_at desc;
  $$;

-- ─────── Preferences, circles, contact consent, and reports ───────

create or replace function public.set_connection_preferences(
  other uuid,
  p_favorite boolean,
  p_muted boolean,
  p_location_visible boolean,
  p_note text
) returns public.connection_preferences
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    result public.connection_preferences;
  begin
    if not public.are_connected(me, other) then raise exception 'Connection not found'; end if;
    insert into public.connection_preferences (owner_id, other_id, favorite, muted, location_visible, note, updated_at)
    values (me, other, p_favorite, p_muted, p_location_visible, nullif(btrim(p_note), ''), now())
    on conflict (owner_id, other_id) do update set
      favorite = excluded.favorite,
      muted = excluded.muted,
      location_visible = excluded.location_visible,
      note = excluded.note,
      updated_at = now()
    returning * into result;
    return result;
  end;
  $$;

create or replace function public.set_circle_members(p_circle uuid, p_members uuid[])
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
  begin
    if not exists (select 1 from public.connection_circles where id = p_circle and owner_id = me) then
      raise exception 'Circle not found';
    end if;
    if exists (
      select 1 from unnest(coalesce(p_members, '{}'::uuid[])) member
      where not public.are_connected(me, member)
    ) then raise exception 'Circles can contain only current connections'; end if;
    delete from public.connection_circle_members where circle_id = p_circle;
    insert into public.connection_circle_members (circle_id, parent_id)
    select p_circle, member from unnest(coalesce(p_members, '{}'::uuid[])) member
    on conflict do nothing;
  end;
  $$;

create or replace function public.get_my_phone()
returns text
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select phone_e164 from public.parent_private_contacts
    where parent_id = public.current_parent_id();
  $$;

create or replace function public.set_my_phone(p_phone text)
returns text
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    cleaned text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if cleaned is not null and cleaned !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'Use an international phone number beginning with +';
    end if;
    insert into public.parent_private_contacts (parent_id, phone_e164, updated_at)
    values (me, cleaned, now())
    on conflict (parent_id) do update set phone_e164 = excluded.phone_e164, updated_at = now();
    if cleaned is null then delete from public.contact_shares where owner_id = me; end if;
    return cleaned;
  end;
  $$;

create or replace function public.get_contact_exchange(other uuid)
returns jsonb
  language plpgsql stable security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    my_phone text;
    their_phone text;
    i_share boolean;
    they_share boolean;
  begin
    if not public.are_connected(me, other) then
      return jsonb_build_object('connected', false);
    end if;
    select phone_e164 into my_phone from public.parent_private_contacts where parent_id = me;
    select exists(select 1 from public.contact_shares where owner_id = me and recipient_id = other and phone_visible) into i_share;
    select exists(select 1 from public.contact_shares where owner_id = other and recipient_id = me and phone_visible) into they_share;
    if they_share then
      select phone_e164 into their_phone from public.parent_private_contacts where parent_id = other;
    end if;
    return jsonb_build_object(
      'connected', true,
      'my_phone_set', my_phone is not null,
      'i_share', i_share,
      'they_share', they_share,
      'their_phone', their_phone
    );
  end;
  $$;

create or replace function public.set_contact_share(other uuid, enabled boolean)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
  begin
    if not public.are_connected(me, other) then raise exception 'Connection not found'; end if;
    if enabled then
      if not exists (select 1 from public.parent_private_contacts where parent_id = me and phone_e164 is not null) then
        raise exception 'Add your phone number in profile settings first';
      end if;
      insert into public.contact_shares (owner_id, recipient_id, phone_visible, updated_at)
      values (me, other, true, now())
      on conflict (owner_id, recipient_id) do update set phone_visible = true, updated_at = now();
      perform public.write_connection_audit(me, other, 'phone_shared');
    else
      delete from public.contact_shares where owner_id = me and recipient_id = other;
      perform public.write_connection_audit(me, other, 'phone_unshared');
    end if;
  end;
  $$;

create or replace function public.submit_parent_report(other uuid, p_reason text, p_details text default null)
returns uuid
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    report_id uuid;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if p_reason not in ('spam', 'harassment', 'impersonation', 'privacy', 'unsafe_behavior', 'other') then
      raise exception 'Choose a report reason';
    end if;
    if (select count(*) from public.connection_reports where reporter_id = me and created_at > now() - interval '1 day') >= 5 then
      raise exception 'You have submitted several reports today';
    end if;
    insert into public.connection_reports (reporter_id, reported_id, reason, details)
    values (me, other, p_reason, nullif(btrim(p_details), '')) returning id into report_id;
    perform public.write_connection_audit(me, other, 'report_submitted', jsonb_build_object('report_id', report_id));
    return report_id;
  end;
  $$;

create or replace function public.register_push_token(p_token text, p_platform text, p_device_id text default null)
returns void
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if p_platform not in ('ios', 'android') then raise exception 'Invalid platform'; end if;
    insert into public.parent_push_tokens (token, parent_id, platform, device_id, updated_at)
    values (p_token, me, p_platform, p_device_id, now())
    on conflict (token) do update set parent_id = me, platform = excluded.platform,
      device_id = excluded.device_id, updated_at = now();
    insert into public.parent_notification_preferences (parent_id)
    values (me) on conflict do nothing;
  end;
  $$;

-- Admin/service-role review surface; never exposed to regular clients.
create or replace view public.admin_connection_reports
with (security_invoker = true)
as
select r.*, reporter.display_name as reporter_name, reported.display_name as reported_name
from public.connection_reports r
join public.parents reporter on reporter.id = r.reporter_id
join public.parents reported on reported.id = r.reported_id;

revoke all on public.admin_connection_reports from anon, authenticated;
grant select on public.admin_connection_reports to service_role;

-- Direct access is intentionally narrow; mutations with relationship impact
-- go through the security-definer functions above.
grant select on public.parent_private_contacts, public.contact_shares, public.parent_blocks,
  public.connection_preferences, public.connection_invites, public.connection_invite_uses,
  public.connection_reports, public.connection_audit_log, public.parent_push_tokens
to authenticated;
grant select, insert, update, delete on public.connection_circles,
  public.connection_circle_members, public.parent_notification_preferences
to authenticated;
grant select, update on public.connection_notifications to authenticated;

revoke execute on function public.write_connection_audit(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.write_connection_notification(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.request_connection(uuid),
  public.respond_connection(uuid, boolean),
  public.cancel_connection_request(uuid),
  public.remove_connection(uuid),
  public.block_parent(uuid),
  public.unblock_parent(uuid),
  public.create_connection_invite(int),
  public.revoke_connection_invite(uuid),
  public.redeem_connection_invite(text),
  public.suggested_connections(int),
  public.blocked_parents(),
  public.set_connection_preferences(uuid, boolean, boolean, boolean, text),
  public.set_circle_members(uuid, uuid[]),
  public.get_my_phone(),
  public.set_my_phone(text),
  public.get_contact_exchange(uuid),
  public.set_contact_share(uuid, boolean),
  public.submit_parent_report(uuid, text, text),
  public.register_push_token(text, text, text)
to authenticated;

grant execute on function public.preview_connection_invite(text) to anon, authenticated;
