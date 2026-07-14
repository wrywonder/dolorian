-- Reactions + comments on posts.
--
-- "Likes" are modeled as reactions: the post's author picks which emoji
-- reactions on their post use (posts.reaction_emoji, default ❤️), and
-- each reaction row snapshots the emoji it was made with. That leaves
-- room for custom emoji later (the columns are text — a future custom
-- emoji can be a storage path or shortcode without a schema change) and
-- for multi-emoji reactions (drop the unique constraint's emoji-agnostic
-- shape then).

-- ─────── posts: author-chosen reaction emoji ───────

alter table posts add column reaction_emoji text;

-- ─────── reactions ───────

create table post_reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  parent_id uuid not null references parents(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  -- one reaction per parent per post (re-reacting swaps the emoji)
  constraint post_reactions_unique unique (post_id, parent_id)
);
create index post_reactions_post_idx on post_reactions (post_id);

-- ─────── comments ───────

create table post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references parents(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on post_comments (post_id, created_at);

-- ─────── RLS: visible wherever the post is visible ───────

-- helper: can the caller see this post? Mirrors posts' select policy.
create or replace function public.can_see_post(p_post uuid) returns boolean
  language sql stable as $$
  select exists(
    select 1 from posts p
    where p.id = p_post
      and (
        p.author_id = current_parent_id()
        or are_connected(p.author_id, current_parent_id())
      )
  );
$$;

alter table post_reactions enable row level security;

create policy reactions_select_via_post on post_reactions
  for select using (can_see_post(post_id));

create policy reactions_write_own on post_reactions
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id() and can_see_post(post_id));

alter table post_comments enable row level security;

create policy comments_select_via_post on post_comments
  for select using (can_see_post(post_id));

create policy comments_insert_own on post_comments
  for insert with check (author_id = current_parent_id() and can_see_post(post_id));

create policy comments_delete_own on post_comments
  for delete using (author_id = current_parent_id());
