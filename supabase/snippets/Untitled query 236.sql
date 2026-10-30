
ALTER TABLE public.owner
  ADD COLUMN IF NOT EXISTS support_access_code VARCHAR(6);
CREATE UNIQUE INDEX IF NOT EXISTS owner_support_access_code_key ON public.owner (support_access_code);
