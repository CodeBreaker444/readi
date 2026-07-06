ALTER TABLE public.role_feature_permission
  ADD COLUMN IF NOT EXISTS fk_owner_id INTEGER;

 
INSERT INTO public.role_feature_permission (fk_owner_id, role, feature_key, access)
SELECT o.owner_id, rfp.role, rfp.feature_key, rfp.access
FROM public.role_feature_permission rfp
CROSS JOIN public.owner o
WHERE rfp.fk_owner_id IS NULL
ON CONFLICT DO NOTHING;

-- 3. Drop the now-obsolete global rows.
DELETE FROM public.role_feature_permission WHERE fk_owner_id IS NULL;

-- 4. Enforce the column and re-key uniqueness/indexes per company.
ALTER TABLE public.role_feature_permission
  ALTER COLUMN fk_owner_id SET NOT NULL;

ALTER TABLE public.role_feature_permission
  DROP CONSTRAINT IF EXISTS role_feature_permission_role_feature_key_key;

ALTER TABLE public.role_feature_permission
  ADD CONSTRAINT role_feature_permission_owner_role_feature_key_key UNIQUE (fk_owner_id, role, feature_key);

ALTER TABLE public.role_feature_permission
  ADD CONSTRAINT role_feature_permission_fk_owner_id_fkey
    FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_role_feature_permission_fk_owner_id
  ON public.role_feature_permission (fk_owner_id);
