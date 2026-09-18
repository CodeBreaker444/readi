ALTER TABLE public.flight_requests
  ADD COLUMN fk_pilot_mission_id integer NULL
    REFERENCES public.pilot_mission(pilot_mission_id);

CREATE INDEX idx_flight_requests_pilot_mission
  ON public.flight_requests (fk_pilot_mission_id);
