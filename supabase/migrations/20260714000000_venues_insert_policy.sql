-- Let signed-in parents add venues ("spots") from the IRL tab.
-- Venues stay a public read directory; creation just requires being a
-- parent. No update/delete policies — spots are append-only for now.

create policy venues_insert_parents on venues
  for insert with check (current_parent_id() is not null);
