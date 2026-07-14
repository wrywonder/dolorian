-- Let users delete their own post images. Uploads are keyed as
-- <parent_id>/<timestamp>.<ext>, so ownership = first path segment.

create policy storage_post_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = public.current_parent_id()::text
  );
