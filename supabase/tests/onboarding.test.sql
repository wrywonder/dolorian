-- Run transactionally with `supabase test db` after applying migrations.
begin;

do $$
declare
  first_profile public.parents;
  retried_profile public.parents;
begin
  perform set_config('request.jwt.claim.sub', '83000000-0000-4000-8000-000000000011', true);

  first_profile := public.complete_onboarding('  Test   Parent  ', '  Noe   Valley ', 'sage', 'tp');
  assert first_profile.display_name = 'Test Parent', 'display name should be normalized';
  assert first_profile.neighborhood = 'Noe Valley', 'neighborhood should be normalized';
  assert first_profile.avatar_initials = 'TP', 'initials should be normalized';
  assert exists (
    select 1 from public.parent_notification_preferences where parent_id = first_profile.id
  ), 'onboarding should create notification preferences';

  retried_profile := public.complete_onboarding('Test Parent Updated', null, 'peach', 'TU');
  assert retried_profile.id = first_profile.id, 'retry should reuse the same parent row';
  assert retried_profile.display_name = 'Test Parent Updated', 'retry should finish with current values';
  assert (select count(*) from public.parents where auth_user_id = '83000000-0000-4000-8000-000000000011') = 1,
    'retry should not create a duplicate profile';

  begin
    perform public.complete_onboarding('A', null, 'peach', 'A');
    raise exception 'short display name unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Display name must be between 2 and 80 characters';
  end;

  begin
    perform public.complete_onboarding('Valid Parent', null, 'unknown', 'VP');
    raise exception 'invalid avatar color unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Choose a valid profile color';
  end;
end;
$$;

rollback;
