-- Phase 2 · Row-level security policies
-- Wires each table to the connection graph. The auth.uid() → parents.id
-- lookup happens via auth_user_id.

-- helper: get the caller's parent row id
create or replace function public.current_parent_id() returns uuid
  language sql stable security definer as $$
  select id from parents where auth_user_id = auth.uid();
$$;

-- helper: are two parents connected? Order-insensitive.
create or replace function public.are_connected(a uuid, b uuid) returns boolean
  language sql stable as $$
  select exists(
    select 1 from connections
    where status = 'connected'
      and (
        (parent_a = least(a,b) and parent_b = greatest(a,b))
      )
  );
$$;

-- ─────── parents ───────
alter table parents enable row level security;

create policy parents_select_self_or_connected on parents
  for select using (
    id = current_parent_id()
    or are_connected(id, current_parent_id())
    -- For onboarding/discovery, allow searching by exact auth_user_id only.
  );

create policy parents_update_self on parents
  for update using (id = current_parent_id())
  with check (id = current_parent_id());

-- ─────── kids ───────
alter table kids enable row level security;

create policy kids_select on kids
  for select using (
    parent_id = current_parent_id()
    or are_connected(parent_id, current_parent_id())
  );

create policy kids_write_own on kids
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- ─────── connections ───────
alter table connections enable row level security;

create policy connections_select_involving_me on connections
  for select using (
    parent_a = current_parent_id() or parent_b = current_parent_id()
  );

create policy connections_insert_initiated_by_me on connections
  for insert with check (initiated_by = current_parent_id());

create policy connections_update_either_party on connections
  for update using (
    parent_a = current_parent_id() or parent_b = current_parent_id()
  );

-- ─────── posts ───────
alter table posts enable row level security;

create policy posts_select_self_or_connected on posts
  for select using (
    author_id = current_parent_id()
    or are_connected(author_id, current_parent_id())
  );

create policy posts_write_own on posts
  for all using (author_id = current_parent_id())
  with check (author_id = current_parent_id());

-- ─────── activities ───────
alter table activities enable row level security;

-- Activities are public reads once published — they're the directory
-- everyone browses. Unpublished items (AI-discovered, calendar-imported)
-- are visible only to the parent who'll review them.
create policy activities_select_published_or_mine on activities
  for select using (
    published
    or created_by = current_parent_id()
    or (
      -- calendar-imported drafts: visible to the parent whose calendar
      not published
      and source = 'calendar_imported'
      and exists(
        select 1 from calendar_events ce
        where ce.extracted_activity_id = activities.id
          and ce.parent_id = current_parent_id()
      )
    )
  );

create policy activities_insert_self on activities
  for insert with check (
    created_by = current_parent_id() or created_by is null
  );

create policy activities_update_own on activities
  for update using (created_by = current_parent_id())
  with check (created_by = current_parent_id());

-- ─────── activity_interactions ───────
alter table activity_interactions enable row level security;

-- "X friends are interested + Y going" needs to read connected-parents' rows.
create policy ai_select_self_or_connected on activity_interactions
  for select using (
    parent_id = current_parent_id()
    or are_connected(parent_id, current_parent_id())
  );

create policy ai_write_own on activity_interactions
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- ─────── venues ───────
alter table venues enable row level security;

-- Public directory.
create policy venues_select_all on venues for select using (true);

-- ─────── parent_locations ───────
alter table parent_locations enable row level security;

create policy locations_select_self_or_visible_connections on parent_locations
  for select using (
    parent_id = current_parent_id()
    or (
      visible
      and are_connected(parent_id, current_parent_id())
    )
  );

create policy locations_write_own on parent_locations
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- ─────── prompts ───────
alter table prompts enable row level security;

create policy prompts_select_own on prompts
  for select using (parent_id = current_parent_id());

create policy prompts_write_own on prompts
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- ─────── calendar_events ───────
alter table calendar_events enable row level security;

create policy calendar_events_own_only on calendar_events
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- ─────── stories ───────
alter table stories enable row level security;

create policy stories_select_own_or_published on stories
  for select using (
    parent_id = current_parent_id()
    or (
      published
      and are_connected(parent_id, current_parent_id())
    )
  );

create policy stories_write_own on stories
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- ─────── story_moments ───────
alter table story_moments enable row level security;

create policy story_moments_select_via_parent_story on story_moments
  for select using (
    exists(
      select 1 from stories s
      where s.id = story_moments.story_id
        and (
          s.parent_id = current_parent_id()
          or (s.published and are_connected(s.parent_id, current_parent_id()))
        )
    )
  );

create policy story_moments_write_via_owned_story on story_moments
  for all using (
    exists(
      select 1 from stories s
      where s.id = story_moments.story_id
        and s.parent_id = current_parent_id()
    )
  )
  with check (
    exists(
      select 1 from stories s
      where s.id = story_moments.story_id
        and s.parent_id = current_parent_id()
    )
  );
