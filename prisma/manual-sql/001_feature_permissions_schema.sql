 
CREATE TABLE IF NOT EXISTS public.role_feature_permission (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  access CHAR(1) NOT NULL DEFAULT 'R',
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT role_feature_permission_role_feature_key_key UNIQUE (role, feature_key)
);

CREATE TABLE IF NOT EXISTS public.user_feature_permission (
  id SERIAL PRIMARY KEY,
  fk_user_id INTEGER NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  access CHAR(1) NOT NULL DEFAULT 'R',
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT user_feature_permission_fk_user_id_feature_key_key UNIQUE (fk_user_id, feature_key),
  CONSTRAINT user_feature_permission_fk_user_id_fkey
    FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_feature_permission_fk_user_id
  ON public.user_feature_permission (fk_user_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_custom_permissions BOOLEAN DEFAULT false;
