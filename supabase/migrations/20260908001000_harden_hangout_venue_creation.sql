-- User-created places must pass the validated RPC. The earlier INSERT policy
-- survived that RPC's introduction and allowed any parent to forge a globally
-- enabled default hangout, including its geofence radius and image metadata.
drop policy if exists venues_insert_parents on public.venues;
revoke insert on public.venues from anon, authenticated;

-- create_hangout_venue remains SECURITY DEFINER and can insert the validated
-- name/type/coordinates while leaving default_hangout and radius server-owned.
