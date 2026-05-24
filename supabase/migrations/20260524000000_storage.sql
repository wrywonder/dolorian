-- Post image storage bucket + policies

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy storage_post_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images');

create policy storage_post_images_select on storage.objects
  for select to authenticated
  using (bucket_id = 'post-images');

create policy storage_post_images_public_select on storage.objects
  for select to anon
  using (bucket_id = 'post-images');
