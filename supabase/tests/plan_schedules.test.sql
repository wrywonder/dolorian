-- Local-only regression for the new RPCs and the direct-table trust boundary.
begin;
insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values
  ('86000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000011', 'Schedule Host', 'peach', 'SH'),
  ('86000000-0000-4000-8000-000000000002', '86000000-0000-4000-8000-000000000012', 'Schedule Friend', 'sage', 'SF'),
  ('86000000-0000-4000-8000-000000000003', '86000000-0000-4000-8000-000000000013', 'Schedule Stranger', 'golden', 'SS');
insert into public.connections (parent_a, parent_b, status, initiated_by)
values ('86000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000002', 'connected', '86000000-0000-4000-8000-000000000001');
create temporary table schedule_test_ids (kind text primary key, id uuid);
grant all on schedule_test_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '86000000-0000-4000-8000-000000000011', true);

do $$
declare
  payload jsonb;
  v_plan_id uuid;
  before_count integer;
begin
  payload := public.create_plan_v3(
    'Anyone up for camp?', 'We can choose a week together.', '⛺', null, null,
    false, 'connections', 'signup', 'once', '{}'::smallint[], 'America/Los_Angeles',
    p_external_url => 'https://example.test/camp', p_external_source_key => 'camp:same-program'
  );
  v_plan_id := (payload #>> '{plan,id}')::uuid;
  insert into schedule_test_ids values ('tbd', v_plan_id);
  assert payload #>> '{plan,plan_kind}' = 'signup', 'Explicit signup intent survives without a date';
  assert payload #>> '{plan,starts_at}' is null, 'TBD does not invent a date';
  assert payload #>> '{plan,external_source_key}' = 'camp:same-program', 'Source keys persist atomically';
  assert not exists (select 1 from public.activity_interactions where activity_id = v_plan_id), 'Sharing does not claim registration or attendance';
  assert exists (select 1 from public.plan_shared_by(array[v_plan_id]) where parent_id = public.current_parent_id() and profile_visible), 'Sharer exists independently from RSVP';

  payload := public.create_plan_v3(
    'Saturday soccer', null, '⚽', '2026-10-31 16:00Z', '2026-11-14 18:00Z',
    false, 'invited', 'signup', 'weekly', array[6]::smallint[], 'America/Los_Angeles',
    array['86000000-0000-4000-8000-000000000002'::uuid]
  );
  v_plan_id := (payload #>> '{plan,id}')::uuid;
  insert into schedule_test_ids values ('soccer', v_plan_id);
  assert payload #>> '{plan,schedule_kind}' = 'weekly', 'The repeating schedule is stored';
  assert payload #> '{plan,schedule_days}' = '[6]'::jsonb, 'Chosen weekday survives';
  assert jsonb_array_length(payload -> 'notified_parent_ids') = 1, 'Guarded invite notification is preserved';
  assert exists (select 1 from public.plan_invites where plan_invites.plan_id = v_plan_id), 'Invite rows and plan are atomic';

  -- Update exact new fields together; validating a transient half-updated row
  -- would incorrectly reject switching this Saturday series to weekdays.
  payload := public.update_plan_v3(
    v_plan_id, 'Weekday camp', 'Bring lunch', '⛺', '2026-11-02 17:00Z', '2026-11-06 23:00Z',
    false, 'invited', 'signup', 'weekly', array[1,2,3,4,5]::smallint[], 'America/Los_Angeles',
    array['86000000-0000-4000-8000-000000000002'::uuid]
  );
  assert payload #> '{plan,schedule_days}' = '[1,2,3,4,5]'::jsonb, 'v3 edit changes all schedule fields together';
  assert jsonb_array_length(payload -> 'notified_parent_ids') = 0, 'Unchanged invitees are not notified twice';

  payload := public.create_plan_v3(
    'Park birthday', null, '🎂', '2026-09-19 17:00Z', '2026-09-19 19:00Z',
    false, 'public', 'gathering', 'once', '{}'::smallint[], 'America/Los_Angeles',
    p_external_url => 'https://example.test/park-map'
  );
  insert into schedule_test_ids values ('birthday', (payload #>> '{plan,id}')::uuid);
  assert payload #>> '{plan,plan_kind}' = 'gathering', 'A useful map link does not change gathering intent';

  perform public.validate_plan_schedule('signup', 'weekly', array[0,1,2,3,4,5,6]::smallint[], 'America/Los_Angeles', '2026-03-07 08:00Z', '2026-03-09 07:00Z', true);
  assert public.plan_local_instant('2026-11-01 01:30', 'America/Los_Angeles') = '2026-11-01 08:30Z'::timestamptz, 'Fall repeated hour picks the earlier instant like the client';
  assert public.plan_local_instant('2026-03-08 02:30', 'America/Los_Angeles') is null, 'Spring missing hour has no invented instant';

  select count(*) into before_count from public.activities;
  begin
    perform public.create_plan_v3('Invalid gap', null, null, '2026-03-01 10:30Z', '2026-03-15 10:30Z', false, 'connections', 'signup', 'weekly', array[0]::smallint[], 'America/Los_Angeles');
    raise exception 'gap schedule unexpectedly succeeded';
  exception when others then assert sqlerrm like '%clock change%', 'Reject any missing repeated session'; end;
  assert (select count(*) from public.activities) = before_count, 'Invalid creation does not leave a partial plan';

  begin
    perform public.validate_plan_schedule('signup', 'weekly', array[6,6]::smallint[], 'America/Los_Angeles', '2026-10-31 16:00Z', '2026-11-14 18:00Z', false);
    raise exception 'duplicate weekdays unexpectedly succeeded';
  exception when others then assert sqlerrm = 'Choose the days this plan repeats'; end;
  begin
    perform public.validate_plan_schedule('signup', 'weekly', array[[6],[0]]::smallint[], 'America/Los_Angeles', '2026-10-31 16:00Z', '2026-11-14 18:00Z', false);
    raise exception 'nested weekday array unexpectedly succeeded';
  exception when others then assert sqlerrm = 'Choose the days this plan repeats'; end;
  begin
    perform public.validate_plan_schedule('signup', 'weekly', array[6]::smallint[], 'America/Los_Angeles', '2026-10-31 16:00Z', '2028-11-18 18:00Z', false);
    raise exception 'unbounded repeat unexpectedly succeeded';
  exception when others then assert sqlerrm like '%within one year%'; end;
  begin
    perform public.validate_plan_schedule('signup', 'weekly', array[6]::smallint[], 'America/Los_Angeles', '2026-10-31 16:00Z', '2026-11-14 16:00Z', false);
    raise exception 'overnight repeat unexpectedly succeeded';
  exception when others then assert sqlerrm like '%same day%'; end;
  begin
    perform public.validate_plan_schedule('gathering', 'once', '{}'::smallint[], 'America/Los_Angeles', null, now(), false);
    raise exception 'end without start unexpectedly succeeded';
  exception when others then assert sqlerrm like '%end after the start%'; end;
  begin
    perform public.validate_plan_schedule('gathering', 'once', '{}'::smallint[], 'America/Los_Angeles', '2026-09-19 17:00Z', '2026-09-19 17:00Z', false);
    raise exception 'zero duration unexpectedly succeeded';
  exception when others then assert sqlerrm like '%end after the start%'; end;
  perform public.validate_plan_schedule('gathering', 'once', '{}'::smallint[], 'America/Los_Angeles', '2026-09-19 07:00Z', '2026-09-19 07:00Z', true);
  begin
    perform public.validate_plan_schedule('signup', 'once', '{}'::smallint[], 'Not/AZone', null, null, false);
    raise exception 'invalid timezone unexpectedly succeeded';
  exception when others then assert sqlerrm = 'Choose a valid time zone'; end;
  begin
    perform public.create_plan_v3('No invitees', null, null, null, null, false, 'invited', 'gathering', 'once', '{}'::smallint[], 'America/Los_Angeles');
    raise exception 'empty private invitation unexpectedly succeeded';
  exception when others then assert sqlerrm = 'Choose at least one connection'; end;

  -- Own-row writes cannot bypass schedule validation or impersonate an ownerless
  -- directory listing. Legacy clients can still create their own dated plans.
  begin
    insert into public.activities(name, created_by, source, published) values ('Ownerless spoof', null, 'admin', true);
    raise exception 'ownerless insertion unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.activities set schedule_days = array[3]::smallint[] where id = v_plan_id;
    raise exception 'direct invalid schedule unexpectedly succeeded';
  exception when others then assert sqlerrm like '%first and final dates%'; end;
  payload := public.create_plan_v2('Old client gathering', null, null, now() + interval '1 day', null, false, 'connections');
  assert payload #>> '{plan,schedule_kind}' is null, 'Legacy RPC schedule semantics are preserved';
end;
$$;

select set_config('request.jwt.claim.sub', '86000000-0000-4000-8000-000000000012', true);
do $$
declare v_plan_id uuid := (select id from schedule_test_ids where kind = 'soccer');
begin
  assert public.can_view_plan(v_plan_id), 'Invited friend can see the schedule';
  assert exists (select 1 from public.plan_shared_by(array[v_plan_id]) where display_name = 'Schedule Host' and profile_visible), 'Connection sees safe sharer identity';
  perform public.set_plan_rsvp(v_plan_id, 'going', 'Milo · bringing lunch');
  begin
    perform public.update_plan_v3(v_plan_id, 'Stolen plan', null, null, null, null, false, 'connections', 'gathering', 'once', '{}'::smallint[], 'America/Los_Angeles');
    raise exception 'non-owner update unexpectedly succeeded';
  exception when others then assert sqlerrm = 'Editable plan not found'; end;
end;
$$;

select set_config('request.jwt.claim.sub', '86000000-0000-4000-8000-000000000013', true);
do $$
declare
  private_plan uuid := (select id from schedule_test_ids where kind = 'soccer');
  public_plan uuid := (select id from schedule_test_ids where kind = 'birthday');
begin
  assert not exists (select 1 from public.plan_shared_by(array[private_plan])), 'Sharer RPC does not reveal a private plan';
  assert exists (select 1 from public.plan_shared_by(array[public_plan]) where display_name = 'Schedule Host' and not profile_visible), 'A public sharer is attributed without granting profile access';
  assert not exists (select 1 from public.parents where id = '86000000-0000-4000-8000-000000000001'), 'The shared identity RPC does not widen parent profile RLS';
  perform public.block_parent('86000000-0000-4000-8000-000000000001');
  assert not exists (select 1 from public.plan_shared_by(array[public_plan])), 'Block removes shared identity too';
end;
$$;

reset role;
set local role anon;
do $$ begin
  begin
    insert into public.activities(name, created_by, source, published) values ('Anonymous ownerless spoof', null, 'admin', true);
    raise exception 'anonymous ownerless insertion unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.plan_shared_by('{}'::uuid[]);
    raise exception 'anon sharer query unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
insert into public.activities(name, created_by, source, published) values ('Service directory listing', null, 'admin', true);
reset role;
rollback;
