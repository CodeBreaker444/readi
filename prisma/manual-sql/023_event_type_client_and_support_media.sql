-- Event Logbook:
-- 1) Event types can belong to one client (fk_client_id). NULL = default type, available for every client.
-- 2) Supporting media: extra images/videos added to an already-reported event (flagged on the attachment row).

ALTER TABLE public.pilot_event_type
  ADD COLUMN IF NOT EXISTS fk_client_id INTEGER REFERENCES public.client(client_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pilot_event_type_client ON public.pilot_event_type (fk_owner_id, fk_client_id);

ALTER TABLE public.pilot_event_attachment
  ADD COLUMN IF NOT EXISTS is_supporting BOOLEAN NOT NULL DEFAULT false;
