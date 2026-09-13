-- A creator's share link is a bounded, revocable connection invitation tied to
-- one plan. The token, not an editable URL parameter, determines the destination.
alter table public.connection_invites
  add column plan_id uuid references public.activities(id) on delete cascade;
create index connection_invites_plan_idx on public.connection_invites (plan_id)
  where plan_id is not null;

create or replace function public.get_or_create_plan_invite(p_plan uuid)
returns public.connection_invites
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := public.current_parent_id();
  plan public.activities;
  result public.connection_invites;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  select * into plan from public.activities where id = p_plan for update;
  if plan.id is null or plan.created_by is distinct from me then
    raise exception 'Only the person who shared this plan can invite more friends';
  end if;
  if not plan.published or plan.cancelled_at is not null then
    raise exception 'This plan is no longer available';
  end if;
  select * into result from public.connection_invites
  where plan_id = p_plan and inviter_id = me and revoked_at is null
    and expires_at > now() and use_count < max_uses
  order by created_at desc limit 1 for update;
  if result.id is null then
    insert into public.connection_invites (inviter_id, plan_id, expires_at, max_uses)
    values (me, p_plan, now() + interval '30 days', 10) returning * into result;
    perform public.write_connection_audit(me, null, 'invite_created',
      jsonb_build_object('invite_id', result.id, 'plan_id', p_plan));
  end if;
  return result;
end;
$$;

-- A privacy change or removing an invited person invalidates earlier links.
-- Otherwise a removed guest could re-add themselves with the old bearer token.
create function public.revoke_plan_share_links_on_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if TG_TABLE_NAME = 'plan_invites' then
    update public.connection_invites set revoked_at = now()
      where plan_id = old.plan_id and revoked_at is null;
    return old;
  end if;
  if new.visibility is distinct from old.visibility
    or new.published is distinct from old.published
    or new.created_by is distinct from old.created_by
    or new.cancelled_at is distinct from old.cancelled_at then
    update public.connection_invites set revoked_at = now()
      where plan_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;
create trigger plan_share_links_privacy_changed after update on public.activities
  for each row execute function public.revoke_plan_share_links_on_change();
create trigger plan_share_links_guest_removed after delete on public.plan_invites
  for each row execute function public.revoke_plan_share_links_on_change();

create or replace function public.get_or_create_connection_invite()
returns public.connection_invites
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    result public.connection_invites;
  begin
    if me is null then raise exception 'Not authenticated'; end if;

    select * into result
    from public.connection_invites
    where inviter_id = me
      and plan_id is null
      and revoked_at is null
      and expires_at > now()
      and use_count < max_uses
    order by expires_at desc, created_at desc
    limit 1
    for update;

    if result.id is null then
      insert into public.connection_invites (inviter_id, expires_at, max_uses)
      values (me, now() + interval '30 days', 10)
      returning * into result;
      perform public.write_connection_audit(
        me,
        null,
        'invite_created',
        jsonb_build_object('invite_id', result.id, 'source', 'share_link')
      );
    end if;

    return result;
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
    plan public.activities;
    viewer uuid := public.current_parent_id();
  begin
    select * into invite from public.connection_invites
    where token::text = btrim(p_reference) or code = upper(btrim(p_reference))
    limit 1;
    if invite.id is null then return jsonb_build_object('found', false); end if;
    if viewer is not null and public.is_blocked_between(viewer, invite.inviter_id) then
      return jsonb_build_object('found', false);
    end if;
    if invite.plan_id is not null then
      select * into plan from public.activities where id = invite.plan_id;
      if plan.id is null or plan.created_by is distinct from invite.inviter_id
        or not plan.published then return jsonb_build_object('found', false); end if;
    end if;
    select * into inviter from public.parents where id = invite.inviter_id;
    return jsonb_build_object(
      'found', true,
      'active', invite.revoked_at is null and invite.expires_at > now()
        and invite.use_count < invite.max_uses and plan.cancelled_at is null,
      'needs_profile', auth.uid() is not null and viewer is null,
      -- No name, place, dates, or family details are revealed before RLS allows them.
      'plan', case when plan.id is null then null else jsonb_build_object(
        'id', plan.id,
        'can_view', viewer is not null and public.can_view_plan(plan.id)
      ) end,
      'already_connected', viewer is not null and public.are_connected(viewer, invite.inviter_id),
      'is_self', viewer = invite.inviter_id,
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
    plan public.activities;
    was_connected boolean;
  begin
    if me is null then raise exception 'Sign in before accepting this invite'; end if;
    -- Match the creator/edit lock order: plan first, then its invitation.
    select * into invite from public.connection_invites
    where token::text = btrim(p_reference) or code = upper(btrim(p_reference));
    if invite.plan_id is not null then
      select * into plan from public.activities where id = invite.plan_id for update;
      if plan.id is null or plan.created_by is distinct from invite.inviter_id
        or not plan.published or plan.cancelled_at is not null then
        raise exception 'This plan is no longer available';
      end if;
    end if;
    select * into invite from public.connection_invites
    where token::text = btrim(p_reference) or code = upper(btrim(p_reference))
    for update;
    if invite.id is null then raise exception 'Invite not found'; end if;
    if invite.inviter_id = me then raise exception 'This is your own invite'; end if;
    if invite.revoked_at is not null or invite.expires_at <= now() or invite.use_count >= invite.max_uses then
      raise exception 'This invite is no longer active';
    end if;
    if public.is_blocked_between(me, invite.inviter_id) then raise exception 'This connection is unavailable'; end if;

    was_connected := public.are_connected(me, invite.inviter_id);
    -- Different valid links can be accepted at the same time for the same pair.
    insert into public.connections (parent_a, parent_b, status, initiated_by, responded_at)
    values (least(me, invite.inviter_id), greatest(me, invite.inviter_id), 'connected', invite.inviter_id, now())
    on conflict (parent_a, parent_b) do update set status = 'connected', responded_at = now()
    returning * into edge;

    if plan.visibility = 'invited' then
      insert into public.plan_invites (plan_id, invited_parent_id, invited_by)
      values (plan.id, me, invite.inviter_id) on conflict do nothing;
    end if;

    insert into public.connection_invite_uses (invite_id, parent_id)
    values (invite.id, me) on conflict do nothing;
    if found then
      update public.connection_invites set use_count = use_count + 1 where id = invite.id;
    end if;
    perform public.write_connection_audit(me, invite.inviter_id, 'invite_redeemed', jsonb_build_object('invite_id', invite.id));
    if not was_connected then
      perform public.write_connection_notification(invite.inviter_id, me, 'invite_redeemed');
    end if;
    return edge;
  end;
  $$;

revoke all on function public.get_or_create_plan_invite(uuid),
  public.get_or_create_connection_invite(), public.redeem_connection_invite(text),
  public.revoke_connection_invite(uuid),
  public.revoke_plan_share_links_on_change() from public, anon;
grant execute on function public.get_or_create_plan_invite(uuid) to authenticated;
