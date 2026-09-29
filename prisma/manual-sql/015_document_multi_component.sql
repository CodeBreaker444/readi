CREATE TABLE IF NOT EXISTS public.luc_document_component (
  id               SERIAL PRIMARY KEY,
  fk_document_id   INTEGER NOT NULL REFERENCES public.luc_document(document_id) ON DELETE CASCADE,
  fk_component_id  INTEGER NOT NULL REFERENCES public.tool_component(component_id) ON DELETE CASCADE,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT luc_document_component_unique UNIQUE (fk_document_id, fk_component_id)
);

CREATE INDEX IF NOT EXISTS idx_luc_document_component_document ON public.luc_document_component (fk_document_id);
CREATE INDEX IF NOT EXISTS idx_luc_document_component_component ON public.luc_document_component (fk_component_id);

-- Backfill existing single attachments
INSERT INTO public.luc_document_component (fk_document_id, fk_component_id)
SELECT document_id, fk_component_id FROM public.luc_document WHERE fk_component_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the old single-FK column (superseded by the join table)
DROP INDEX IF EXISTS idx_luc_document_fk_component_id;
ALTER TABLE public.luc_document DROP COLUMN IF EXISTS fk_component_id;
