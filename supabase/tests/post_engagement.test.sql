-- Exercise the same writes as the native feed under actual authenticated RLS.
begin;

insert into public.parents (id, auth_user_id, display_name, avatar_color, avatar_initials)
values
  ('86000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000011', 'Memory author', 'peach', 'MA'),
  ('86000000-0000-4000-8000-000000000002', '86000000-0000-4000-8000-000000000012', 'Connected friend', 'sage', 'CF'),
  ('86000000-0000-4000-8000-000000000003', '86000000-0000-4000-8000-000000000013', 'Unconnected parent', 'golden', 'UP');

insert into public.connections (parent_a, parent_b, status, initiated_by)
values ('86000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000002', 'connected', '86000000-0000-4000-8000-000000000001');

insert into public.posts (id, author_id, type, body)
values ('86000000-0000-4000-8000-000000000021', '86000000-0000-4000-8000-000000000001', 'text', 'An afternoon at the park');

set local role authenticated;
select set_config('request.jwt.claim.sub', '86000000-0000-4000-8000-000000000012', true);

insert into public.post_reactions (post_id, parent_id, emoji)
values ('86000000-0000-4000-8000-000000000021', public.current_parent_id(), '🦖')
on conflict (post_id, parent_id) do update set emoji = excluded.emoji;

-- Retrying the intended "reacted" state must update the same row, not toggle it.
insert into public.post_reactions (post_id, parent_id, emoji)
values ('86000000-0000-4000-8000-000000000021', public.current_parent_id(), '🦖')
on conflict (post_id, parent_id) do update set emoji = excluded.emoji;

do $$ begin
  assert (select count(*) from public.post_reactions where post_id = '86000000-0000-4000-8000-000000000021') = 1,
    'Repeated authenticated upsert keeps one reaction';
end $$;

delete from public.post_reactions where post_id = '86000000-0000-4000-8000-000000000021' and parent_id = public.current_parent_id();
delete from public.post_reactions where post_id = '86000000-0000-4000-8000-000000000021' and parent_id = public.current_parent_id();

do $$ begin
  assert not exists (select 1 from public.post_reactions where post_id = '86000000-0000-4000-8000-000000000021'),
    'Repeated delete leaves zero reactions';

  insert into public.post_comments (post_id, author_id, body)
  values ('86000000-0000-4000-8000-000000000021', public.current_parent_id(), repeat('🦖', 1000));
  assert exists (select 1 from public.post_comments where char_length(body) = 1000 and octet_length(body) = 4000),
    'Comment limit counts Unicode code points rather than bytes or UTF-16 units';

  begin
    insert into public.post_comments (post_id, author_id, body)
    values ('86000000-0000-4000-8000-000000000021', public.current_parent_id(), repeat('🦖', 1001));
    raise exception 'Oversized comment unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
  assert (select count(*) from public.post_comments where post_id = '86000000-0000-4000-8000-000000000021') = 1,
    'Rejected comment does not persist';
end $$;

select set_config('request.jwt.claim.sub', '86000000-0000-4000-8000-000000000013', true);
do $$ begin
  assert not exists (select 1 from public.posts where id = '86000000-0000-4000-8000-000000000021'), 'Stranger cannot read the memory';
  assert not exists (select 1 from public.post_comments where post_id = '86000000-0000-4000-8000-000000000021'), 'Stranger cannot read its comments';

  begin
    insert into public.post_reactions (post_id, parent_id, emoji)
    values ('86000000-0000-4000-8000-000000000021', public.current_parent_id(), '🦖')
    on conflict (post_id, parent_id) do update set emoji = excluded.emoji;
    raise exception 'Stranger reaction unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.post_comments (post_id, author_id, body)
    values ('86000000-0000-4000-8000-000000000021', public.current_parent_id(), 'An unauthorized comment');
    raise exception 'Stranger comment unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
rollback;
