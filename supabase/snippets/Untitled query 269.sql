
CREATE TABLE IF NOT EXISTS public.pilot_group (
  pilot_group_id SERIAL PRIMARY KEY,
  fk_owner_id    INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL CHECK (length(btrim(name)) > 0),
  description    VARCHAR(500),
  created_by     INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at     TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pilot_group_owner_name ON public.pilot_group (fk_owner_id, lower(btrim(name)));

CREATE TABLE IF NOT EXISTS public.pilot_group_member (
  fk_pilot_group_id INTEGER NOT NULL REFERENCES public.pilot_group(pilot_group_id) ON DELETE CASCADE,
  fk_user_id        INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  added_at          TIMESTAMP(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (fk_pilot_group_id, fk_user_id)
);
CREATE INDEX IF NOT EXISTS idx_pilot_group_member_user ON public.pilot_group_member (fk_user_id);

ALTER TABLE public.pilot_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_group_member ENABLE ROW LEVEL SECURITY;
