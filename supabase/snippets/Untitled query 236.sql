
ALTER TABLE public.maintenance_ticket_item
  DROP CONSTRAINT IF EXISTS maintenance_ticket_item_fk_component_id_fkey,
  ADD CONSTRAINT maintenance_ticket_item_fk_component_id_fkey
    FOREIGN KEY (fk_component_id) REFERENCES public.tool_component (component_id)
    ON DELETE SET NULL ON UPDATE NO ACTION;

-- Same problem would hit next on the ticket itself.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.maintenance_ticket'::regclass
     AND contype = 'f'
     AND confrelid = 'public.tool_component'::regclass;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.maintenance_ticket DROP CONSTRAINT %I', c);
  END IF;
  ALTER TABLE public.maintenance_ticket
    ADD CONSTRAINT maintenance_ticket_fk_component_id_fkey
    FOREIGN KEY (fk_component_id) REFERENCES public.tool_component (component_id)
    ON DELETE SET NULL ON UPDATE NO ACTION;
END $$;
