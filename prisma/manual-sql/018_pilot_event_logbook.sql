-- Pilot Event Logbook: events reported by pilots, their attachments, and the
-- outbound webhook configuration/delivery log used to notify clients.

CREATE TABLE IF NOT EXISTS public.pilot_event (
  event_id         SERIAL PRIMARY KEY,
  fk_owner_id      INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  fk_pilot_user_id INTEGER NOT NULL REFERENCES public.users(user_id),
  fk_tool_id       INTEGER NOT NULL REFERENCES public.tool(tool_id),
  fk_mission_id    INTEGER REFERENCES public.pilot_mission(pilot_mission_id) ON DELETE SET NULL,
  fk_client_id     INTEGER REFERENCES public.client(client_id) ON DELETE SET NULL,
  event_type       VARCHAR(50) NOT NULL,
  takeoff_time     TIMESTAMP(6) NOT NULL,
  latitude         DECIMAL(9,6),
  longitude        DECIMAL(9,6),
  location_label   VARCHAR(500),
  notes            VARCHAR(500),
  created_at       TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilot_event_owner_created ON public.pilot_event (fk_owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_event_pilot ON public.pilot_event (fk_pilot_user_id);
CREATE INDEX IF NOT EXISTS idx_pilot_event_tool ON public.pilot_event (fk_tool_id);

CREATE TABLE IF NOT EXISTS public.pilot_event_attachment (
  attachment_id SERIAL PRIMARY KEY,
  fk_event_id   INTEGER NOT NULL REFERENCES public.pilot_event(event_id) ON DELETE CASCADE,
  file_name     VARCHAR(255) NOT NULL,
  file_key      TEXT NOT NULL,
  file_type     VARCHAR(100),
  file_size     BIGINT,
  uploaded_at   TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilot_event_attachment_event ON public.pilot_event_attachment (fk_event_id);

-- fk_client_id NULL = receives events of every client of the owner.
-- event_types empty = receives every event type.
CREATE TABLE IF NOT EXISTS public.event_webhook_config (
  webhook_id       SERIAL PRIMARY KEY,
  fk_owner_id      INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  fk_client_id     INTEGER REFERENCES public.client(client_id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  url              TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  event_types      TEXT[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_by       INTEGER,
  created_at       TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_webhook_config_owner ON public.event_webhook_config (fk_owner_id, is_active);

CREATE TABLE IF NOT EXISTS public.event_webhook_delivery (
  delivery_id     SERIAL PRIMARY KEY,
  fk_webhook_id   INTEGER NOT NULL REFERENCES public.event_webhook_config(webhook_id) ON DELETE CASCADE,
  fk_event_id     INTEGER REFERENCES public.pilot_event(event_id) ON DELETE CASCADE,
  is_test         BOOLEAN NOT NULL DEFAULT false,
  success         BOOLEAN NOT NULL,
  response_status INTEGER,
  error_message   VARCHAR(500),
  duration_ms     INTEGER,
  created_at      TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_webhook_delivery_webhook ON public.event_webhook_delivery (fk_webhook_id, created_at DESC);

 