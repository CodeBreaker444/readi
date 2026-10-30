
-- V1  systems missing in target or with a different client/ownership  -> expect 0 rows
WITH p AS (SELECT 1 AS src, 2 AS dst)
SELECT s.tool_id src_tool, s.tool_code, d.tool_id dst_tool,
       d.assigned_client_id, d.tool_metadata->>'clientId' AS meta_client, c.fk_owner_id AS client_owner
  FROM p, public.tool s
  LEFT JOIN public.tool d ON d.fk_owner_id = p.dst AND d.tool_code = s.tool_code
  LEFT JOIN public.client c ON c.client_id = d.assigned_client_id
 WHERE s.fk_owner_id = p.src
   AND COALESCE(s.tool_metadata->>'is_warehouse','false') <> 'true'
   AND COALESCE(s.tool_metadata->>'deleted','false')      <> 'true'
   AND (d.tool_id IS NULL OR c.fk_owner_id IS DISTINCT FROM p.dst
        OR d.assigned_client_id::text IS DISTINCT FROM d.tool_metadata->>'clientId');

-- V2  per-system component count: source vs target  -> expect src_cnt = dst_cnt on every row
WITH p AS (SELECT 1 AS src, 2 AS dst)
SELECT s.tool_code,
       (SELECT count(*) FROM public.tool_component WHERE fk_tool_id = s.tool_id) AS src_cnt,
       (SELECT count(*) FROM public.tool_component WHERE fk_tool_id = d.tool_id) AS dst_cnt
  FROM p, public.tool s JOIN public.tool d ON d.tool_code = s.tool_code
 WHERE s.fk_owner_id = p.src AND d.fk_owner_id = p.dst
   AND COALESCE(s.tool_metadata->>'is_warehouse','false') <> 'true'
   AND COALESCE(s.tool_metadata->>'deleted','false')      <> 'true'
 ORDER BY s.tool_code;

-- V2b warehouse components: source vs target  -> expect equal counts (and same codes/serials/insurance)
WITH p AS (SELECT 1 AS src, 2 AS dst)
SELECT w.owner_side, count(*) AS comps, count(i.insurance_id) AS with_insurance
  FROM (SELECT 'src' owner_side, c.component_id FROM public.tool_component c JOIN public.tool t ON t.tool_id = c.fk_tool_id, p WHERE t.fk_owner_id = p.src AND t.tool_metadata->>'is_warehouse' = 'true'
        UNION ALL
        SELECT 'dst', c.component_id FROM public.tool_component c JOIN public.tool t ON t.tool_id = c.fk_tool_id, p WHERE t.fk_owner_id = p.dst AND t.tool_metadata->>'is_warehouse' = 'true') w
  LEFT JOIN public.component_insurance i ON i.fk_component_id = w.component_id
 GROUP BY w.owner_side;

-- V3  target components whose parent is not in the SAME target system, or leaks to another owner  -> expect 0 rows
WITH p AS (SELECT 2 AS dst)
SELECT c.component_id, c.component_code, c.component_metadata->>'fk_parent_component_id' AS parent_id
  FROM p, public.tool_component c JOIN public.tool t ON t.tool_id = c.fk_tool_id
 WHERE t.fk_owner_id = p.dst
   AND c.component_metadata->>'fk_parent_component_id' ~ '^\d+$'
   AND NOT EXISTS (SELECT 1 FROM public.tool_component pc
                    WHERE pc.component_id = (c.component_metadata->>'fk_parent_component_id')::int
                      AND pc.fk_tool_id = c.fk_tool_id);

-- V4  target components referencing a model that is not target-owned  -> expect 0 rows
WITH p AS (SELECT 2 AS dst)
SELECT c.component_id, c.component_code, m.model_id, m.specifications->>'fk_owner_id' AS model_owner
  FROM p, public.tool_component c JOIN public.tool t ON t.tool_id = c.fk_tool_id
  JOIN public.tool_model m ON m.model_id = (c.component_metadata->>'fk_tool_model_id')::int
 WHERE t.fk_owner_id = p.dst AND c.component_metadata->>'fk_tool_model_id' ~ '^\d+$'
   AND m.specifications->>'fk_owner_id' <> p.dst::text;

-- V5  insurance rows: source vs target  -> expect equal counts
WITH p AS (SELECT 1 AS src, 2 AS dst)
SELECT (SELECT count(*) FROM public.component_insurance i JOIN public.tool_component c ON c.component_id = i.fk_component_id JOIN public.tool t ON t.tool_id = c.fk_tool_id WHERE t.fk_owner_id = p.src) AS src_ins,
       (SELECT count(*) FROM public.component_insurance i JOIN public.tool_component c ON c.component_id = i.fk_component_id JOIN public.tool t ON t.tool_id = c.fk_tool_id WHERE t.fk_owner_id = p.dst) AS dst_ins
  FROM p;

-- V6  duplicate component code / serial inside the target owner (what addComponent would reject)  -> expect 0 rows
WITH p AS (SELECT 2 AS dst)
SELECT 'code' kind, lower(trim(c.component_code)) val, count(*) FROM p, public.tool_component c JOIN public.tool t ON t.tool_id = c.fk_tool_id
 WHERE t.fk_owner_id = p.dst AND c.component_code IS NOT NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'serial', lower(trim(c.serial_number)), count(*) FROM p, public.tool_component c JOIN public.tool t ON t.tool_id = c.fk_tool_id
 WHERE t.fk_owner_id = p.dst AND c.serial_number IS NOT NULL GROUP BY 2 HAVING count(*) > 1;

-- V7  nothing from the target tools is referenced by the source's history (sanity: missions/tickets still on SOURCE tools only)
WITH p AS (SELECT 1 AS src, 2 AS dst)
SELECT 'pilot_mission' t, count(*) FROM public.pilot_mission m JOIN public.tool x ON x.tool_id = m.fk_tool_id, p WHERE x.fk_owner_id = p.dst
UNION ALL SELECT 'maintenance_ticket', count(*) FROM public.maintenance_ticket m JOIN public.tool x ON x.tool_id = m.fk_tool_id, p WHERE x.fk_owner_id = p.dst;
-- (0 right after the copy; grows only as the new company creates its own missions/tickets)

-- V8  triggers on the copied tables (review - the script bypasses nothing, but be aware of them)
SELECT event_object_table, trigger_name, action_timing, event_manipulation
  FROM information_schema.triggers
 WHERE event_object_schema = 'public' AND event_object_table IN ('tool','tool_component','component_insurance','tool_model');
