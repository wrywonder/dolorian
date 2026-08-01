-- Run with `supabase test db` after applying migrations locally.
begin;

insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values
  ('81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000011', 'Test Alex', 'peach', 'TA'),
  ('81000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000012', 'Test Blair', 'sage', 'TB'),
  ('81000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000013', 'Test Casey', 'golden', 'TC');

do $$
declare
  edge public.connections;
  invite public.connection_invites;
begin
  perform set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000011', true);
  edge := public.request_connection('81000000-0000-4000-8000-000000000002');
  assert edge.status = 'pending', 'request should create a pending edge';
  assert edge.initiated_by = '81000000-0000-4000-8000-000000000001', 'requester should be recorded';

  begin
    perform public.respond_connection('81000000-0000-4000-8000-000000000002', true);
    raise exception 'requester was able to accept their own request';
  exception when others then
    assert sqlerrm = 'No incoming request found';
  end;

  perform set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000012', true);
  edge := public.respond_connection('81000000-0000-4000-8000-000000000001', true);
  assert edge.status = 'connected', 'recipient should be able to accept';

  perform public.block_parent('81000000-0000-4000-8000-000000000001');
  assert public.is_blocked_between(
    '81000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000002'
  ), 'block should be directional but enforced both ways';
  assert not exists (
    select 1 from public.connections
    where parent_a = '81000000-0000-4000-8000-000000000001'
      and parent_b = '81000000-0000-4000-8000-000000000002'
  ), 'blocking should remove the connection edge';

  perform set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000011', true);
  begin
    perform public.request_connection('81000000-0000-4000-8000-000000000002');
    raise exception 'blocked parent was able to reconnect';
  exception when others then
    assert sqlerrm = 'This connection is unavailable';
  end;

  perform set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000012', true);
  perform public.unblock_parent('81000000-0000-4000-8000-000000000001');
  assert not public.is_blocked_between(
    '81000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000002'
  ), 'blocker should be able to unblock';

  perform set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000011', true);
  invite := public.create_connection_invite(1);
  perform set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000013', true);
  edge := public.redeem_connection_invite(invite.code);
  assert edge.status = 'connected', 'redeeming an invite should create a mutual connection';
  assert exists (
    select 1 from public.connection_invites where id = invite.id and use_count = 1
  ), 'invite use count should increment once';
end;
$$;

rollback;
