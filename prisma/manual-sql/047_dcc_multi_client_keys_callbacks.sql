
-- 1. API key -> client
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS fk_client_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_api_keys_client ON public.api_keys (fk_client_id);

-- 2. Flight request -> client (copied from the key at request time so callbacks
--    keep working after the key is revoked/deleted/rotated)
ALTER TABLE public.flight_requests ADD COLUMN IF NOT EXISTS fk_client_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_flight_requests_client ON public.flight_requests (fk_client_id);

-- 3. Per-client callback URL. status_url becomes optional: a client may have
--    only a callback URL, only a status URL, or both.
ALTER TABLE public.dcc_client_endpoints ADD COLUMN IF NOT EXISTS callback_url VARCHAR(500);
ALTER TABLE public.dcc_client_endpoints ALTER COLUMN status_url DROP NOT NULL;

-- 4. Backfill requests that came in through an already client-mapped key.
UPDATE public.flight_requests fr
SET fk_client_id = ak.fk_client_id
FROM public.api_keys ak
WHERE fr.fk_api_key_id = ak.api_key_id
  AND ak.fk_client_id IS NOT NULL
  AND fr.fk_client_id IS NULL;

-- ---------------------------------------------------------------------------
-- ONE-TIME PROD STEP: map the existing client (run AFTER the statements above).
-- Replace <OWNER_ID>, <CLIENT_ID> and <KEY_ID> before running.
-- ---------------------------------------------------------------------------
-- UPDATE public.api_keys SET fk_client_id = <CLIENT_ID>
--   WHERE api_key_id = <KEY_ID> AND fk_owner_id = <OWNER_ID>;
--
-- UPDATE public.flight_requests SET fk_client_id = <CLIENT_ID>
--   WHERE fk_owner_id = <OWNER_ID> AND fk_client_id IS NULL;
--
-- INSERT INTO public.dcc_client_endpoints (fk_owner_id, fk_client_id, callback_url, active)
--   SELECT fk_owner_id, <CLIENT_ID>, callback_url, TRUE
--   FROM public.dcc_integrations WHERE fk_owner_id = <OWNER_ID>
--   ON CONFLICT (fk_owner_id, fk_client_id)
--   DO UPDATE SET callback_url = EXCLUDED.callback_url, updated_at = now();
