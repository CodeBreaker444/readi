-- DCC + client callbacks merged into one per-client integration.
--
-- mission_scope : which missions are sent to this client's URLs
--                 EXTERNAL = only missions requested by the client through its API key
--                 INTERNAL = only missions created inside Readi
--                 ALL      = both (default, keeps the behaviour existing rows had)
-- api_key_encrypted : key Readi sends to the client's server (AES-256-GCM, like webhook secrets)
-- api_key_last6     : last 6 characters, the only part ever shown again in the UI
--
-- Existing rows get no key and keep working with the old shared Basic auth until a key is generated.

ALTER TABLE public.dcc_client_endpoints
  ADD COLUMN IF NOT EXISTS mission_scope VARCHAR(10) NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS api_key_last6 VARCHAR(6);

ALTER TABLE public.dcc_client_endpoints
  DROP CONSTRAINT IF EXISTS dcc_client_endpoints_scope_chk;
ALTER TABLE public.dcc_client_endpoints
  ADD CONSTRAINT dcc_client_endpoints_scope_chk CHECK (mission_scope IN ('EXTERNAL', 'INTERNAL', 'ALL'));
