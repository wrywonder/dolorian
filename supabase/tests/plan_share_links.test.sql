-- Real API roles; no user data or network. All fixtures roll back.
begin;
insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials) values
('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000011','Host Alex','peach','HA'),
('93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000012','Friend Blair','sage','FB'),
('93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000013','New Casey','golden','NC'),
('93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000014','Blocked Drew','slate','BD');
insert into public.connections (parent_a,parent_b,status,initiated_by) values
('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','connected','93000000-0000-4000-8000-000000000001');
insert into public.activities (id,name,created_by,published,visibility,location_address,source,plan_kind,schedule_kind,schedule_days,schedule_timezone) values
('93000000-0000-4000-8000-000000000101','SECRET house gathering','93000000-0000-4000-8000-000000000001',true,'connections','SECRET address','user_created','gathering','once','{}','America/Los_Angeles'),
('93000000-0000-4000-8000-000000000102','SECRET birthday','93000000-0000-4000-8000-000000000001',true,'invited','SECRET park','user_created','gathering','once','{}','America/Los_Angeles');
create temporary table share_links (kind text primary key, token text, id uuid);
grant all on share_links to authenticated, anon;
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000011',true);
insert into share_links select 'connections', token::text,id from public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000101');
insert into share_links select 'invited', token::text,id from public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000102');
insert into share_links select 'ordinary', token::text,id from public.get_or_create_connection_invite();
do $$ begin
  assert (public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000101')).id = (select id from share_links where kind='connections'), 'Repeated sharing must reuse the active link';
  assert (public.get_or_create_connection_invite()).plan_id is null, 'General connection links must never become plan invitations';
  assert (public.preview_connection_invite((select token from share_links where kind='connections')) #>> '{plan,can_view}')::boolean, 'Owner opens their own plan';
end $$;

-- Anonymous and incomplete accounts see only the existing inviter preview.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare preview jsonb; begin
  preview := public.preview_connection_invite((select token from share_links where kind='connections'));
  assert (preview->>'found')::boolean and not (preview #>> '{plan,can_view}')::boolean;
  assert preview::text not like '%SECRET%', 'Private plan facts must not appear in link previews';
  assert not has_function_privilege('anon','public.get_or_create_plan_invite(uuid)','execute');
  assert not has_function_privilege('anon','public.redeem_connection_invite(text)','execute');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000099',true);
do $$ begin
  assert (public.preview_connection_invite((select token from share_links where kind='connections'))->>'needs_profile')::boolean;
end $$;

-- Connected people go directly to visible plans, but a private audience is explicit.
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000012',true);
do $$ declare preview jsonb; begin
  preview := public.preview_connection_invite((select token from share_links where kind='connections'));
  assert (preview #>> '{plan,can_view}')::boolean;
  assert exists(select 1 from public.activities where id='93000000-0000-4000-8000-000000000101');
  begin
    perform public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000101');
    raise exception 'Non-owner minted a connection invite for the owner';
  exception when others then assert sqlerrm = 'Only the person who shared this plan can invite more friends'; end;
  preview := public.preview_connection_invite((select token from share_links where kind='invited'));
  assert not (preview #>> '{plan,can_view}')::boolean;
  assert not exists(select 1 from public.activities where id='93000000-0000-4000-8000-000000000102');
  perform public.redeem_connection_invite((select token from share_links where kind='invited'));
  assert public.can_view_plan('93000000-0000-4000-8000-000000000102'), 'Accepting the host link grants only that plan invitation';
end $$;

-- A new friend must consent before connection-scoped details become visible.
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000013',true);
do $$ declare preview jsonb; begin
  preview := public.preview_connection_invite((select token from share_links where kind='connections'));
  assert not (preview->>'already_connected')::boolean and not (preview #>> '{plan,can_view}')::boolean;
  assert not exists(select 1 from public.activities where id='93000000-0000-4000-8000-000000000101');
  perform public.redeem_connection_invite((select token from share_links where kind='connections'));
  assert public.are_connected('93000000-0000-4000-8000-000000000001',public.current_parent_id());
  assert public.can_view_plan('93000000-0000-4000-8000-000000000101');
  assert not public.can_view_plan('93000000-0000-4000-8000-000000000102'), 'Connecting must not grant unrelated private plans';
  perform public.redeem_connection_invite((select token from share_links where kind='connections'));
end $$;
reset role;
do $$ begin
  assert (select use_count=1 from public.connection_invites where id=(select id from share_links where kind='connections')), 'Retries must not consume additional uses';
end $$;

-- Removing a guest and tightening privacy invalidate old bearer links.
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000011',true);
select public.update_plan_v3(
  '93000000-0000-4000-8000-000000000102','SECRET birthday',null,null,null,null,false,
  'invited','gathering','once','{}'::smallint[],'America/Los_Angeles',
  array['93000000-0000-4000-8000-000000000003'::uuid]
);
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000012',true);
do $$ begin
  assert not public.can_view_plan('93000000-0000-4000-8000-000000000102');
  assert not (public.preview_connection_invite((select token from share_links where kind='invited'))->>'active')::boolean;
  begin
    perform public.redeem_connection_invite((select token from share_links where kind='invited'));
    raise exception 'Removed guest re-added themselves';
  exception when others then assert sqlerrm = 'This invite is no longer active'; end;
end $$;
reset role;
update public.activities set visibility='invited' where id='93000000-0000-4000-8000-000000000101';
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000013',true);
do $$ begin
  assert not public.can_view_plan('93000000-0000-4000-8000-000000000101');
  assert not (public.preview_connection_invite((select token from share_links where kind='connections'))->>'active')::boolean;
end $$;

-- Fresh links, explicit revocation, expiry, capacity and blocked recipients.
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000011',true);
insert into share_links select 'fresh',token::text,id from public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000101');
select public.block_parent('93000000-0000-4000-8000-000000000004');
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000014',true);
do $$ begin
  assert not (public.preview_connection_invite((select token from share_links where kind='fresh'))->>'found')::boolean;
  begin
    perform public.redeem_connection_invite((select token from share_links where kind='fresh'));
    raise exception 'Blocked guest accepted';
  exception when others then assert sqlerrm = 'This connection is unavailable'; end;
end $$;
reset role;
update public.connection_invites set expires_at=now()-interval '1 second' where id=(select id from share_links where kind='fresh');
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000013',true);
do $$ begin
  assert not (public.preview_connection_invite((select token from share_links where kind='fresh'))->>'active')::boolean;
  begin perform public.redeem_connection_invite((select token from share_links where kind='fresh')); raise exception 'Expired accepted';
  exception when others then assert sqlerrm='This invite is no longer active'; end;
end $$;
reset role;
update public.connection_invites set expires_at=now()+interval '1 day',use_count=max_uses where id=(select id from share_links where kind='fresh');
set local role authenticated;
do $$ begin
  begin perform public.redeem_connection_invite((select token from share_links where kind='fresh')); raise exception 'Full accepted';
  exception when others then assert sqlerrm='This invite is no longer active'; end;
end $$;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000011',true);
insert into share_links select 'revokable',token::text,id from public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000101');
select public.revoke_connection_invite((select id from share_links where kind='revokable'));
reset role;
update public.activities set cancelled_at=now() where id='93000000-0000-4000-8000-000000000101';
set local role authenticated;
do $$ begin
  begin perform public.get_or_create_plan_invite('93000000-0000-4000-8000-000000000101'); raise exception 'Cancelled shared';
  exception when others then assert sqlerrm='This plan is no longer available'; end;
end $$;
reset role;
delete from public.activities where id='93000000-0000-4000-8000-000000000101';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  assert not (public.preview_connection_invite((select token from share_links where kind='fresh'))->>'found')::boolean, 'Deleted plan tokens cannot become general connection invites';
end $$;
rollback;
