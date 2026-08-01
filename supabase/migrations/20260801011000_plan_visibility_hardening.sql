-- Bind visibility checks to the authenticated parent. Callers cannot probe
-- another parent's invitations or connection-scoped plan access.

create or replace function public.can_view_plan(p_plan uuid)
returns boolean
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select public.current_parent_id() is not null and exists (
      select 1
      from public.activities a
      where a.id = p_plan
        and (
          a.created_by = public.current_parent_id()
          or (
            a.published
            and (
              a.created_by is null
              or a.visibility = 'public'
              or (
                a.visibility = 'connections'
                and public.are_connected(a.created_by, public.current_parent_id())
              )
              or (
                a.visibility = 'invited'
                and exists (
                  select 1 from public.plan_invites pi
                  where pi.plan_id = a.id
                    and pi.invited_parent_id = public.current_parent_id()
                )
              )
            )
            and (
              a.created_by is null
              or not public.is_blocked_between(a.created_by, public.current_parent_id())
            )
          )
        )
    );
  $$;

drop policy if exists activities_select_visible_plans on public.activities;
create policy activities_select_visible_plans on public.activities
  for select using (public.can_view_plan(id));

drop policy if exists activity_interactions_visible_plan on public.activity_interactions;
create policy activity_interactions_visible_plan on public.activity_interactions
  for select using (
    parent_id = public.current_parent_id()
    or public.can_view_plan(activity_id)
  );

drop policy if exists activity_interactions_write_own_visible on public.activity_interactions;
create policy activity_interactions_write_own_visible on public.activity_interactions
  for all using (
    parent_id = public.current_parent_id()
    and public.can_view_plan(activity_id)
  )
  with check (
    parent_id = public.current_parent_id()
    and public.can_view_plan(activity_id)
  );

create or replace function public.plan_participants(p_plan_ids uuid[])
returns table (
  plan_id uuid,
  parent_id uuid,
  display_name text,
  neighborhood text,
  avatar_color text,
  avatar_initials text,
  avatar_url text,
  profile_visible boolean,
  state text,
  state_changed_at timestamptz
)
  language sql stable security definer
  set search_path = public, pg_temp
  as $$
    select
      ai.activity_id,
      p.id,
      p.display_name,
      p.neighborhood,
      p.avatar_color,
      p.avatar_initials,
      p.avatar_url,
      (p.id = public.current_parent_id() or public.has_connection_edge(p.id, public.current_parent_id())),
      ai.state,
      ai.state_changed_at
    from public.activity_interactions ai
    join public.parents p on p.id = ai.parent_id
    where ai.activity_id = any(coalesce(p_plan_ids, '{}'::uuid[]))
      and ai.state in ('interested', 'going', 'attended', 'out')
      and public.can_view_plan(ai.activity_id)
      and (
        p.id = public.current_parent_id()
        or not public.is_blocked_between(p.id, public.current_parent_id())
      );
  $$;

create or replace function public.set_plan_rsvp(p_plan uuid, p_state text)
returns public.activity_interactions
  language plpgsql security definer
  set search_path = public, pg_temp
  as $$
  declare
    me uuid := public.current_parent_id();
    result public.activity_interactions;
  begin
    if me is null then raise exception 'Not authenticated'; end if;
    if p_state not in ('interested', 'going', 'out') then raise exception 'Choose a valid RSVP'; end if;
    if not public.can_view_plan(p_plan) then raise exception 'Plan not found'; end if;
    if exists (select 1 from public.activities where id = p_plan and cancelled_at is not null) then
      raise exception 'This plan was cancelled';
    end if;
    insert into public.activity_interactions (
      parent_id, activity_id, state, state_changed_at, created_at
    ) values (me, p_plan, p_state, now(), now())
    on conflict (parent_id, activity_id) do update set
      state = excluded.state,
      state_changed_at = excluded.state_changed_at
    returning * into result;
    return result;
  end;
  $$;

drop function if exists public.can_view_plan(uuid, uuid);
revoke all on function public.can_view_plan(uuid) from public, anon;
grant execute on function public.can_view_plan(uuid) to authenticated;

