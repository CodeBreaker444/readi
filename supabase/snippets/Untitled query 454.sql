CREATE SEQUENCE IF NOT EXISTS public.mission_maintenance_log_mission_maintenance_log_id_seq;

CREATE TABLE IF NOT EXISTS public.mission_maintenance_log (
    mission_maintenance_log_id integer NOT NULL DEFAULT nextval('public.mission_maintenance_log_mission_maintenance_log_id_seq'::regclass),
    fk_mission_id integer NOT NULL,
    fk_component_id integer NOT NULL,
    add_hours numeric NOT NULL DEFAULT 0,
    add_flights numeric NOT NULL DEFAULT 0,
    created_at timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mission_maintenance_log_pkey PRIMARY KEY (mission_maintenance_log_id),
    CONSTRAINT mission_maintenance_log_fk_mission_id_fkey
        FOREIGN KEY (fk_mission_id) REFERENCES public.pilot_mission (pilot_mission_id) ON DELETE CASCADE,
    CONSTRAINT mission_maintenance_log_fk_component_id_fkey
        FOREIGN KEY (fk_component_id) REFERENCES public.tool_component (component_id) ON DELETE CASCADE
);

ALTER SEQUENCE public.mission_maintenance_log_mission_maintenance_log_id_seq
    OWNED BY public.mission_maintenance_log.mission_maintenance_log_id;

CREATE INDEX IF NOT EXISTS idx_mission_maintenance_log_mission
    ON public.mission_maintenance_log USING btree (fk_mission_id);
