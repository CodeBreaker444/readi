-- Remove unused columns
ALTER TABLE public.d_flight_integrations
  DROP COLUMN IF EXISTS websocket_url,
  DROP COLUMN IF EXISTS auth_code,
  DROP COLUMN IF EXISTS secure_id;

-- Add easa_operator_code
ALTER TABLE public.d_flight_integrations
  ADD COLUMN IF NOT EXISTS easa_operator_code VARCHAR(255);
