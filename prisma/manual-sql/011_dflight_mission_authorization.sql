
ALTER TABLE public.pilot_mission
  ADD COLUMN IF NOT EXISTS dflight_mission_id                 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dflight_tech_version                VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dflight_mission_status              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dflight_flight_authorisation_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dflight_watch_active                BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dflight_last_status_at              TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_pilot_mission_dflight_mission_id
  ON public.pilot_mission (dflight_mission_id);
