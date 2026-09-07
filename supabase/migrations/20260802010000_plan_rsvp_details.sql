-- Canonical plan facts stay on activities. Family-specific attendance details
-- (for example, "Leo · weeks 2, 4, and 6") live on that family's RSVP.

alter table public.activity_interactions
  add column rsvp_note text
  check (rsvp_note is null or char_length(rsvp_note) <= 500);

drop function if exists public.plan_participants(uuid[]);
create function public.plan_participants(p_plan_ids uuid[])
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
  rsvp_note text,
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
      case
        when p.id = public.current_parent_id()
          or a.created_by = public.current_parent_id()
          or public.has_connection_edge(p.id, public.current_parent_id())
        then ai.rsvp_note
        else null
      end,
      ai.state_changed_at
    from public.activity_interactions ai
    join public.parents p on p.id = ai.parent_id
    join public.activities a on a.id = ai.activity_id
    where ai.activity_id = any(coalesce(p_plan_ids, '{}'::uuid[]))
      and ai.state in ('interested', 'going', 'attended', 'out')
      and public.can_view_plan(ai.activity_id)
      and (
        p.id = public.current_parent_id()
        or not public.is_blocked_between(p.id, public.current_parent_id())
      );
  $$;

drop function if exists public.set_plan_rsvp(uuid, text);
create function public.set_plan_rsvp(
  p_plan uuid,
  p_state text,
  p_note text default null
)
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
    if p_note is not null and char_length(btrim(p_note)) > 500 then
      raise exception 'RSVP details must be 500 characters or fewer';
    end if;
    if not public.can_view_plan(p_plan) then raise exception 'Plan not found'; end if;
    if exists (select 1 from public.activities where id = p_plan and cancelled_at is not null) then
      raise exception 'This plan was cancelled';
    end if;

    insert into public.activity_interactions (
      parent_id, activity_id, state, rsvp_note, state_changed_at, created_at
    ) values (
      me, p_plan, p_state,
      case when p_note is null then null else nullif(btrim(p_note), '') end,
      now(), now()
    )
    on conflict (parent_id, activity_id) do update set
      state = excluded.state,
      rsvp_note = case
        when p_note is null then activity_interactions.rsvp_note
        else excluded.rsvp_note
      end,
      state_changed_at = excluded.state_changed_at
    returning * into result;
    return result;
  end;
  $$;

revoke all on function public.plan_participants(uuid[]),
  public.set_plan_rsvp(uuid, text, text)
from public, anon;

grant execute on function public.plan_participants(uuid[]),
  public.set_plan_rsvp(uuid, text, text)
to authenticated;
