-- Hangout-based presence, richer parent profiles, and connection management.

alter table parents
  add column avatar_url text,
  add column bio text,
  add column profile_background text not null default 'peach'
    check (profile_background in ('peach','golden','sage','mauve','slate','rose','butter')),
  add column visibility_mode text not null default 'auto'
    check (visibility_mode in ('on','auto','disabled'));

alter table venues
  add column default_hangout boolean not null default false;

alter table parent_locations
  add column auto_share_at timestamptz;

create table parent_hangout_spots (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint parent_hangout_spots_unique unique (parent_id, venue_id)
);
create index parent_hangout_spots_parent_idx on parent_hangout_spots (parent_id);
create index parent_hangout_spots_venue_idx on parent_hangout_spots (venue_id) where enabled;

alter table parent_hangout_spots enable row level security;

create policy hangout_spots_select_self_or_connected on parent_hangout_spots
  for select using (
    parent_id = current_parent_id()
    or are_connected(parent_id, current_parent_id())
  );

create policy hangout_spots_write_own on parent_hangout_spots
  for all using (parent_id = current_parent_id())
  with check (parent_id = current_parent_id());

-- Pending auto shares become readable after the five-minute grace period.
drop policy if exists locations_select_self_or_visible_connections on parent_locations;
create policy locations_select_self_or_visible_connections on parent_locations
  for select using (
    parent_id = current_parent_id()
    or (
      (visible or (auto_share_at is not null and auto_share_at <= now()))
      and expires_at is not null
      and expires_at > now()
      and are_connected(parent_id, current_parent_id())
    )
  );

-- People need to be visible to the recipient while a request is pending.
create or replace function public.has_connection_edge(a uuid, b uuid) returns boolean
  language sql stable security definer
  set search_path = public
  as $$
    select exists(
      select 1 from connections
      where parent_a = least(a,b)
        and parent_b = greatest(a,b)
        and status <> 'blocked'
    );
  $$;

drop policy if exists parents_select_self_or_connected on parents;
create policy parents_select_self_or_connected on parents
  for select using (
    id = current_parent_id()
    or are_connected(id, current_parent_id())
    or has_connection_edge(id, current_parent_id())
  );

create policy connections_delete_either_party on connections
  for delete using (
    parent_a = current_parent_id() or parent_b = current_parent_id()
  );

-- Three shared starter spots. Default spots are implicitly enabled for every
-- parent unless that parent creates a disabled override row.
insert into venues (name, emoji, lat, lng, geofence_radius_m, venue_type, default_hangout)
select 'Upper Noe Park', '🌳', 37.74243, -122.42781, 120, 'park', true
where not exists (select 1 from venues where lower(name) = lower('Upper Noe Park'));

insert into venues (name, emoji, lat, lng, geofence_radius_m, venue_type, default_hangout)
select 'Helen Diller Playground at Dolores Park', '🛷️', 37.75873, -122.42688, 110, 'playground', true
where not exists (
  select 1 from venues
  where lower(name) in (
    lower('Helen Diller Playground at Dolores Park'),
    lower('Helen Diller Playground')
  )
);

insert into venues (name, emoji, lat, lng, geofence_radius_m, venue_type, default_hangout)
select 'Noe Valley Town Square', '✨', 37.75137, -122.42898, 90, 'park', true
where not exists (select 1 from venues where lower(name) = lower('Noe Valley Town Square'));

update venues set default_hangout = true
where lower(name) in (
  lower('Upper Noe Park'),
  lower('Helen Diller Playground at Dolores Park'),
  lower('Helen Diller Playground'),
  lower('Noe Valley Town Square')
);

update venues
set name = 'Helen Diller Playground at Dolores Park'
where lower(name) = lower('Helen Diller Playground');

-- Public profile photos, stored under <parent_id>/<timestamp>.<ext>.
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

create policy storage_profile_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.current_parent_id()::text
  );

create policy storage_profile_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.current_parent_id()::text
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.current_parent_id()::text
  );

create policy storage_profile_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.current_parent_id()::text
  );

create policy storage_profile_images_public_select on storage.objects
  for select to public
  using (bucket_id = 'profile-images');
