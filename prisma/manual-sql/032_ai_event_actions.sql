ALTER TABLE public.ai_event
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';

CREATE TABLE IF NOT EXISTS public.ai_event_action (
  action_id      SERIAL PRIMARY KEY,
  fk_ai_event_id INTEGER NOT NULL REFERENCES public.ai_event(ai_event_id) ON DELETE CASCADE,
  action         VARCHAR(20) NOT NULL,
  comment        VARCHAR(1000),
  user_id        INTEGER,
  user_email     VARCHAR(255) NOT NULL,
  created_at     TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_event_action_event ON public.ai_event_action (fk_ai_event_id, action_id);
ALTER TABLE public.ai_event_action ENABLE ROW LEVEL SECURITY;
