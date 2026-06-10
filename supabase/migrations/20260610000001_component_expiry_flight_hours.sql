ALTER TABLE tool_component
  ADD COLUMN IF NOT EXISTS expiration_flight_hours NUMERIC(7,2) NULL;
