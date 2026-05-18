-- Phase 2 · Dolorian initial schema
-- Mirrors src/types/. Run order matters — references go top-to-bottom.

create extension if not exists "uuid-ossp";

-- ─────── Identity & social graph ───────

create table parents (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique,
  display_name text not null,
  neighborhood text,
  avatar_color text not null,
  avatar_initials text not null check (char_length(avatar_initials) between 1 and 3),
  -- phone is encrypted at rest via pgsodium / vault in production
  phone_e164 text,
  calendar_connected_at timestamptz,
  calendar_provider text check (calendar_provider in ('apple','google')),
  created_at timestamptz not null default now()
);
create index parents_auth_user_id_idx on parents (auth_user_id);

create table kids (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parents(id) on delete cascade,
  name text not null,
  birth_year int not null,
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index kids_parent_id_idx on kids (parent_id);

create table connections (
  id uuid primary key default uuid_generate_v4(),
  parent_a uuid not null references parents(id) on delete cascade,
  parent_b uuid not null references parents(id) on delete cascade,
  status text not null check (status in ('pending','connected','declined','blocked')),
  initiated_by uuid not null references parents(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  -- unique on the unordered pair so we never have two rows for one friendship
  constraint connections_unique_pair unique (parent_a, parent_b),
  constraint connections_distinct check (parent_a <> parent_b),
  -- enforce canonical ordering so (a,b) and (b,a) collapse
  constraint connections_canonical_order check (parent_a < parent_b)
);
create index connections_pair_idx on connections (parent_a, parent_b);
create index connections_status_idx on connections (status);

-- ─────── Venues & location ───────

create table venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text,
  lat double precision not null,
  lng double precision not null,
  geofence_radius_m int not null default 80,
  venue_type text not null check (venue_type in (
    'park','playground','studio','swim','library','cafe','school','other'
  ))
);

create table parent_locations (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null unique references parents(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  visible boolean not null default true,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz
);
create index parent_locations_venue_idx on parent_locations (venue_id) where visible;

-- ─────── Activities & engagement ───────

create table activities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text,
  description text,
  venue_id uuid references venues(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  source text not null check (source in (
    'admin','user_created','ai_discovered',
    'calendar_imported','participant_added'
  )),
  source_metadata jsonb not null default '{}'::jsonb,
  confidence_score real,
  created_by uuid references parents(id) on delete set null,
  -- AI-discovered + calendar-imported items start unpublished until the user confirms
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index activities_starts_at_idx on activities (starts_at) where published;
create index activities_source_idx on activities (source) where not published;

create table activity_interactions (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parents(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  state text not null check (state in ('saved','interested','going','attended','skipped')),
  state_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint activity_interactions_unique_pair unique (parent_id, activity_id)
);
create index activity_interactions_activity_idx on activity_interactions (activity_id);
create index activity_interactions_parent_idx on activity_interactions (parent_id);
-- ☝️ Plans tab queries this to compute "X interested + Y going" stacks per activity.

-- ─────── Stories (architecture-only for now) ───────
-- Declared early so posts.story_id can reference it.

create table stories (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parents(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  title text,
  ai_generated_summary text,
  cover_post_id uuid, -- FK added after posts table exists, below
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────── Content ───────

create table posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references parents(id) on delete cascade,
  type text not null check (type in ('photo','question','text')),
  body text,
  media_path text,
  activity_id uuid references activities(id) on delete set null,
  story_id uuid references stories(id) on delete set null,
  location_share_mode text not null default 'none'
    check (location_share_mode in ('none','30min','until_leave')),
  venue_id uuid references venues(id) on delete set null,
  created_at timestamptz not null default now()
);
create index posts_author_id_idx on posts (author_id, created_at desc);
create index posts_activity_id_idx on posts (activity_id);
create index posts_story_id_idx on posts (story_id);

-- Now wire the deferred FK on stories.cover_post_id
alter table stories
  add constraint stories_cover_post_fk
  foreign key (cover_post_id) references posts(id) on delete set null;

create table story_moments (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references stories(id) on delete cascade,
  ordinal int not null,
  post_id uuid references posts(id) on delete cascade,
  activity_interaction_id uuid references activity_interactions(id) on delete cascade,
  location_event_id uuid,
  -- polymorphic reference: exactly one of the three must be set
  constraint story_moments_one_target check (
    (case when post_id is not null then 1 else 0 end)
    + (case when activity_interaction_id is not null then 1 else 0 end)
    + (case when location_event_id is not null then 1 else 0 end)
    = 1
  ),
  unique (story_id, ordinal)
);

-- ─────── Prompts engine (generalized nudge system) ───────

create table prompts (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parents(id) on delete cascade,
  prompt_type text not null check (prompt_type in (
    'share_after_activity',
    'rsvp_from_friend_signal',
    'confirm_calendar_import',
    'finalize_weekend_story'
  )),
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending'
    check (state in ('pending','shown','acted','dismissed','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index prompts_pending_idx on prompts (parent_id, created_at desc)
  where state = 'pending';

-- ─────── Calendar import (P0) ───────
-- Privacy: raw event description/notes are NOT stored. After Claude extracts
-- structured fields in the parse-calendar Edge Function, only the minimal
-- raw_title (for dedup) plus the FK to the created activity persists.

create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parents(id) on delete cascade,
  source_event_id text not null,
  raw_title text not null,
  parsed_at timestamptz not null default now(),
  extracted_activity_id uuid references activities(id) on delete set null,
  user_confirmed boolean,
  constraint calendar_events_unique_source unique (parent_id, source_event_id)
);
