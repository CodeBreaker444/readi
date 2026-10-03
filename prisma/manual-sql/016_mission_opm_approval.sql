-- OPM approval workflow for missions created by pilots.
-- NULL opm_approval_status = no approval required (created by OPM/manager, imported, legacy rows).
ALTER TABLE public.pilot_mission
  ADD COLUMN IF NOT EXISTS opm_approval_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS opm_approval_department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS opm_approval_requested_by_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS opm_approval_requested_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS opm_approval_decided_by_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS opm_approval_decided_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS opm_approval_note TEXT;

ALTER TABLE public.pilot_mission
  DROP CONSTRAINT IF EXISTS pilot_mission_opm_approval_status_check;
ALTER TABLE public.pilot_mission
  ADD CONSTRAINT pilot_mission_opm_approval_status_check
  CHECK (opm_approval_status IS NULL OR opm_approval_status IN ('PENDING', 'APPROVED', 'DENIED'));

CREATE INDEX IF NOT EXISTS idx_pilot_mission_opm_approval
  ON public.pilot_mission (fk_owner_id, opm_approval_status)
  WHERE opm_approval_status IS NOT NULL;
