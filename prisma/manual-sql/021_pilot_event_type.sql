-- Event Logbook: company-defined event types (create / edit / delete per owner).
-- pilot_event.event_type and event_webhook_config.event_types keep storing the
-- type_code (a stable slug), so renaming a type never touches reported events and
-- deleting one never breaks them (they just fall back to a prettified code).

CREATE TABLE IF NOT EXISTS public.pilot_event_type (
  event_type_id SERIAL PRIMARY KEY,
  fk_owner_id   INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  type_code     VARCHAR(50)  NOT NULL,   -- immutable slug, stored on events
  type_name     VARCHAR(100) NOT NULL,   -- editable display label
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    INTEGER,
  created_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  UNIQUE (fk_owner_id, type_code)
);
CREATE INDEX IF NOT EXISTS idx_pilot_event_type_owner ON public.pilot_event_type (fk_owner_id, sort_order, type_name);
ALTER TABLE public.pilot_event_type ENABLE ROW LEVEL SECURITY;

-- Default set seeded for one company. Idempotent.
CREATE OR REPLACE FUNCTION public.seed_default_event_types(p_owner_id INTEGER) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO public.pilot_event_type (fk_owner_id, type_code, type_name, sort_order) VALUES
    (p_owner_id, 'equipment_malfunction',  'Equipment malfunction',      10),
    (p_owner_id, 'gps_signal_issue',       'GPS signal issue',           20),
    (p_owner_id, 'obstacle_detected',      'Obstacle detected',          30),
    (p_owner_id, 'weather_related',        'Weather-related',            40),
    (p_owner_id, 'bird_activity',          'Bird activity',              50),
    (p_owner_id, 'unexpected_landing',     'Unexpected landing',         60),
    (p_owner_id, 'flyaway_loss_of_control','Fly-away / Loss of control', 70),
    (p_owner_id, 'other',                  'Other',                      80)
  ON CONFLICT (fk_owner_id, type_code) DO NOTHING;
$$;

-- 1) Existing companies.
SELECT public.seed_default_event_types(owner_id) FROM public.owner;

-- 2) Companies created from now on.
CREATE OR REPLACE FUNCTION public.trg_seed_event_types() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.seed_default_event_types(NEW.owner_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS seed_event_types_on_owner ON public.owner;
CREATE TRIGGER seed_event_types_on_owner AFTER INSERT ON public.owner
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_event_types();

-- 3) Types already used by reported events but missing from the list (e.g. legacy codes).
INSERT INTO public.pilot_event_type (fk_owner_id, type_code, type_name, sort_order)
SELECT DISTINCT e.fk_owner_id, e.event_type, initcap(replace(e.event_type, '_', ' ')), 100
FROM public.pilot_event e
ON CONFLICT (fk_owner_id, type_code) DO NOTHING;
