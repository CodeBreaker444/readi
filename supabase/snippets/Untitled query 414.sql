SELECT c.component_id, c.component_code, c.component_type,
       t.tool_id AS old_tool_id, t.tool_code AS old_system,
       w.tool_id AS warehouse_tool_id
FROM tool_component c
JOIN tool t ON t.tool_id = c.fk_tool_id
LEFT JOIN tool w
       ON w.fk_owner_id = t.fk_owner_id
      AND (w.tool_metadata::jsonb ->> 'is_warehouse') = 'true'
WHERE (c.component_metadata::jsonb ->> 'system_detached') = 'true'
  AND COALESCE((t.tool_metadata::jsonb ->> 'is_warehouse'), 'false') <> 'true'
ORDER BY t.tool_code, c.component_id;
