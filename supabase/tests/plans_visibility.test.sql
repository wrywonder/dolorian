-- Run with `supabase test db` after applying migrations locally.
begin;

insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values
  ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000011', 'Plan Alex', 'peach', 'PA'),
  ('82000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000012', 'Plan Blair', 'sage', 'PB'),
  ('82000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000013', 'Plan Casey', 'golden', 'PC');

do $$
declare
  created jsonb;
  public_plan uuid;
  village_plan uuid;
  invited_plan uuid;
  rsvp public.activity_interactions;
begin
  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000011', true);
  perform public.request_connection('82000000-0000-4000-8000-000000000002');
  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000012', true);
  perform public.respond_connection('82000000-0000-4000-8000-000000000001', true);

  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000011', true);
  created := public.create_plan(
    'Public market day', 'Bring a tote', '🥕', now() + interval '1 day', null,
    false, 'public', '{}'::uuid[], 'Test market', null, 'https://example.com', null
  );
  public_plan := (created #>> '{plan,id}')::uuid;

  created := public.create_plan(
    'Village picnic', null, '🧺', now() + interval '2 days', null,
    false, 'connections', '{}'::uuid[], 'Test park', null, null, null
  );
  village_plan := (created #>> '{plan,id}')::uuid;

  created := public.create_plan(
    'Invited playdate', null, '✨', now() + interval '3 days', null,
    false, 'invited', array['82000000-0000-4000-8000-000000000002'::uuid],
    'Test playground', null, null, null
  );
  invited_plan := (created #>> '{plan,id}')::uuid;

  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000013', true);
  assert public.can_view_plan(public_plan),
    'any parent should be able to view a public plan';
  assert not public.can_view_plan(village_plan),
    'a non-connection should not see a village plan';
  assert not public.can_view_plan(invited_plan),
    'an uninvited parent should not see an invited-only plan';

  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000012', true);
  assert public.can_view_plan(village_plan),
    'an accepted connection should see a village plan';
  assert public.can_view_plan(invited_plan),
    'an invited connection should see an invited-only plan';
  rsvp := public.set_plan_rsvp(invited_plan, 'out', 'Leo · weeks 2, 4, and 6');
  assert rsvp.state = 'out', 'invited parents should be able to say they are out';
  assert rsvp.rsvp_note = 'Leo · weeks 2, 4, and 6',
    'family-specific attendance details should stay on the RSVP';
  assert exists (
    select 1 from public.plan_participants(array[invited_plan])
    where parent_id = '82000000-0000-4000-8000-000000000002'
      and state = 'out'
      and rsvp_note = 'Leo · weeks 2, 4, and 6'
  ), 'out responses and their details should appear in plan participants';

  rsvp := public.set_plan_rsvp(invited_plan, 'going');
  assert rsvp.rsvp_note = 'Leo · weeks 2, 4, and 6',
    'changing RSVP state without details should preserve the current details';

  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000013', true);
  begin
    perform public.set_plan_rsvp(village_plan, 'going');
    raise exception 'non-connection RSVP unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Plan not found';
  end;

  perform set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000011', true);
  begin
    perform public.create_plan(
      'Invalid private plan', null, null, now() + interval '4 days', null,
      false, 'invited', array['82000000-0000-4000-8000-000000000003'::uuid],
      null, null, null, null
    );
    raise exception 'non-connection invite unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Plans can only invite your current connections';
  end;
end;
$$;

rollback;
