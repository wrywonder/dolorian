-- Expiring presence is part of the visibility boundary, not just a UI filter.
-- Existing visible rows without an expiry are stale by definition.
update parent_locations
set visible = false,
    expires_at = coalesce(expires_at, now())
where visible
  and (expires_at is null or expires_at <= now());

drop policy if exists locations_select_self_or_visible_connections on parent_locations;

create policy locations_select_self_or_visible_connections on parent_locations
  for select using (
    parent_id = current_parent_id()
    or (
      visible
      and expires_at > now()
      and are_connected(parent_id, current_parent_id())
    )
  );
