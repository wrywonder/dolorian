-- Run against the local database after applying migrations.
begin;

insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values ('84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000011', 'Hangout Tester', 'peach', 'HT');

set local role authenticated;
select set_config('request.jwt.claim.sub', '84000000-0000-4000-8000-000000000011', true);

do $$
declare
  created public.venues;
begin
  begin
    insert into public.venues (name, lat, lng, venue_type, default_hangout, geofence_radius_m)
    values ('Forged global hangout', 37.75, -122.42, 'park', true, 100000);
    raise exception 'direct venue insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  created := public.create_hangout_venue('Our public playground', '🌳', 'park', 37.75, -122.42);
  assert created.name = 'Our public playground', 'a signed-in parent can create a validated place';
  assert not created.default_hangout, 'a parent-created place is not globally auto-enabled';
  assert created.geofence_radius_m = 80, 'the safe geofence radius stays server-controlled';

  begin
    perform public.create_hangout_venue('Bad coordinates', null, 'park', 1000, -122.42);
    raise exception 'invalid location unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Invalid hangout location';
  end;
end;
$$;

reset role;
rollback;
