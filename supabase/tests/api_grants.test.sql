-- Run on a fresh database with automatic public-table grants disabled.
-- Unlike the older RPC tests, these queries actually SET ROLE to exercise ACLs
-- and RLS together. All fixtures and mutations are rolled back.
begin;

create function pg_temp.expect_denied(statement text) returns void
language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'Expected permission denied: %', statement;
end;
$$;

-- These checks also catch accidental GRANT ALL/table-wide parents access.
do $$
declare
  relation text;
  operation text;
begin
  assert not has_table_privilege('authenticated', 'public.parents', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.parents', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.parents', 'UPDATE');
  assert has_column_privilege('authenticated', 'public.parents', 'display_name', 'UPDATE');
  assert not has_column_privilege('authenticated', 'public.parents', 'phone_e164', 'SELECT');
  assert not has_column_privilege('authenticated', 'public.parents', 'phone_e164', 'INSERT');
  assert not has_column_privilege('authenticated', 'public.parents', 'phone_e164', 'UPDATE');
  assert not has_column_privilege('authenticated', 'public.parents', 'auth_user_id', 'UPDATE');
  assert has_column_privilege('authenticated', 'public.connection_notifications', 'read_at', 'UPDATE');
  assert not has_column_privilege('authenticated', 'public.connection_notifications', 'push_sent_at', 'UPDATE');
  assert not has_column_privilege('authenticated', 'public.connection_notifications', 'push_claimed_at', 'UPDATE');
  assert not has_column_privilege('authenticated', 'public.connection_notifications', 'body', 'UPDATE');
  assert not has_column_privilege('service_role', 'public.parents', 'phone_e164', 'SELECT');
  assert not has_column_privilege('service_role', 'public.venues', 'name', 'UPDATE');
  assert not has_column_privilege('service_role', 'public.connection_notifications', 'body', 'UPDATE');

  foreach relation in array array[
    'connections', 'plan_invites', 'parent_private_contacts',
    'contact_shares', 'parent_blocks', 'connection_invites', 'connection_invite_uses',
    'connection_reports', 'connection_audit_log', 'parent_push_tokens',
    'stories', 'story_moments'
  ] loop
    foreach operation in array array['INSERT', 'UPDATE'] loop
      assert not has_any_column_privilege('authenticated', 'public.' || relation, operation),
        format('Direct %s on %s should not be granted', operation, relation);
    end loop;
    assert not has_table_privilege('authenticated', 'public.' || relation, 'DELETE'),
      format('Direct DELETE on %s should not be granted', relation);
  end loop;
  assert not has_column_privilege('authenticated', 'public.prompts', 'payload', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.venues', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.post_comments', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.post_reactions', 'UPDATE');
  assert has_column_privilege('authenticated', 'public.post_reactions', 'emoji', 'UPDATE'),
    'Reaction upserts need the explicit emoji UPDATE grant';
  assert not has_column_privilege('authenticated', 'public.post_reactions', 'created_at', 'UPDATE');

  for relation in
    select tablename from pg_tables where schemaname = 'public'
  loop
    assert not has_any_column_privilege('anon', 'public.' || relation, 'INSERT');
    assert not has_any_column_privilege('anon', 'public.' || relation, 'UPDATE');
    assert not has_table_privilege('anon', 'public.' || relation, 'DELETE');
    if relation <> 'venues' then
      assert not has_any_column_privilege('anon', 'public.' || relation, 'SELECT'),
        format('Anonymous read unexpectedly granted on %s', relation);
    end if;
  end loop;
end;
$$;

insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values
  ('84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000011', 'Grant Alex', 'peach', 'GA'),
  ('84000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000012', 'Grant Blair', 'sage', 'GB'),
  ('84000000-0000-4000-8000-000000000003', '84000000-0000-4000-8000-000000000013', 'Grant Casey', 'golden', 'GC');
insert into public.posts (id, author_id, type, body)
values
  ('84100000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000002', 'text', 'Connected post'),
  ('84100000-0000-4000-8000-000000000003', '84000000-0000-4000-8000-000000000003', 'text', 'Stranger post');
insert into public.kids (parent_id, name, birth_year)
values ('84000000-0000-4000-8000-000000000002', 'Other kid', 2020);
insert into public.prompts (parent_id, prompt_type)
values
  ('84000000-0000-4000-8000-000000000001', 'share_after_activity'),
  ('84000000-0000-4000-8000-000000000003', 'share_after_activity');
insert into public.calendar_events (parent_id, source_event_id, raw_title)
values
  ('84000000-0000-4000-8000-000000000001', 'grant-own', 'Own event'),
  ('84000000-0000-4000-8000-000000000003', 'grant-other', 'Other event');

set local role authenticated;
select set_config('request.jwt.claim.sub', '84000000-0000-4000-8000-000000000011', true);
select public.request_connection('84000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '84000000-0000-4000-8000-000000000012', true);
select public.respond_connection('84000000-0000-4000-8000-000000000001', true);
select public.register_push_token('ExponentPushToken[grant-test]', 'ios', 'test-device');
select set_config('request.jwt.claim.sub', '84000000-0000-4000-8000-000000000011', true);

do $$
declare
  me uuid := '84000000-0000-4000-8000-000000000001';
  friend uuid := '84000000-0000-4000-8000-000000000002';
  stranger uuid := '84000000-0000-4000-8000-000000000003';
  v_post_id uuid;
  v_kid_id uuid;
  v_venue_id uuid;
  v_plan_id uuid;
  changed int;
begin
  assert current_user = 'authenticated';
  assert (select count(*) from public.parents) = 2, 'profiles must hide strangers';
  update public.parents set bio = 'Test profile' where id = me;
  assert (select bio from public.parents where id = me) = 'Test profile';
  perform pg_temp.expect_denied('select phone_e164 from public.parents');
  perform pg_temp.expect_denied('select * from public.parents');
  perform pg_temp.expect_denied('update public.parents set auth_user_id = gen_random_uuid()');
  perform pg_temp.expect_denied('update public.connections set status = ''connected''');
  perform pg_temp.expect_denied('insert into public.activities (name, source) values (''Bypass'', ''admin'')');
  perform pg_temp.expect_denied('update public.connection_notifications set body = ''Spoofed''');

  assert (select count(*) from public.connections) = 1, 'connection read must work';
  assert (select count(*) from public.posts) = 1, 'feed must hide stranger posts';
  -- Exercise the feed's joined tables, including column-limited parent reads.
  perform p.id, author.display_name, a.id, v.id,
    (select count(*) from public.post_reactions r where r.post_id = p.id),
    (select count(*) from public.post_comments c where c.post_id = p.id)
  from public.posts p
  left join public.parents author on author.id = p.author_id
  left join public.activities a on a.id = p.activity_id
  left join public.venues v on v.id = p.venue_id;
  insert into public.posts (author_id, type, body) values (me, 'text', 'Own post')
    returning id into v_post_id;
  insert into public.post_reactions (post_id, parent_id, emoji)
    values ('84100000-0000-4000-8000-000000000002', me, '❤️');
  insert into public.post_reactions (post_id, parent_id, emoji)
    values ('84100000-0000-4000-8000-000000000002', me, '🦖')
    on conflict (post_id, parent_id) do update set
      post_id = excluded.post_id, parent_id = excluded.parent_id, emoji = excluded.emoji;
  assert (select count(*) from public.post_reactions) = 1;
  assert exists (select 1 from public.post_reactions where emoji = '🦖');
  delete from public.post_reactions where parent_id = me;
  insert into public.post_comments (post_id, author_id, body)
    values ('84100000-0000-4000-8000-000000000002', me, 'Hello');
  assert (select count(*) from public.post_comments) = 1;
  perform pg_temp.expect_denied(format(
    'insert into public.post_comments (post_id, author_id, body) values (%L, %L, ''Hidden'')',
    '84100000-0000-4000-8000-000000000003', me));
  perform pg_temp.expect_denied(format(
    'insert into public.post_reactions (post_id, parent_id) values (%L, %L)',
    '84100000-0000-4000-8000-000000000003', me));
  delete from public.posts where id = '84100000-0000-4000-8000-000000000002';
  get diagnostics changed = row_count;
  assert changed = 0, 'cannot delete a connected parent post';
  delete from public.posts where id = v_post_id;
  get diagnostics changed = row_count;
  assert changed = 1, 'own post delete must work';

  insert into public.kids (parent_id, name, birth_year) values (me, 'Own kid', 2021)
    returning id into v_kid_id;
  insert into public.kids (id, parent_id, name, birth_year)
    values (v_kid_id, me, 'Updated kid', 2021)
    on conflict (id) do update set name = excluded.name;
  assert (select name from public.kids where id = v_kid_id) = 'Updated kid';
  update public.kids set name = 'Not allowed' where parent_id = friend;
  get diagnostics changed = row_count;
  assert changed = 0, 'cannot update a connected parent kid';
  perform pg_temp.expect_denied(format(
    'insert into public.kids (parent_id, name, birth_year) values (%L, ''Forged'', 2020)', friend));
  delete from public.kids where id = v_kid_id;

  select id into v_venue_id from public.create_hangout_venue('Test park', '🌳', 'park', 37.7, -122.4);
  assert exists (select 1 from public.venues where id = v_venue_id);
  insert into public.parent_hangout_spots (parent_id, venue_id) values (me, v_venue_id)
    on conflict (parent_id, venue_id) do update set enabled = excluded.enabled;
  insert into public.parent_hangout_spots (parent_id, venue_id, enabled) values (me, v_venue_id, false)
    on conflict (parent_id, venue_id) do update set enabled = excluded.enabled;
  assert exists (select 1 from public.parent_hangout_spots where parent_id = me and not enabled);
  insert into public.parent_locations (parent_id, venue_id, visible, expires_at)
    values (me, v_venue_id, true, now() + interval '1 hour')
    on conflict (parent_id) do update set venue_id = excluded.venue_id;
  insert into public.parent_locations (parent_id, venue_id, visible)
    values (me, v_venue_id, false)
    on conflict (parent_id) do update set visible = excluded.visible;
  assert exists (select 1 from public.parent_locations where parent_id = me and not visible);
  perform pg_temp.expect_denied(format(
    'insert into public.parent_locations (parent_id) values (%L)', stranger));

  v_plan_id := (public.create_plan(
    'Grant plan', null, null, now() + interval '1 day', null, false,
    'public', '{}'::uuid[], null, null, null, null
  ) #>> '{plan,id}')::uuid;
  assert exists (select 1 from public.activities where id = v_plan_id);
  insert into public.activity_interactions (parent_id, activity_id, state)
    values (me, v_plan_id, 'saved')
    on conflict (parent_id, activity_id) do update set state = excluded.state;
  insert into public.activity_interactions (parent_id, activity_id, state)
    values (me, v_plan_id, 'interested')
    on conflict (parent_id, activity_id) do update set state = excluded.state;
  assert exists (select 1 from public.activity_interactions where activity_id = v_plan_id and state = 'interested');
  perform public.set_plan_rsvp(v_plan_id, 'going');
  perform public.clear_plan_rsvp(v_plan_id);

  assert (select count(*) from public.prompts) = 1, 'prompts are private';
  update public.prompts set state = 'acted' where parent_id = me;
  assert exists (select 1 from public.prompts where state = 'acted');
  assert (select count(*) from public.calendar_events) = 1, 'calendar is private';
  update public.connection_notifications set read_at = now();
  assert exists (select 1 from public.connection_notifications where read_at is not null);
  perform public.set_my_phone('+14155550123');
  perform public.submit_parent_report(stranger, 'other', 'Test report');
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert current_user = 'anon';
  assert (select count(*) from public.venues) > 0, 'public venue directory must work';
  perform public.preview_connection_invite('NO-SUCH-CODE');
  perform pg_temp.expect_denied('select id from public.parents');
  perform pg_temp.expect_denied('select * from public.posts');
  perform pg_temp.expect_denied('insert into public.venues (name, lat, lng, venue_type) values (''Anon'', 0, 0, ''park'')');
end;
$$;

set local role service_role;
do $$
declare
  actor uuid;
  notification public.connection_notifications;
  changed int;
begin
  assert current_user = 'service_role';
  select id into actor from public.parents where auth_user_id = '84000000-0000-4000-8000-000000000011';
  assert actor is not null, 'push actor lookup';
  select * into notification from public.claim_connection_notification(
    actor, '84000000-0000-4000-8000-000000000002', 'connection_request', null);
  assert notification.id is not null and notification.push_claimed_at is not null,
    'push claim RPC must return a leased notification';
  assert exists (select token from public.parent_push_tokens
    where parent_id = '84000000-0000-4000-8000-000000000002'), 'device lookup';
  -- Match the Edge Function's compare-and-set finish query exactly.
  update public.connection_notifications set push_sent_at = now(), push_claimed_at = null
    where id = notification.id and push_claimed_at = notification.push_claimed_at;
  get diagnostics changed = row_count;
  assert changed = 1, 'push delivery acknowledgement clears its lease';
  delete from public.parent_push_tokens where token in ('ExponentPushToken[grant-test]');
  get diagnostics changed = row_count;
  assert changed = 1, 'invalid device token cleanup';
  update public.venues set google_place_id = 'test-place'
    where id = (select id from public.venues limit 1);
  get diagnostics changed = row_count;
  assert changed = 1, 'venue photo cache update';
  assert exists (select 1 from public.admin_connection_reports
    where reporter_name = 'Grant Alex' and reported_name = 'Grant Casey'),
    'security-invoker report view needs underlying grants';
  perform pg_temp.expect_denied('select phone_e164 from public.parents');
  perform pg_temp.expect_denied('update public.connection_notifications set body = ''Changed''');
  perform pg_temp.expect_denied('update public.venues set name = ''Changed''');
end;
$$;

rollback;
