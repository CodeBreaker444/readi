-- Event Logbook: email notification rules and the owner's contact book.

-- Contact book: reusable recipients that can be picked when configuring a rule.
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

-- fk_client_id NULL = notifies for events of every client of the owner.
-- event_types empty = notifies for every event type.
CREATE TABLE IF NOT EXISTS public.event_email_notification (
  notification_id  SERIAL PRIMARY KEY,
  fk_owner_id      INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  fk_client_id     INTEGER REFERENCES public.client(client_id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  event_types      TEXT[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_by       INTEGER,
  created_at       TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_email_notification_owner ON public.event_email_notification (fk_owner_id, is_active);

ALTER TABLE public.event_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_email_notification ENABLE ROW LEVEL SECURITY;
