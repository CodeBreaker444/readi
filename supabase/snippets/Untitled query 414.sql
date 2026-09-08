ALTER TABLE public.tool_component
  ALTER COLUMN dcc_drone_id TYPE varchar(255) USING dcc_drone_id::varchar(255);