ALTER TABLE public.dcc_client_endpoints
  ADD COLUMN IF NOT EXISTS mission_scope VARCHAR(10) NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS api_key_last6 VARCHAR(6);

ALTER TABLE public.dcc_client_endpoints
  DROP CONSTRAINT IF EXISTS dcc_client_endpoints_scope_chk;
ALTER TABLE public.dcc_client_endpoints
  ADD CONSTRAINT dcc_client_endpoints_scope_chk CHECK (mission_scope IN ('EXTERNAL', 'INTERNAL', 'ALL'));
