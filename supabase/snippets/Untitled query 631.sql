-- 1. Drop the old composite unique constraint
ALTER TABLE public.flytbase_organizations
  DROP CONSTRAINT flytbase_organizations_org_id_company_id_key;

-- 2. Drop the legacy company_id column
ALTER TABLE public.flytbase_organizations
  DROP COLUMN company_id;

-- 3. Add the unique constraint Prisma expects on org_id alone
ALTER TABLE public.flytbase_organizations
  ADD CONSTRAINT flytbase_organizations_org_id_key UNIQUE (org_id);

-- 4. (optional, to match local exactly) add the separate index on org_id
CREATE INDEX IF NOT EXISTS flytbase_organizations_org_id_idx
  ON public.flytbase_organizations USING btree (org_id);