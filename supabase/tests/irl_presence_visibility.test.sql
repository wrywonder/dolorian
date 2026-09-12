-- Exercise actual API-role RLS, including explicit sharing while automation is off.
begin;
insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials, visibility_mode)
values
  ('85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000011', 'IRL Owner', 'peach', 'IO', 'disabled'),
  ('85000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000012', 'IRL Friend', 'sage', 'IF', 'disabled'),
  ('85000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000013', 'IRL Stranger', 'golden', 'IS', 'disabled');
insert into public.venues (id, name, lat, lng, venue_type)
values ('85000000-0000-4000-8000-000000000021', 'IRL test park', 37.75, -122.42, 'park');

set local role authenticated;
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
select public.request_connection('85000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
select public.respond_connection('85000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
insert into public.parent_locations (parent_id, venue_id, visible, expires_at)
values ('85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000021', true, now() + interval '2 hours');

do $$
begin
  assert (select visibility_mode from public.parents where id = '85000000-0000-4000-8000-000000000001') = 'disabled',
    'an explicit visit must not enable automatic sharing';
end;
$$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
do $$ begin
  assert exists(select 1 from public.parent_locations where parent_id = '85000000-0000-4000-8000-000000000001'),
    'a connected parent can see an explicitly shared active visit';
end; $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000013', true);
do $$ begin
  assert not exists(select 1 from public.parent_locations where parent_id = '85000000-0000-4000-8000-000000000001'),
    'a stranger cannot see a shared visit';
end; $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
update public.parent_locations set visible = false, auto_share_at = now() + interval '5 minutes'
where parent_id = '85000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
do $$ begin
  assert not exists(select 1 from public.parent_locations where parent_id = '85000000-0000-4000-8000-000000000001'),
    'a pending auto visit remains private during its warning period';
end; $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
update public.parent_locations set visible = true, auto_share_at = null, expires_at = now() - interval '1 second'
where parent_id = '85000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
do $$ begin
  assert not exists(select 1 from public.parent_locations where parent_id = '85000000-0000-4000-8000-000000000001'),
    'expired locations stay private even when their visible flag is true';
end; $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
update public.parent_locations set visible = true, expires_at = now() + interval '2 hours'
where parent_id = '85000000-0000-4000-8000-000000000001';
select public.set_connection_preferences('85000000-0000-4000-8000-000000000002', false, false, false, null);
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
do $$ begin
  assert not exists(select 1 from public.parent_locations where parent_id = '85000000-0000-4000-8000-000000000001'),
    'per-connection hiding still applies to manual visits';
end; $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
select public.set_connection_preferences('85000000-0000-4000-8000-000000000002', false, false, true, null);
select public.block_parent('85000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
do $$ begin
  assert not exists(select 1 from public.parent_locations where parent_id = '85000000-0000-4000-8000-000000000001'),
    'blocking immediately removes access to an active manual visit';
end; $$;
reset role;
rollback;
