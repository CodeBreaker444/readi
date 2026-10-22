
ALTER TABLE public.pilot_event
  ADD COLUMN IF NOT EXISTS fk_event_type_id INTEGER REFERENCES public.pilot_event_type(event_type_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_type_label VARCHAR(100);

-- Backfill existing events from their current type.
UPDATE public.pilot_event e
SET fk_event_type_id = t.event_type_id,
    event_type_label = t.type_name
FROM public.pilot_event_type t
WHERE t.fk_owner_id = e.fk_owner_id
  AND t.type_code = e.event_type
  AND e.fk_event_type_id IS NULL;

-- Events whose type no longer exists keep a readable label derived from the code.
UPDATE public.pilot_event
SET event_type_label = initcap(replace(event_type, '_', ' '))
WHERE event_type_label IS NULL;

CREATE INDEX IF NOT EXISTS idx_pilot_event_type_id ON public.pilot_event (fk_event_type_id);
