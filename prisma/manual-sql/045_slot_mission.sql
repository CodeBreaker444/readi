CREATE TABLE IF NOT EXISTS public.slot_mission (
  fk_slot_id          INTEGER      NOT NULL REFERENCES public.slot(slot_id) ON DELETE CASCADE,
  fk_pilot_mission_id INTEGER      NOT NULL REFERENCES public.pilot_mission(pilot_mission_id) ON DELETE CASCADE,
  fk_owner_id         INTEGER      NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  linked_by           INTEGER      NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
  linked_at           TIMESTAMP(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (fk_slot_id, fk_pilot_mission_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_mission_mission ON public.slot_mission (fk_pilot_mission_id);
CREATE INDEX IF NOT EXISTS idx_slot_mission_owner ON public.slot_mission (fk_owner_id);
ALTER TABLE public.slot_mission ENABLE ROW LEVEL SECURITY;
