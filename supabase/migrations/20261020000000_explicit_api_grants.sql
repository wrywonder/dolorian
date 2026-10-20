-- Make the current API independent of Supabase's automatic public-table grants.
-- https://github.com/orgs/supabase/discussions/45329
-- Existing objects retain their privileges after October 30. This backfill is
-- additive: do not change RLS, restore blanket defaults, or broaden the existing
-- parents column grants / connection_notifications UPDATE (read_at) grant.

-- Direct client reads and writes in src/lib/data.ts.
grant select, insert, update, delete on public.kids to authenticated;
grant select, insert, delete on public.posts, public.post_reactions to authenticated;
-- Retriable reaction upserts update every submitted field, including conflict keys.
grant update (post_id, parent_id, emoji) on public.post_reactions to authenticated;
grant select, insert on public.post_comments to authenticated;
grant select, insert, update on public.parent_locations,
  public.parent_hangout_spots, public.activity_interactions to authenticated;
grant select on public.connections, public.activities, public.calendar_events,
  public.prompts to authenticated;
grant update (state) on public.prompts to authenticated;

-- The schedule migration deliberately retains legacy direct plan creation and
-- edits (see plan_schedules.test.sql). Its own-parent policies and validation
-- trigger still govern these writes; ownerless directory inserts are server-only.
grant insert, update on public.activities to authenticated;
grant insert on public.activities to service_role;

-- Venues are the public directory. Creation goes through create_hangout_venue.
grant select on public.venues to anon, authenticated;

-- connection-push uses a service-role client. BYPASSRLS does not confer grants.
-- The claim RPC owns notification lookup; finish only filters by ID and lease.
grant select (id, auth_user_id) on public.parents to service_role;
grant select (id, push_claimed_at) on public.connection_notifications to service_role;
grant update (push_sent_at, push_claimed_at) on public.connection_notifications to service_role;
grant select (token, parent_id) on public.parent_push_tokens to service_role;
grant delete on public.parent_push_tokens to service_role;

-- venue-photo only persists the resolved Google place ID.
grant select (id), update (google_place_id) on public.venues to service_role;

-- admin_connection_reports already grants service_role SELECT, but it is a
-- security-invoker view and also needs access to these underlying relations.
grant select on public.connection_reports to service_role;
grant select (display_name) on public.parents to service_role;

-- Other Your Village tables and RPCs already have explicit grants. Relationship,
-- invitation and private contact mutations stay behind their RPCs.
-- stories/story_moments have no current API consumers. UUID primary keys need
-- no sequence grants. Future tables must declare their own intended privileges.
