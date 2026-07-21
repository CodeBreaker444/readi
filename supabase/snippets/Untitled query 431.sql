-- fk_owner_id should be Int, matching owner.owner_id
ALTER TABLE emergency_response_plan
  ALTER COLUMN fk_owner_id TYPE integer USING fk_owner_id::integer;

-- fk_erp_id should be BigInt, matching emergency_response_plan.erp_id
ALTER TABLE erp_location_group_contact
  ALTER COLUMN fk_erp_id TYPE bigint USING fk_erp_id::bigint;