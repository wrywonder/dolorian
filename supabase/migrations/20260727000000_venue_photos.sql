-- Venue imagery and a safe write path for user-created hangout spots.

alter table public.venues
  add column google_place_id text,
  add column image_url text,
  add column image_source text,
  add column image_attribution text,
  add column image_attribution_url text;

create index venues_google_place_id_idx
  on public.venues (google_place_id)
  where google_place_id is not null;

alter table public.venues
  add constraint venues_image_source_check
  check (image_source is null or image_source in ('wikimedia', 'openverse', 'venue_upload'));

-- A verified, openly licensed photo of Mission Dolores Park for the starter
-- playground. The credit is shown wherever this image is rendered.
update public.venues
set image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/DoloresParkSunnyDay.jpg/1280px-DoloresParkSunnyDay.jpg',
    image_source = 'wikimedia',
    image_attribution = 'Tim Bartel · CC BY-SA 2.0',
    image_attribution_url = 'https://commons.wikimedia.org/wiki/File:DoloresParkSunnyDay.jpg'
where lower(name) = lower('Helen Diller Playground at Dolores Park');

-- Venues are a public directory but intentionally have no direct INSERT policy.
-- This function validates the small set of fields a signed-in parent may create
-- and avoids granting broad venue-table writes through RLS.
create or replace function public.create_hangout_venue(
  venue_name text,
  venue_emoji text,
  venue_type text,
  venue_lat double precision,
  venue_lng double precision
) returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  created public.venues;
begin
  me := public.current_parent_id();
  if me is null then
    raise exception 'Not authenticated';
  end if;

  venue_name := btrim(venue_name);
  if char_length(venue_name) < 2 or char_length(venue_name) > 100 then
    raise exception 'Hangout names must be between 2 and 100 characters';
  end if;
  if venue_emoji is not null and char_length(venue_emoji) > 12 then
    raise exception 'Invalid hangout emoji';
  end if;
  if venue_type not in ('park','playground','studio','swim','library','cafe','school','other') then
    raise exception 'Invalid hangout type';
  end if;
  if venue_lat < -90 or venue_lat > 90 or venue_lng < -180 or venue_lng > 180 then
    raise exception 'Invalid hangout location';
  end if;

  insert into public.venues (name, emoji, venue_type, lat, lng)
  values (venue_name, venue_emoji, venue_type, venue_lat, venue_lng)
  returning * into created;

  return created;
end;
$$;

revoke all on function public.create_hangout_venue(text, text, text, double precision, double precision) from public;
grant execute on function public.create_hangout_venue(text, text, text, double precision, double precision) to authenticated;
