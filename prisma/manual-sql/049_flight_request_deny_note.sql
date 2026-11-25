-- Reason entered by the OPM when denying a flight request (also sent to the client's DCC as `note`).
ALTER TABLE public.flight_requests ADD COLUMN IF NOT EXISTS deny_note TEXT;
