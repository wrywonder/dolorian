-- Optional full-bleed cover images for parent profiles. Objects live in the
-- existing profile-images bucket under <parent_id>/covers/..., so the bucket's
-- owner-scoped write policies and public read policy already apply.

alter table public.parents
  add column profile_background_url text;
