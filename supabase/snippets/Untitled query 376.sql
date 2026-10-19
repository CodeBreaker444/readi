CREATE TABLE IF NOT EXISTS public.pilot_event_type (
  event_type_id SERIAL PRIMARY KEY,
  fk_owner_id   INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  type_code     VARCHAR(50)  NOT NULL,   -- stable slug, stored on events
  type_name     VARCHAR(100) NOT NULL,   -- editable label
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    INTEGER,
  created_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  UNIQUE (fk_owner_id, type_code)
);
CREATE INDEX IF NOT EXISTS idx_pilot_event_type_owner ON public.pilot_event_type (fk_owner_id, sort_order, type_name);
ALTER TABLE public.pilot_event_type ENABLE ROW LEVEL SECURITY;
