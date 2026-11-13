
-- Slot group: the client the slots are flown for, and when pilots get to see the group.
ALTER TABLE public.slot_group ADD COLUMN IF NOT EXISTS fk_client_id INTEGER REFERENCES public.client(client_id) ON DELETE SET NULL;
-- NULL = visible to pilots immediately. A future value hides the group from pilots until then.
ALTER TABLE public.slot_group ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP(6);
-- Set once the "group is now open" notification went out (scheduled groups only).
ALTER TABLE public.slot_group ADD COLUMN IF NOT EXISTS published_notified_at TIMESTAMP(6);
CREATE INDEX IF NOT EXISTS idx_slot_group_client ON public.slot_group (fk_client_id);
CREATE INDEX IF NOT EXISTS idx_slot_group_publish ON public.slot_group (publish_at) WHERE publish_at IS NOT NULL;

-- Which pilot groups a slot group is offered to. No rows = offered to every pilot.
CREATE TABLE IF NOT EXISTS public.slot_group_pilot_group (
  fk_slot_group_id  INTEGER NOT NULL REFERENCES public.slot_group(slot_group_id) ON DELETE CASCADE,
  fk_pilot_group_id INTEGER NOT NULL REFERENCES public.pilot_group(pilot_group_id) ON DELETE CASCADE,
  PRIMARY KEY (fk_slot_group_id, fk_pilot_group_id)
);
CREATE INDEX IF NOT EXISTS idx_slot_group_pilot_group_pg ON public.slot_group_pilot_group (fk_pilot_group_id);
ALTER TABLE public.slot_group_pilot_group ENABLE ROW LEVEL SECURITY;

-- Company settings: pilots cannot cancel/move requests this many hours before the approval day (0 = never locked);
-- base location used for the 7-day slot weather.
ALTER TABLE public.slot_settings ADD COLUMN IF NOT EXISTS modify_lock_hours SMALLINT NOT NULL DEFAULT 24;
ALTER TABLE public.slot_settings ADD COLUMN IF NOT EXISTS base_latitude DOUBLE PRECISION;
ALTER TABLE public.slot_settings ADD COLUMN IF NOT EXISTS base_longitude DOUBLE PRECISION;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slot_settings_lock_hours') THEN
    ALTER TABLE public.slot_settings ADD CONSTRAINT chk_slot_settings_lock_hours CHECK (modify_lock_hours IN (0, 24, 48));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slot_settings_lat') THEN
    ALTER TABLE public.slot_settings ADD CONSTRAINT chk_slot_settings_lat CHECK (base_latitude IS NULL OR base_latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slot_settings_lon') THEN
    ALTER TABLE public.slot_settings ADD CONSTRAINT chk_slot_settings_lon CHECK (base_longitude IS NULL OR base_longitude BETWEEN -180 AND 180);
  END IF;
END $$;

-- Pilot groups marked "expert" are recommended for tough-weather slots.
ALTER TABLE public.pilot_group ADD COLUMN IF NOT EXISTS is_expert BOOLEAN NOT NULL DEFAULT false;
