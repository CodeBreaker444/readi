 
ALTER TABLE public.pilot_mission
  ADD COLUMN IF NOT EXISTS dflight_trajectory_data JSONB;
