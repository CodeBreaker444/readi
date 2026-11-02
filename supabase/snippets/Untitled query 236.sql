ALTER TABLE public.ai_event
  ADD COLUMN IF NOT EXISTS client_id     INTEGER,
  ADD COLUMN IF NOT EXISTS client_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alerts_linked BOOLEAN NOT NULL DEFAULT false;

-- Events stored before this migration have no history to recover, so they take the stream's
-- current settings once. Run this migration only once; a second run would overwrite the snapshots.
UPDATE public.ai_event e
SET client_id     = m.fk_client_id,
    client_name   = c.client_name,
    alerts_linked = (
      m.fk_client_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.ai_stream_mapping_contact mc WHERE mc.fk_mapping_id = m.mapping_id)
    )
FROM public.ai_stream_mapping m
LEFT JOIN public.client c ON c.client_id = m.fk_client_id
WHERE m.stream_id = e.stream_id
  AND e.client_name IS NULL
  AND e.alerts_linked = false;
