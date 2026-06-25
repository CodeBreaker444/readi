-- Create flytbase_organizations table
-- This table stores FlytBase organization configurations independent of users
CREATE TABLE IF NOT EXISTS public.flytbase_organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  api_token TEXT NOT NULL,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fk_owner_id integer default null,
  UNIQUE(org_id, company_id)
);

-- -- Create index on org_id for faster lookups
-- CREATE INDEX IF NOT EXISTS idx_flytbase_organizations_org_id ON public.flytbase_organizations(org_id);

-- -- Add RLS policies
-- ALTER TABLE public.flytbase_organizations ENABLE ROW LEVEL SECURITY;

-- -- Policy: Only super admins can manage organizations
-- CREATE POLICY "Super admins can view organizations"
--   ON public.flytbase_organizations FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- CREATE POLICY "Super admins can insert organizations"
--   ON public.flytbase_organizations FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- CREATE POLICY "Super admins can update organizations"
--   ON public.flytbase_organizations FOR UPDATE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- CREATE POLICY "Super admins can delete organizations"
--   ON public.flytbase_organizations FOR DELETE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- -- Function to update updated_at timestamp
-- CREATE OR REPLACE FUNCTION update_flytbase_organizations_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
-- CREATE TRIGGER trigger_update_flytbase_organizations_updated_at
--   BEFORE UPDATE ON public.flytbase_organizations
--   FOR EACH ROW
--   EXECUTE FUNCTION update_flytbase_organizations_updated_at();


-- -- Create user_flytbase_access table
-- -- This table stores which organizations each user has access to
-- CREATE TABLE IF NOT EXISTS public.user_flytbase_access (
--   id SERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL,
--   organization_id INTEGER NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(user_id, organization_id),
--   CONSTRAINT fk_user_flytbase_access_user 
--     FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
--   CONSTRAINT fk_user_flytbase_access_organization 
--     FOREIGN KEY (organization_id) REFERENCES public.flytbase_organizations(id) ON DELETE CASCADE
-- );

-- -- Create indexes for faster lookups
-- CREATE INDEX IF NOT EXISTS idx_user_flytbase_access_user_id ON public.user_flytbase_access(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_flytbase_access_organization_id ON public.user_flytbase_access(organization_id);

-- -- Add RLS policies
-- ALTER TABLE public.user_flytbase_access ENABLE ROW LEVEL SECURITY;

-- -- Policy: Users can view their own organization access
-- CREATE POLICY "Users can view own organization access"
--   ON public.user_flytbase_access FOR SELECT
--   TO authenticated
--   USING (
--     user_id = (
--       SELECT user_id FROM public.users 
--       WHERE auth_user_id = auth.uid()
--       LIMIT 1
--     )
--   );

-- -- Policy: Super admins can view all organization access
-- CREATE POLICY "Super admins can view all organization access"
--   ON public.user_flytbase_access FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- -- Policy: Super admins can manage organization access
-- CREATE POLICY "Super admins can insert organization access"
--   ON public.user_flytbase_access FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- CREATE POLICY "Super admins can update organization access"
--   ON public.user_flytbase_access FOR UPDATE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );

-- CREATE POLICY "Super admins can delete organization access"
--   ON public.user_flytbase_access FOR DELETE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE auth_user_id = auth.uid()
--       AND user_role = 'super_admin'
--     )
--   );
