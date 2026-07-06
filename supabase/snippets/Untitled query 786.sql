-- -- Feature permission matrix: schema-only migration.
-- -- Run this against every environment's database (local + any remote copies) before deploying.
-- -- A separate seed file (002_feature_permissions_seed.sql) populates role_feature_permission defaults.

-- CREATE TABLE IF NOT EXISTS public.role_feature_permission (
--   id SERIAL PRIMARY KEY,
--   role VARCHAR(50) NOT NULL,
--   feature_key VARCHAR(100) NOT NULL,
--   access CHAR(1) NOT NULL DEFAULT 'R',
--   updated_at TIMESTAMP NOT NULL DEFAULT now(),
--   CONSTRAINT role_feature_permission_role_feature_key_key UNIQUE (role, feature_key)
-- );

-- CREATE TABLE IF NOT EXISTS public.user_feature_permission (
--   id SERIAL PRIMARY KEY,
--   fk_user_id INTEGER NOT NULL,
--   feature_key VARCHAR(100) NOT NULL,
--   access CHAR(1) NOT NULL DEFAULT 'R',
--   updated_at TIMESTAMP NOT NULL DEFAULT now(),
--   CONSTRAINT user_feature_permission_fk_user_id_feature_key_key UNIQUE (fk_user_id, feature_key),
--   CONSTRAINT user_feature_permission_fk_user_id_fkey
--     FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
-- );

-- CREATE INDEX IF NOT EXISTS idx_user_feature_permission_fk_user_id
--   ON public.user_feature_permission (fk_user_id);

-- ALTER TABLE public.users
--   ADD COLUMN IF NOT EXISTS has_custom_permissions BOOLEAN DEFAULT false;
  
 
ALTER TABLE public.role_feature_permission
  ADD COLUMN IF NOT EXISTS fk_owner_id INTEGER;

-- 2. Backfill: the table (seeded by 002_feature_permissions_seed.sql) was global, i.e. one
--    row per (role, feature_key) shared by every company. Fan those rows out to every
--    existing company so nobody loses their current effective permissions.
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