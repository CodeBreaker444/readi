SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'flytbase_organizations'::regclass;