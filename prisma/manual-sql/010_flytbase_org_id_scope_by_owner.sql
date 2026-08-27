ALTER TABLE public.flytbase_organizations
  DROP CONSTRAINT IF EXISTS flytbase_organizations_org_id_key;

ALTER TABLE public.flytbase_organizations
  ADD CONSTRAINT flytbase_organizations_org_id_fk_owner_id_key UNIQUE (org_id, fk_owner_id);
