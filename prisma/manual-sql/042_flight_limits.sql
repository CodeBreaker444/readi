-- Monthly flight limits: the day each flying-hours cycle starts (company setting) and a monthly limit per pilot.
-- Safe to run more than once.
ALTER TABLE public.slot_settings ADD COLUMN IF NOT EXISTS cycle_start_day SMALLINT NOT NULL DEFAULT 1;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slot_settings_cycle_day') THEN
    ALTER TABLE public.slot_settings ADD CONSTRAINT chk_slot_settings_cycle_day CHECK (cycle_start_day BETWEEN 1 AND 28);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pilot_flight_limit (
  fk_owner_id   INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  fk_user_id    INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  monthly_hours NUMERIC(6,1) NOT NULL CHECK (monthly_hours > 0),
  updated_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (fk_owner_id, fk_user_id)
);
CREATE INDEX IF NOT EXISTS idx_pilot_flight_limit_user ON public.pilot_flight_limit (fk_user_id);
ALTER TABLE public.pilot_flight_limit ENABLE ROW LEVEL SECURITY;
