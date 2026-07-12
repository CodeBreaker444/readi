CREATE TABLE IF NOT EXISTS public.component_insurance (
  insurance_id      SERIAL PRIMARY KEY,
  fk_component_id   INTEGER NOT NULL,
  insurance_name    VARCHAR(255),
  insurance_company VARCHAR(255),
  expiry_date       DATE,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT component_insurance_fk_component_id_key UNIQUE (fk_component_id),
  CONSTRAINT component_insurance_fk_component_id_fkey
    FOREIGN KEY (fk_component_id) REFERENCES public.tool_component(component_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_component_insurance_fk_component_id
  ON public.component_insurance (fk_component_id);
