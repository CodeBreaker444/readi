
ALTER TABLE public.pilot_mission
  ADD COLUMN IF NOT EXISTS dflight_flight_clearance_status VARCHAR(50);
