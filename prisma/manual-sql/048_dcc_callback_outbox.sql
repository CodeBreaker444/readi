-- Failed DCC callbacks, kept for automatic retry (cron) and manual resend.
CREATE TABLE IF NOT EXISTS public.dcc_callback_outbox (
  id               SERIAL PRIMARY KEY,
  fk_owner_id      INTEGER NOT NULL,
  fk_client_id     INTEGER,
  strict           BOOLEAN NOT NULL DEFAULT FALSE,   -- never fall back to the org URL
  path             VARCHAR(300) NOT NULL,            -- e.g. /dcc/missions/{id}/acceptance
  body             JSONB,
  status           VARCHAR(10) NOT NULL DEFAULT 'PENDING',  -- PENDING | SUCCESS | FAILED
  attempts         INTEGER NOT NULL DEFAULT 1,
  next_attempt_at  TIMESTAMPTZ,
  last_http_status INTEGER,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dcc_outbox_due ON public.dcc_callback_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_dcc_outbox_owner ON public.dcc_callback_outbox (fk_owner_id, created_at DESC);
