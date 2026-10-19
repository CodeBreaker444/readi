-- Event Logbook: new default event type set (replaces the one from 021).
-- Idempotent and non-destructive: a type is only inserted when the company has no type
-- with the same code or the same name (ignoring case, spaces and punctuation).

CREATE OR REPLACE FUNCTION public.seed_default_event_types(p_owner_id INTEGER) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO public.pilot_event_type (fk_owner_id, type_code, type_name, sort_order)
  SELECT p_owner_id, d.type_code, d.type_name, d.sort_order
  FROM (VALUES
    ('obstacle_detected',      'Obstacle detected',       10),
    ('weather_issue',          'Weather Issue',           20),
    ('gps',                    'GPS',                     30),
    ('equipment_malfunction',  'Equipment malfunction',   40),
    ('weather_related',        'Weather related',         50),
    ('bird_activity',          'Bird activity',           60),
    ('flyaway_loss_of_control','Flyaway loss of control', 70)
  ) AS d(type_code, type_name, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pilot_event_type t
    WHERE t.fk_owner_id = p_owner_id
      AND (t.type_code = d.type_code
           OR regexp_replace(lower(t.type_name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(d.type_name), '[^a-z0-9]+', '', 'g'))
  );
$$;

-- Existing companies (the owner-insert trigger from 021 keeps seeding new ones).
SELECT public.seed_default_event_types(owner_id) FROM public.owner;
