CREATE TABLE IF NOT EXISTS public.dcc_client_endpoints (
  id            SERIAL PRIMARY KEY,
  fk_owner_id   INTEGER NOT NULL,
  fk_client_id  INTEGER NOT NULL,
  status_url    VARCHAR(500) NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT dcc_client_endpoints_owner_client_key UNIQUE (fk_owner_id, fk_client_id)
);

-- Reason entered when a mission is aborted; sent as `note` in the status callback.
ALTER TABLE public.pilot_mission ADD COLUMN IF NOT EXISTS abort_reason TEXT;
