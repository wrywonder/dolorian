-- Exercise RLS as authenticated, not as the database owner (who bypasses it).
begin;

insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values
  ('85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000011', 'Host', 'peach', 'H'),
  ('85000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000012', 'Participant', 'sage', 'P'),
  ('85000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000013', 'Public viewer', 'golden', 'PV'),
  ('85000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000014', 'Friend', 'sage', 'F');

insert into public.connections (parent_a, parent_b, status, initiated_by)
values ('85000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000004', 'connected', '85000000-0000-4000-8000-000000000002');

insert into public.activities (id, name, starts_at, source, created_by, published, visibility)
values ('85000000-0000-4000-8000-000000000021', 'Public art class', now() + interval '1 day', 'user_created', '85000000-0000-4000-8000-000000000001', true, 'public');

insert into public.activity_interactions (parent_id, activity_id, state, rsvp_note)
values ('85000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000021', 'going', 'Child name and pickup details');

set local role authenticated;
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000013', true);
do $$ begin
  assert public.can_view_plan('85000000-0000-4000-8000-000000000021'), 'Public plan remains visible';
  assert not exists (
    select 1 from public.activity_interactions where activity_id = '85000000-0000-4000-8000-000000000021'
  ), 'Public viewers must not bypass note redaction through direct table reads';
  assert exists (
    select 1 from public.plan_participants(array['85000000-0000-4000-8000-000000000021'::uuid])
    where display_name = 'Participant' and state = 'going' and rsvp_note is null
  ), 'Public viewer still sees the redacted attendee list';
end $$;

-- Sending a request is not consent from the recipient. Profile discovery may
-- open after a request, but family RSVP details must remain private both ways.
select public.request_connection('85000000-0000-4000-8000-000000000002');
do $$ begin
  assert public.has_connection_edge('85000000-0000-4000-8000-000000000002', public.current_parent_id()), 'Pending request exists';
  assert not public.are_connected('85000000-0000-4000-8000-000000000002', public.current_parent_id()), 'Pending request is not an accepted connection';
  assert not exists (
    select 1 from public.activity_interactions where activity_id = '85000000-0000-4000-8000-000000000021'
  ), 'Request sender must not gain direct access to participant notes';
  assert exists (
    select 1 from public.plan_participants(array['85000000-0000-4000-8000-000000000021'::uuid])
    where display_name = 'Participant' and profile_visible and rsvp_note is null
  ), 'Pending profile access must not expose a note through the RPC';
end $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000012', true);
do $$ begin
  assert exists (select 1 from public.activity_interactions where rsvp_note = 'Child name and pickup details'), 'Participant can read their own note';
  perform public.set_plan_rsvp('85000000-0000-4000-8000-000000000021', 'interested');
  assert exists (select 1 from public.activity_interactions where state = 'interested' and rsvp_note = 'Child name and pickup details'), 'RSVP change preserves own note';
end $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000011', true);
do $$ begin
  assert exists (select 1 from public.activity_interactions where rsvp_note = 'Child name and pickup details'), 'Host can read participant details';
end $$;

select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000014', true);
do $$ begin
  assert exists (select 1 from public.activity_interactions where rsvp_note = 'Child name and pickup details'), 'Connected friend can read note';
  perform public.block_parent('85000000-0000-4000-8000-000000000002');
  assert not exists (select 1 from public.activity_interactions where activity_id = '85000000-0000-4000-8000-000000000021'), 'Block hides direct participant details';
  assert not exists (select 1 from public.plan_participants(array['85000000-0000-4000-8000-000000000021'::uuid])), 'Block hides RPC participant details';
end $$;

reset role;
rollback;
