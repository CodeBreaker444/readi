-- Event Logbook: the owner's contact book (reusable email recipients).

CREATE TABLE IF NOT EXISTS public.event_contact (
  contact_id  SERIAL PRIMARY KEY,
  fk_owner_id INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  company     VARCHAR(150),
  notes       TEXT,
  email       VARCHAR(255) NOT NULL,
  created_by  INTEGER,
  created_at  TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_contact_owner_email ON public.event_contact (fk_owner_id, lower(email));

ALTER TABLE public.event_contact ENABLE ROW LEVEL SECURITY;
