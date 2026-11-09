 

-- One row per monitored stream; alerts for that stream go to the client and the chosen contacts.
CREATE TABLE IF NOT EXISTS public.ai_stream_mapping (
  mapping_id   SERIAL PRIMARY KEY,
  fk_owner_id  INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  stream_id    VARCHAR(200) NOT NULL,
  fk_client_id INTEGER NOT NULL REFERENCES public.client(client_id) ON DELETE CASCADE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   INTEGER,
  created_at   TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP(6) NOT NULL DEFAULT now(),
  UNIQUE (fk_owner_id, stream_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_stream_mapping_client ON public.ai_stream_mapping (fk_client_id);
ALTER TABLE public.ai_stream_mapping ENABLE ROW LEVEL SECURITY;

-- Optional extra recipients (from the existing event contact book) per stream.
CREATE TABLE IF NOT EXISTS public.ai_stream_mapping_contact (
  fk_mapping_id INTEGER NOT NULL REFERENCES public.ai_stream_mapping(mapping_id) ON DELETE CASCADE,
  fk_contact_id INTEGER NOT NULL REFERENCES public.event_contact(contact_id) ON DELETE CASCADE,
  PRIMARY KEY (fk_mapping_id, fk_contact_id)
);
ALTER TABLE public.ai_stream_mapping_contact ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_event (
  ai_event_id        SERIAL PRIMARY KEY,
  fk_owner_id        INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  event_type         VARCHAR(50) NOT NULL,
  stream_id          VARCHAR(200) NOT NULL,
  session_id         VARCHAR(100) NOT NULL,
  -- -1 when the model sends no track id (keeps the dedupe key NULL-free).
  track_id           INTEGER NOT NULL DEFAULT -1,
  class_name         VARCHAR(100),
  confidence         DOUBLE PRECISION,
  event_time         TIMESTAMPTZ NOT NULL,
  frame_number       INTEGER,
  bounding_box       DOUBLE PRECISION[] NOT NULL DEFAULT '{}',
  frames_detected    INTEGER,
  processing_time_ms DOUBLE PRECISION,
  model_mode         VARCHAR(50),
  -- Key of our own copy of the snapshot (the model's presigned URL expires after 7 days).
  snapshot_key       VARCHAR(500),
  -- none | pending | stored | failed
  snapshot_status    VARCHAR(20) NOT NULL DEFAULT 'none',
  -- pending | sent | not_linked | inactive | no_recipients | throttled | limit_reached | failed
  notify_status      VARCHAR(30) NOT NULL DEFAULT 'pending',
  notified_emails    TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMP(6) NOT NULL DEFAULT now(),
  -- A retry of the same detection must not create a second row (or a second email).
  UNIQUE (fk_owner_id, session_id, track_id, event_type, event_time)
);
CREATE INDEX IF NOT EXISTS idx_ai_event_owner_time ON public.ai_event (fk_owner_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_ai_event_owner_stream ON public.ai_event (fk_owner_id, stream_id);
ALTER TABLE public.ai_event ENABLE ROW LEVEL SECURITY;
