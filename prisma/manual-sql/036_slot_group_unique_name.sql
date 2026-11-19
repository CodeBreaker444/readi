-- Slot group names are unique per company, ignoring case and surrounding spaces.
-- The API already rejects duplicates; this index also protects against two simultaneous publishes.
--
-- If this fails with "could not create unique index", two groups of one company already share a name.
-- Find them with:
--   SELECT fk_owner_id, lower(btrim(name)) AS n, count(*) FROM public.slot_group GROUP BY 1, 2 HAVING count(*) > 1;
-- then rename or delete the extra groups and run this again.

CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_group_owner_name
  ON public.slot_group (fk_owner_id, lower(btrim(name)));
