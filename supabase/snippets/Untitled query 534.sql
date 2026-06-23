-- Add fk_mission_planning_id column to pilot_mission table
ALTER TABLE public.pilot_mission
ADD COLUMN fk_mission_planning_id INTEGER;

 
ALTER TABLE public.pilot_mission
ADD CONSTRAINT fk_pilot_mission_mission_planning
FOREIGN KEY (fk_mission_planning_id)
REFERENCES public.planning_logbook(mission_planning_id)
ON DELETE NO ACTION
ON UPDATE NO ACTION;

 
CREATE INDEX idx_pilot_mission_fk_mission_planning_id
ON public.pilot_mission(fk_mission_planning_id);