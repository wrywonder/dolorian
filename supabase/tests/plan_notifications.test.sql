-- Real roles, connection graph, preference changes, and delivery leases.
begin;
insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
select ('88000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  ('88000000-0000-4000-8000-' || lpad((n+100)::text,12,'0'))::uuid,
  case n when 1 then 'Alex Host' else 'Friend ' || n end, 'peach', 'QA'
from generate_series(0,6) n;
insert into public.connections (parent_a, parent_b, status, initiated_by)
select least('88000000-0000-4000-8000-000000000001'::uuid,id),
  greatest('88000000-0000-4000-8000-000000000001'::uuid,id),
  case when display_name = 'Friend 4' then 'pending' else 'connected' end,
  '88000000-0000-4000-8000-000000000001'
from public.parents where id::text like '88000000-%' and display_name in ('Friend 0','Friend 2','Friend 3','Friend 4','Friend 5');
insert into public.parent_blocks(blocker_id, blocked_id)
values ('88000000-0000-4000-8000-000000000003','88000000-0000-4000-8000-000000000001');
insert into public.parent_notification_preferences(parent_id,plan_invitations)
values ('88000000-0000-4000-8000-000000000005',false);
create temporary table notification_test_plans(kind text primary key,id uuid);
grant all on notification_test_plans to authenticated, service_role;
set local role authenticated;
select set_config('request.jwt.claim.sub','88000000-0000-4000-8000-000000000101',true);
do $$
declare payload jsonb; v_id uuid; v_kind text;
begin
  foreach v_kind in array array['connections','public','invited'] loop
    payload := public.create_plan_v3('Picnic ' || v_kind,null,'🧺',null,null,false,v_kind,
      'gathering','once','{}'::smallint[],'America/Los_Angeles',
      array['88000000-0000-4000-8000-000000000002'::uuid]);
    v_id := (payload #>> '{plan,id}')::uuid;
    insert into notification_test_plans values(v_kind,v_id);
    if v_kind = 'invited' then
      assert payload->'notified_parent_ids' = '["88000000-0000-4000-8000-000000000002"]'::jsonb,
        'Only a private plan recipient gets an invitation';
    else
      assert jsonb_array_length(payload->'notified_parent_ids') = 2, 'Exactly the two eligible connections';
      assert payload->'notified_parent_ids' @> '["88000000-0000-4000-8000-000000000000","88000000-0000-4000-8000-000000000002"]'::jsonb,
        'Connections on both sides of an edge are notified; blocks, pending, opt-out, stranger and author excluded';
    end if;
    payload := public.update_plan_v3(v_id,'Edited picnic',null,'🧺',null,null,false,v_kind,
      'gathering','once','{}'::smallint[],'America/Los_Angeles',
      array['88000000-0000-4000-8000-000000000002'::uuid]);
    assert jsonb_array_length(payload->'notified_parent_ids') = 0,'Edits never repeat the broadcast';
  end loop;
  -- Clients cannot claim notifications while impersonating another parent.
  begin
    perform public.claim_connection_notification(public.current_parent_id(),
      '88000000-0000-4000-8000-000000000002','plan_invite');
    raise exception 'Authenticated caller unexpectedly claimed delivery';
  exception when insufficient_privilege then null; end;
end $$;

-- A plan in the reverse direction notifies its creator's connections too.
select set_config('request.jwt.claim.sub','88000000-0000-4000-8000-000000000102',true);
do $$
declare payload jsonb;
begin
  payload := public.create_plan_v3('Soccer signup',null,'⚽',null,null,false,'connections',
    'signup','once','{}'::smallint[],'America/Los_Angeles');
  assert payload->'notified_parent_ids' = '["88000000-0000-4000-8000-000000000001"]'::jsonb, 'Notifications work in both directions and for signups';
  assert (select count(*) from public.connection_notifications where notification_type='plan_invite') = 3, 'Recipient can read their three plan notifications';
  assert exists(select 1 from public.connection_notifications where body = 'Alex shared Picnic connections. Want to join?' and title='A plan with friends ✨'), 'Copy names who shared which plan';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.connection_notifications where actor_id='88000000-0000-4000-8000-000000000001' and notification_type='plan_invite')=5, 'One notification per recipient per creation, no edit spam';
end $$;

set local role service_role;
do $$
declare target uuid := (select id from notification_test_plans where kind='connections'); row public.connection_notifications;
begin
  select * into row from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite',target);
  assert row.url='/plan/'||target::text, 'Delivery claims exactly the requested plan even when newer plans exist';
  assert row.push_claimed_at is not null, 'Claim is leased atomically';
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite',target)), 'A second request cannot claim a live lease';
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000003','88000000-0000-4000-8000-000000000002','plan_invite',target)), 'Another actor cannot claim the notification';
  update public.connection_notifications set push_claimed_at=now()-interval '2 minutes' where id=row.id;
  assert exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite',target)), 'A crashed delivery can be retried';
  update public.connection_notifications set push_sent_at=now(),push_claimed_at=null where id=row.id;
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite',target)), 'A sent notification cannot be delivered twice';
  -- Older clients omit a plan ID; their private invitation still works.
  assert exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite')), 'Older request shape remains supported';
end $$;
reset role;
-- All subsequent tests remove leases to isolate each eligibility condition.
update public.connection_notifications set push_claimed_at=null,push_sent_at=null;
update public.activities set visibility='invited' where id=(select id from notification_test_plans where kind='connections');
set local role authenticated;
select set_config('request.jwt.claim.sub','88000000-0000-4000-8000-000000000102',true);
do $$ begin
  assert not exists(select 1 from public.connection_notifications where url='/plan/'||(select id::text from notification_test_plans where kind='connections')), 'Foreground fallback hides a plan after audience changes';
end $$;
set local role service_role;
do $$ begin
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite',(select id from notification_test_plans where kind='connections'))), 'Remote delivery also checks the current audience';
end $$;
reset role;
update public.activities set cancelled_at=now() where id=(select id from notification_test_plans where kind='public');
delete from public.plan_invites where plan_id=(select id from notification_test_plans where kind='invited');
set local role authenticated;
do $$ begin
  assert not exists(select 1 from public.connection_notifications where notification_type='plan_invite'), 'Cancelled plans and removed private invitations are hidden';
end $$;
set local role service_role;
do $$ begin
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite')), 'Nothing inaccessible can be pushed';
end $$;
reset role;
update public.activities set cancelled_at=null where id=(select id from notification_test_plans where kind='public');
insert into public.parent_notification_preferences(parent_id,plan_invitations)
values ('88000000-0000-4000-8000-000000000002',false);
set local role authenticated;
do $$ begin
  assert not exists(select 1 from public.connection_notifications where notification_type='plan_invite'), 'Opting out hides pending foreground alerts';
end $$;
set local role service_role;
do $$ begin
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite')), 'Opting out suppresses queued remote alerts too';
end $$;
reset role;
update public.parent_notification_preferences set plan_invitations=true where parent_id='88000000-0000-4000-8000-000000000002';
insert into public.parent_blocks(blocker_id,blocked_id)
values ('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002');
set local role service_role;
do $$ begin
  assert not exists(select 1 from public.claim_connection_notification('88000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','plan_invite')), 'A block after creation prevents push';
end $$;
set local role authenticated;
do $$ begin
  assert not exists(select 1 from public.connection_notifications where notification_type='plan_invite'), 'A block after creation prevents foreground alerts';
end $$;
rollback;
