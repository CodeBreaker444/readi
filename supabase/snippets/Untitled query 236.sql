CREATE TABLE IF NOT EXISTS public.ai_event_feedback (
  feedback_id    SERIAL PRIMARY KEY,
  fk_ai_event_id INTEGER NOT NULL UNIQUE REFERENCES public.ai_event(ai_event_id) ON DELETE CASCADE,
  feedback_type  VARCHAR(20) NOT NULL CHECK (feedback_type IN ('false_positive', 'false_negative')),
  comment        VARCHAR(1000),
  attachments    JSONB NOT NULL DEFAULT '[]',
  user_id        INTEGER,
  user_email     VARCHAR(255) NOT NULL,
  created_at     TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP(6) NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_event_feedback ENABLE ROW LEVEL SECURITY;
