
-- 1. Events no longer belong to a company. The column stays (nullable, no longer written) so nothing is deleted.
ALTER TABLE public.ai_event ALTER COLUMN fk_owner_id DROP NOT NULL;

DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.ai_event'::regclass AND contype = 'u' LOOP
    EXECUTE format('ALTER TABLE public.ai_event DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
DROP INDEX IF EXISTS public.idx_ai_event_owner_time;
DROP INDEX IF EXISTS public.idx_ai_event_owner_stream;

-- A retry of the same detection must not create a second row (or a second email).
CREATE UNIQUE INDEX IF NOT EXISTS ai_event_dedupe_key ON public.ai_event (stream_id, session_id, track_id, event_type, event_time);
CREATE INDEX IF NOT EXISTS idx_ai_event_time ON public.ai_event (event_time DESC);
CREATE INDEX IF NOT EXISTS idx_ai_event_stream ON public.ai_event (stream_id);

-- 2. The images are uploaded to our bucket by the model; we only keep their keys and sizes.
ALTER TABLE public.ai_event
  ADD COLUMN IF NOT EXISTS org_img_key    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS org_img_width  INTEGER,
  ADD COLUMN IF NOT EXISTS org_img_height INTEGER,
  ADD COLUMN IF NOT EXISTS ai_img_key     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS ai_img_width   INTEGER,
  ADD COLUMN IF NOT EXISTS ai_img_height  INTEGER,
  ADD COLUMN IF NOT EXISTS ai_res_width   INTEGER,
  ADD COLUMN IF NOT EXISTS ai_res_height  INTEGER,
  -- Every object tracked in the frame: [{ track_id, class_name, confidence, bounding_box }]
  ADD COLUMN IF NOT EXISTS detections     JSONB NOT NULL DEFAULT '[]';

-- 3. A stream id belongs to exactly one company, across the whole platform.
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.ai_stream_mapping'::regclass AND contype = 'u' LOOP
    EXECUTE format('ALTER TABLE public.ai_stream_mapping DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS ai_stream_mapping_stream_id_key ON public.ai_stream_mapping (stream_id);

-- 4. The client is part of the optional notification settings. Deleting a client must not release the claim.
ALTER TABLE public.ai_stream_mapping ALTER COLUMN fk_client_id DROP NOT NULL;
ALTER TABLE public.ai_stream_mapping DROP CONSTRAINT IF EXISTS ai_stream_mapping_fk_client_id_fkey;
ALTER TABLE public.ai_stream_mapping
  ADD CONSTRAINT ai_stream_mapping_fk_client_id_fkey
  FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) ON DELETE SET NULL;
