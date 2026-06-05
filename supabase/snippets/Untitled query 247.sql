ALTER TABLE public.tool_component
  ADD COLUMN IF NOT EXISTS expiration_date DATE;
