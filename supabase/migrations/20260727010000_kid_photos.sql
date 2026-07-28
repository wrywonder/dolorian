-- Optional profile photos for kids. Image objects use the existing
-- profile-images bucket under <parent_id>/kids/<kid-key>/..., whose storage
-- policies already limit writes to the owning parent.

alter table public.kids
  add column avatar_url text;
