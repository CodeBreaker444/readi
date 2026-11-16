
ALTER TABLE public.slot_group ADD COLUMN IF NOT EXISTS fk_tool_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_slot_group_tool') THEN
    ALTER TABLE public.slot_group
      ADD CONSTRAINT fk_slot_group_tool FOREIGN KEY (fk_tool_id) REFERENCES public.tool (tool_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_slot_group_tool ON public.slot_group (fk_tool_id) WHERE fk_tool_id IS NOT NULL;

ALTER TABLE public.slot_settings DROP CONSTRAINT IF EXISTS chk_slot_settings_lat;
ALTER TABLE public.slot_settings DROP CONSTRAINT IF EXISTS chk_slot_settings_lon;
ALTER TABLE public.slot_settings DROP COLUMN IF EXISTS base_latitude;
ALTER TABLE public.slot_settings DROP COLUMN IF EXISTS base_longitude;
