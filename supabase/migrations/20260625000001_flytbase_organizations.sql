-- Create flytbase_organizations table
-- This table stores FlytBase organization configurations independent of users
CREATE TABLE IF NOT EXISTS public.flytbase_organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  org_id VARCHAR(255) NOT NULL,
  api_token TEXT NOT NULL,
  fk_owner_id INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_flytbase_organizations_org_id ON public.flytbase_organizations(org_id);
CREATE INDEX IF NOT EXISTS idx_flytbase_organizations_fk_owner_id ON public.flytbase_organizations(fk_owner_id);

-- Add RLS policies
ALTER TABLE public.flytbase_organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can manage organizations
CREATE POLICY "Super admins can view organizations"
  ON public.flytbase_organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND user_role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert organizations"
  ON public.flytbase_organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND user_role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update organizations"
  ON public.flytbase_organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND user_role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete organizations"
  ON public.flytbase_organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND user_role = 'super_admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flytbase_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_flytbase_organizations_updated_at
  BEFORE UPDATE ON public.flytbase_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_flytbase_organizations_updated_at();
