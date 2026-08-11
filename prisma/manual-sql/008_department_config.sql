CREATE TABLE IF NOT EXISTS public.department_config (
  department_id   SERIAL PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  fk_owner_id     INTEGER NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT department_config_owner_name_key UNIQUE (fk_owner_id, department_name)
);

CREATE INDEX IF NOT EXISTS idx_department_config_owner
  ON public.department_config (fk_owner_id);
