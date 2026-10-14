
ALTER TABLE public.pilot_mission
  ADD COLUMN IF NOT EXISTS dflight_skip_authorization BOOLEAN NOT NULL DEFAULT false;
