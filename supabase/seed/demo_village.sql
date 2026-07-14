-- Demo village for the App Store review account.
--
-- NOT a migration — run this once, by hand, in the Supabase SQL editor
-- (it runs as postgres there, so RLS doesn't block the inserts).
--
-- Prerequisite: create the auth user first in Dashboard → Authentication
-- → Users → Add user: email appreview@dolorian.app, a strong password,
-- auto-confirm ON. This script fails loudly if that hasn't been done.
--
-- Idempotent: every insert uses fixed UUIDs + on conflict do nothing,
-- so re-running is safe. Activity dates are relative to now() so the
-- Plans tab stays populated whenever review happens.

do $$
declare
  v_auth_user uuid;
  -- fixed ids so the script is re-runnable
  v_reviewer  uuid := 'de300000-0000-4000-8000-000000000001';
  v_maya      uuid := 'de300000-0000-4000-8000-000000000002';
  v_jordan    uuid := 'de300000-0000-4000-8000-000000000003';
  v_sam       uuid := 'de300000-0000-4000-8000-000000000004';
  v_dolores   uuid := 'de301000-0000-4000-8000-000000000001';
  v_library   uuid := 'de301000-0000-4000-8000-000000000002';
  v_pool      uuid := 'de301000-0000-4000-8000-000000000003';
  v_act_picnic uuid := 'de302000-0000-4000-8000-000000000001';
  v_act_story  uuid := 'de302000-0000-4000-8000-000000000002';
  v_act_swim   uuid := 'de302000-0000-4000-8000-000000000003';
begin
  select id into v_auth_user from auth.users where email = 'appreview@dolorian.app';
  if v_auth_user is null then
    raise exception 'Create the appreview@dolorian.app user in Authentication → Users first, then re-run.';
  end if;

  -- ─────── parents ───────
  insert into parents (id, auth_user_id, display_name, neighborhood, avatar_color, avatar_initials) values
    (v_reviewer, v_auth_user, 'Riley Reviewer', 'Mission Dolores', 'sage',   'RR'),
    (v_maya,     null,        'Maya Chen',      'Noe Valley',      'peach',  'MC'),
    (v_jordan,   null,        'Jordan Alvarez', 'The Castro',      'golden', 'JA'),
    (v_sam,      null,        'Sam Whitfield',  'Mission Dolores', 'slate',  'SW')
  on conflict do nothing;

  -- ─────── kids ───────
  insert into kids (id, parent_id, name, birth_year, interests) values
    ('de303000-0000-4000-8000-000000000001', v_maya,   'Lena',  2021, '{drawing,swings}'),
    ('de303000-0000-4000-8000-000000000002', v_jordan, 'Theo',  2020, '{dinosaurs,swimming}'),
    ('de303000-0000-4000-8000-000000000003', v_jordan, 'Ivy',   2023, '{bubbles}'),
    ('de303000-0000-4000-8000-000000000004', v_sam,    'Nico',  2019, '{soccer,legos}')
  on conflict do nothing;

  -- ─────── connections (reviewer ↔ everyone; canonical a < b) ───────
  insert into connections (parent_a, parent_b, status, initiated_by, responded_at)
  select least(v_reviewer, p), greatest(v_reviewer, p), 'connected', p, now()
  from unnest(array[v_maya, v_jordan, v_sam]) as p
  on conflict do nothing;

  -- ─────── venues ───────
  insert into venues (id, name, emoji, lat, lng, venue_type) values
    (v_dolores, 'Dolores Park',        '🌳', 37.7596, -122.4269, 'park'),
    (v_library, 'Mission Bay Library', '📚', 37.7708, -122.3939, 'library'),
    (v_pool,    'Garfield Pool',       '🏊', 37.7513, -122.4108, 'swim')
  on conflict do nothing;

  -- ─────── who's out & about (IRL map pins) ───────
  insert into parent_locations (parent_id, venue_id, visible, last_seen_at) values
    (v_maya,   v_dolores, true, now() - interval '12 minutes'),
    (v_jordan, v_dolores, true, now() - interval '25 minutes'),
    (v_sam,    v_library, true, now() - interval '5 minutes')
  on conflict do nothing;

  -- ─────── activities (Plans tab; dates relative to now) ───────
  insert into activities (id, name, emoji, description, venue_id, starts_at, ends_at, source, published) values
    (v_act_picnic, 'Saturday picnic & playdate', '🧺',
     'Blankets by the playground — bring snacks to share.',
     v_dolores, now() + interval '2 days',  now() + interval '2 days 2 hours',  'admin', true),
    (v_act_story,  'Toddler story time',         '📖',
     'Weekly read-aloud for the under-5 crowd.',
     v_library, now() + interval '4 days',  now() + interval '4 days 1 hour',   'admin', true),
    (v_act_swim,   'Family swim hour',           '🌊',
     'Shallow-end hour reserved for families.',
     v_pool,    now() + interval '6 days',  now() + interval '6 days 1 hour',   'admin', true)
  on conflict do nothing;

  -- ─────── social proof on activities ───────
  insert into activity_interactions (parent_id, activity_id, state) values
    (v_maya,   v_act_picnic, 'going'),
    (v_jordan, v_act_picnic, 'interested'),
    (v_sam,    v_act_picnic, 'going'),
    (v_maya,   v_act_story,  'interested'),
    (v_jordan, v_act_swim,   'going')
  on conflict do nothing;

  -- ─────── feed posts (photo posts without media render the striped tile) ───────
  insert into posts (id, author_id, type, body, venue_id, created_at) values
    ('de304000-0000-4000-8000-000000000001', v_maya, 'photo',
     'golden hour at the playground', v_dolores, now() - interval '2 hours'),
    ('de304000-0000-4000-8000-000000000002', v_jordan, 'question',
     'anyone have a pediatric dentist they actually like?', null, now() - interval '5 hours'),
    ('de304000-0000-4000-8000-000000000003', v_sam, 'text',
     'Nico rode without training wheels today. not crying, you''re crying.', null, now() - interval '1 day'),
    ('de304000-0000-4000-8000-000000000004', v_jordan, 'photo',
     'library haul', v_library, now() - interval '2 days')
  on conflict do nothing;

  -- ─────── a pending prompt so the Buzz prompt card shows ───────
  insert into prompts (id, parent_id, prompt_type, payload, state) values
    ('de305000-0000-4000-8000-000000000001', v_reviewer, 'rsvp_from_friend_signal',
     jsonb_build_object('activity_id', v_act_picnic, 'signal_from', v_maya),
     'pending')
  on conflict do nothing;

  -- ─────── reactions + comments so the feed reads alive ───────
  -- (requires 20260714010000_reactions_comments.sql to be applied)
  insert into post_reactions (id, post_id, parent_id, emoji) values
    ('de306000-0000-4000-8000-000000000001', 'de304000-0000-4000-8000-000000000001', v_jordan, '❤️'),
    ('de306000-0000-4000-8000-000000000002', 'de304000-0000-4000-8000-000000000001', v_sam,    '❤️'),
    ('de306000-0000-4000-8000-000000000003', 'de304000-0000-4000-8000-000000000003', v_maya,   '❤️')
  on conflict do nothing;

  insert into post_comments (id, post_id, author_id, body, created_at) values
    ('de307000-0000-4000-8000-000000000001', 'de304000-0000-4000-8000-000000000002', v_maya,
     'We love Dr. Osei on Valencia — gentle and fast with wiggly kids.', now() - interval '4 hours'),
    ('de307000-0000-4000-8000-000000000002', 'de304000-0000-4000-8000-000000000003', v_jordan,
     'GO NICO 🎉', now() - interval '20 hours')
  on conflict do nothing;
end $$;
