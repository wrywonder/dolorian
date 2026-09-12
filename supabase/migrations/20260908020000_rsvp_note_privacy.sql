-- RSVP notes can contain children's names, weeks, or pickup arrangements.
-- Match direct-table reads to the note audience in plan_participants(); public
-- plan viewers still receive the redacted participant list through that RPC.
drop policy if exists activity_interactions_visible_plan on public.activity_interactions;
create policy activity_interactions_visible_plan on public.activity_interactions
  for select using (
    parent_id = public.current_parent_id()
    or (
      public.can_view_plan(activity_id)
      and not public.is_blocked_between(parent_id, public.current_parent_id())
      and (
        public.are_connected(parent_id, public.current_parent_id())
        or exists (
          select 1 from public.activities a
          where a.id = activity_id and a.created_by = public.current_parent_id()
        )
      )
    )
  );

-- A pending connection request grants limited profile access, not consent to
-- read a family's child names or attendance arrangements. Keep attendee/profile
-- discovery unchanged while restricting private notes to accepted connections.
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
          or public.are_connected(p.id, public.current_parent_id())
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
