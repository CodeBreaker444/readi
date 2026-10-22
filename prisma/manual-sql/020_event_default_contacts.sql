-- Event Logbook: per-client default notification contacts, and the recipients
-- chosen for each reported event. Replaces the rule-based email notifications.

DROP TABLE IF EXISTS public.event_email_notification;

-- Contacts pre-selected when an event is reported for the client.
CREATE TABLE IF NOT EXISTS public.event_default_contact (
  default_id    SERIAL PRIMARY KEY,
  fk_owner_id   INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  fk_client_id  INTEGER NOT NULL REFERENCES public.client(client_id) ON DELETE CASCADE,
  fk_contact_id INTEGER NOT NULL REFERENCES public.event_contact(contact_id) ON DELETE CASCADE,
  created_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  UNIQUE (fk_client_id, fk_contact_id)
);
CREATE INDEX IF NOT EXISTS idx_event_default_contact_client ON public.event_default_contact (fk_owner_id, fk_client_id);
ALTER TABLE public.event_default_contact ENABLE ROW LEVEL SECURITY;

-- Email addresses notified for this event (snapshot, survives contact deletion).
ALTER TABLE public.pilot_event ADD COLUMN IF NOT EXISTS notify_emails TEXT[] NOT NULL DEFAULT '{}';
