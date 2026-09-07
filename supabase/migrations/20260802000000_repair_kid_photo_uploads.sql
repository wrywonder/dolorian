-- Ensure the live project accepts kid-photo uploads. Older environments may
-- predate the optional kids.avatar_url field or the profile-image insert rule.

alter table public.kids
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

drop policy if exists storage_profile_images_insert_own on storage.objects;
create policy storage_profile_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.current_parent_id()::text
  );
