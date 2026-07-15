-- d-Flight integration: additional identifiers/serials on tool_component,
-- and configurable insurance alert fields on component_insurance.

ALTER TABLE public.tool_component
  ADD COLUMN IF NOT EXISTS uas_serial_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gcs_serial_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS license_plate     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS certifications    JSONB;

ALTER TABLE public.component_insurance
  ADD COLUMN IF NOT EXISTS alert_recipients  JSONB,
  ADD COLUMN IF NOT EXISTS alert_days_before INTEGER DEFAULT 30;

CREATE INDEX IF NOT EXISTS idx_tool_component_license_plate
  ON public.tool_component (license_plate);
