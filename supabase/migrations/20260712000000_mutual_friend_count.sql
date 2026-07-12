-- Mutual friend count between the caller and another parent.
-- RLS only exposes connections rows involving the caller, so a correct
-- mutual count can't be computed client-side — it needs definer rights.

create or replace function public.mutual_friend_count(other uuid) returns int
  language sql stable security definer
  set search_path = public
  as $$
  with mine as (
    select case when parent_a = current_parent_id() then parent_b else parent_a end as fid
    from connections
    where status = 'connected'
      and current_parent_id() in (parent_a, parent_b)
  ),
  theirs as (
    select case when parent_a = other then parent_b else parent_a end as fid
    from connections
    where status = 'connected'
      and other in (parent_a, parent_b)
  )
  select count(*)::int from mine join theirs using (fid);
$$;
