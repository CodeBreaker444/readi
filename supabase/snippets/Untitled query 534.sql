-- Run in Supabase SQL editor

CREATE TABLE public.user_subroles (
  id          SERIAL PRIMARY KEY,
  fk_user_id  INT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  subrole     VARCHAR(50) NOT NULL,
  granted_by  INT,
  granted_at  TIMESTAMP DEFAULT NOW(),
  is_active   BOOLEAN DEFAULT TRUE,
  revoked_at  TIMESTAMP,
  revoked_by  INT
);
CREATE INDEX idx_user_subroles_user_subrole ON public.user_subroles(fk_user_id, subrole);

ALTER TABLE public.maintenance_ticket
  ADD COLUMN intervention_started_at TIMESTAMP,
  ADD COLUMN intervention_ended_at   TIMESTAMP,
  ADD COLUMN intervention_started_by INT;
