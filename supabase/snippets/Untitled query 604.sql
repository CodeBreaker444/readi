BEGIN;

-- 1. Create __WAREHOUSE__ for owners that have stale detached components but no warehouse tool
INSERT INTO tool (fk_owner_id, tool_code, tool_name, tool_active, tool_metadata)
SELECT DISTINCT t.fk_owner_id, '__WAREHOUSE__', 'Warehouse', 'Y', '{"is_warehouse": true}'::jsonb
FROM tool_component c
JOIN tool t ON t.tool_id = c.fk_tool_id
WHERE (c.component_metadata::jsonb ->> 'system_detached') = 'true'
  AND COALESCE(t.tool_metadata::jsonb ->> 'is_warehouse', 'false') <> 'true'
  AND NOT EXISTS (
    SELECT 1 FROM tool w
    WHERE w.fk_owner_id = t.fk_owner_id
      AND (w.tool_metadata::jsonb ->> 'is_warehouse') = 'true'
  );

-- 2. Move the stale detached components into it
UPDATE tool_component c
SET fk_tool_id = w.tool_id,
    updated_at = now()
FROM tool t
JOIN tool w
  ON w.fk_owner_id = t.fk_owner_id
 AND (w.tool_metadata::jsonb ->> 'is_warehouse') = 'true'
WHERE t.tool_id = c.fk_tool_id
  AND (c.component_metadata::jsonb ->> 'system_detached') = 'true'
  AND COALESCE(t.tool_metadata::jsonb ->> 'is_warehouse', 'false') <> 'true';

-- verify: should return 0 rows, then COMMIT
SELECT c.component_id, c.fk_tool_id
FROM tool_component c
JOIN tool t ON t.tool_id = c.fk_tool_id
WHERE (c.component_metadata::jsonb ->> 'system_detached') = 'true'
  AND COALESCE(t.tool_metadata::jsonb ->> 'is_warehouse', 'false') <> 'true';

COMMIT;  -- or ROLLBACK;
