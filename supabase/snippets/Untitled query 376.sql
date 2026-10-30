DO $copy$
DECLARE
  v_src_owner          int   := 5;      -- SOURCE company  (owner_id)
  v_dst_owner          int   := 19;      -- TARGET company  (owner_id)
  v_fallback_client_id int   := 34;   -- target client used when no name/code match; NULL = first active client of target
  v_only_tool_ids      int[] := NULL;   -- NULL = all systems of the source, or e.g. ARRAY[10,11] to test with a few
  v_include_warehouse  boolean := true; -- also copy the components sitting in the source warehouse into the target warehouse
  v_commit             boolean := true;

  r            record;
  v_src_wh     int;
  v_dst_wh     int;
  v_n_wh       int := 0;
  v_new_id     int;
  v_fb_client  int;
  v_n_tools    int;
  v_n_comps    int;
  v_n_ins      int;
  v_n_models   int;
  v_n_orphan   int;
  v_bad        int;
  v_list       text;
  v_src_tools_before int;
  v_src_comps_before int;
BEGIN
  ------------------------------------------------------------------ 0. preflight
  IF v_src_owner = v_dst_owner THEN RAISE EXCEPTION 'source and target owner are the same'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.owner WHERE owner_id = v_src_owner) THEN RAISE EXCEPTION 'source owner % not found', v_src_owner; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.owner WHERE owner_id = v_dst_owner) THEN RAISE EXCEPTION 'target owner % not found', v_dst_owner; END IF;

  -- target fallback client (must belong to target owner)
  IF v_fallback_client_id IS NULL THEN
    SELECT client_id INTO v_fb_client FROM public.client
     WHERE fk_owner_id = v_dst_owner AND COALESCE(client_active,'Y') = 'Y'
     ORDER BY client_id LIMIT 1;
  ELSE
    SELECT client_id INTO v_fb_client FROM public.client
     WHERE client_id = v_fallback_client_id AND fk_owner_id = v_dst_owner;
  END IF;
  IF v_fb_client IS NULL THEN RAISE EXCEPTION 'target owner % has no usable client (create one first, or check v_fallback_client_id)', v_dst_owner; END IF;

  -- keep serial sequences ahead of max(id) (only ever moves them forward)
  FOR r IN SELECT * FROM (VALUES ('tool','tool_id'),('tool_component','component_id'),('component_insurance','insurance_id'),
                                 ('tool_model','model_id'),('component_type_config','type_id')) AS x(tbl, col)
  LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), m) FROM (SELECT max(%I) AS m FROM public.%I) q
        WHERE m IS NOT NULL AND m > (SELECT last_value FROM %s)',
      'public.' || r.tbl, r.col, r.col, r.tbl, pg_get_serial_sequence('public.' || r.tbl, r.col));
  END LOOP;

  ------------------------------------------------------------------ 1. source selection
  -- real systems only: no warehouse pseudo-system, no soft-deleted systems
  CREATE TEMP TABLE _src_tool ON COMMIT DROP AS
  SELECT t.*
    FROM public.tool t
   WHERE t.fk_owner_id = v_src_owner
     AND COALESCE(t.tool_metadata->>'is_warehouse','false') <> 'true'
     AND COALESCE(t.tool_metadata->>'deleted','false')      <> 'true'
     AND (v_only_tool_ids IS NULL OR t.tool_id = ANY(v_only_tool_ids));

  -- source warehouse pseudo-system (holds detached components)
  IF v_include_warehouse THEN
    SELECT tool_id INTO v_src_wh FROM public.tool
     WHERE fk_owner_id = v_src_owner AND tool_metadata->>'is_warehouse' = 'true'
     ORDER BY tool_id LIMIT 1;
  END IF;

  CREATE TEMP TABLE _src_comp ON COMMIT DROP AS
  SELECT c.* FROM public.tool_component c
   WHERE c.fk_tool_id IN (SELECT tool_id FROM _src_tool)
      OR (v_src_wh IS NOT NULL AND c.fk_tool_id = v_src_wh);

  SELECT count(*) INTO v_n_tools FROM _src_tool;
  IF v_n_tools = 0 AND NOT EXISTS (SELECT 1 FROM _src_comp) THEN RAISE EXCEPTION 'nothing to copy for owner %', v_src_owner; END IF;

  SELECT count(*) INTO v_src_tools_before FROM public.tool           WHERE fk_owner_id = v_src_owner;
  SELECT count(*) INTO v_src_comps_before FROM public.tool_component WHERE fk_tool_id IN (SELECT tool_id FROM public.tool WHERE fk_owner_id = v_src_owner);

  ------------------------------------------------------------------ 2. collision checks (target owner)
  SELECT string_agg(s.tool_code, ', ') INTO v_list
    FROM _src_tool s JOIN public.tool d ON d.fk_owner_id = v_dst_owner AND d.tool_code = s.tool_code
   WHERE COALESCE(d.tool_metadata->>'deleted','false') <> 'true';
  IF v_list IS NOT NULL THEN RAISE EXCEPTION 'tool_code already exists in target owner: %', v_list; END IF;
  -- deleted target tools still hold the unique (owner, tool_code) slot
  SELECT string_agg(s.tool_code, ', ') INTO v_list
    FROM _src_tool s JOIN public.tool d ON d.fk_owner_id = v_dst_owner AND d.tool_code = s.tool_code;
  IF v_list IS NOT NULL THEN RAISE EXCEPTION 'tool_code held by a (deleted) system in target owner: %', v_list; END IF;

  SELECT string_agg(DISTINCT s.component_code, ', ') INTO v_list
    FROM _src_comp s JOIN public.tool_component d ON lower(trim(d.component_code)) = lower(trim(s.component_code))
    JOIN public.tool dt ON dt.tool_id = d.fk_tool_id AND dt.fk_owner_id = v_dst_owner
   WHERE s.component_code IS NOT NULL;
  IF v_list IS NOT NULL THEN RAISE EXCEPTION 'component_code already exists in target owner: %', v_list; END IF;

  SELECT string_agg(DISTINCT s.serial_number, ', ') INTO v_list
    FROM _src_comp s JOIN public.tool_component d ON lower(trim(d.serial_number)) = lower(trim(s.serial_number))
    JOIN public.tool dt ON dt.tool_id = d.fk_tool_id AND dt.fk_owner_id = v_dst_owner
   WHERE s.serial_number IS NOT NULL;
  IF v_list IS NOT NULL THEN RAISE EXCEPTION 'component serial_number already exists in target owner: %', v_list; END IF;

  ------------------------------------------------------------------ 3. client map (source client -> existing target client)
  -- match by client_code, then by name (case-insensitive); otherwise fallback client.
  CREATE TEMP TABLE _client_map (src_client_id int PRIMARY KEY, dst_client_id int NOT NULL, how text) ON COMMIT DROP;

  INSERT INTO _client_map
  SELECT sc.client_id,
         COALESCE(m.client_id, v_fb_client),
         CASE WHEN m.client_id IS NULL THEN 'fallback' ELSE m.how END
    FROM public.client sc
    LEFT JOIN LATERAL (
      SELECT dc.client_id,
             CASE WHEN sc.client_code IS NOT NULL AND lower(trim(dc.client_code)) = lower(trim(sc.client_code)) THEN 'code' ELSE 'name' END AS how
        FROM public.client dc
       WHERE dc.fk_owner_id = v_dst_owner
         AND COALESCE(dc.client_active,'Y') = 'Y'
         AND ( (sc.client_code IS NOT NULL AND lower(trim(dc.client_code)) = lower(trim(sc.client_code)))
            OR lower(trim(dc.client_name)) = lower(trim(sc.client_name)) )
       ORDER BY (lower(trim(dc.client_code)) = lower(trim(sc.client_code))) DESC NULLS LAST, dc.client_id
       LIMIT 1
    ) m ON true
   WHERE sc.fk_owner_id = v_src_owner;

  -- per-system target client (null / unknown / foreign clientId -> fallback)
  CREATE TEMP TABLE _tool_client ON COMMIT DROP AS
  SELECT s.tool_id AS src_tool_id,
         COALESCE(cm.dst_client_id, v_fb_client) AS dst_client_id
    FROM _src_tool s
    LEFT JOIN _client_map cm
           ON cm.src_client_id = CASE WHEN s.tool_metadata->>'clientId' ~ '^\d+$' THEN (s.tool_metadata->>'clientId')::int END;

  ------------------------------------------------------------------ 4. model map (tool_model is owner-scoped via specifications.fk_owner_id)
  CREATE TEMP TABLE _model_map (src_model_id int PRIMARY KEY, dst_model_id int NOT NULL) ON COMMIT DROP;

  FOR r IN
    SELECT m.*
      FROM public.tool_model m
     WHERE m.model_id IN (
             SELECT (c.component_metadata->>'fk_tool_model_id')::int FROM _src_comp c
              WHERE c.component_metadata->>'fk_tool_model_id' ~ '^\d+$'
             UNION
             SELECT fk_model_id FROM _src_tool WHERE fk_model_id IS NOT NULL)
  LOOP
    -- reuse an equivalent model already owned by the target
    SELECT m2.model_id INTO v_new_id
      FROM public.tool_model m2
     WHERE (m2.specifications->>'fk_owner_id') = v_dst_owner::text
       AND m2.model_name = r.model_name
       AND COALESCE(m2.model_code,'')    = COALESCE(r.model_code,'')
       AND COALESCE(m2.manufacturer,'')  = COALESCE(r.manufacturer,'')
     ORDER BY m2.model_id LIMIT 1;

    IF v_new_id IS NULL THEN
      INSERT INTO public.tool_model (model_code, model_name, manufacturer, model_description, specifications, model_active)
      VALUES (r.model_code, r.model_name, r.manufacturer, r.model_description,
              jsonb_set(COALESCE(r.specifications,'{}'::jsonb), '{fk_owner_id}', to_jsonb(v_dst_owner)),
              r.model_active)
      RETURNING model_id INTO v_new_id;
    END IF;
    INSERT INTO _model_map VALUES (r.model_id, v_new_id);
    v_new_id := NULL;
  END LOOP;
  SELECT count(*) INTO v_n_models FROM _model_map;

  ------------------------------------------------------------------ 5. systems
  CREATE TEMP TABLE _tool_map (src_tool_id int PRIMARY KEY, dst_tool_id int NOT NULL) ON COMMIT DROP;

  FOR r IN SELECT s.*, tc.dst_client_id FROM _src_tool s JOIN _tool_client tc ON tc.src_tool_id = s.tool_id ORDER BY s.tool_id LOOP
    INSERT INTO public.tool (fk_owner_id, fk_model_id, fk_status_id, tool_code, tool_name, tool_description, location,
                             tool_active, tool_metadata, assigned_client_id, filekey, fileurl)
    VALUES (v_dst_owner,
            (SELECT dst_model_id FROM _model_map WHERE src_model_id = r.fk_model_id),
            r.fk_status_id, r.tool_code, r.tool_name, r.tool_description, r.location, r.tool_active,
            jsonb_set(COALESCE(r.tool_metadata,'{}'::jsonb), '{clientId}', to_jsonb(r.dst_client_id)),
            r.dst_client_id, r.filekey, r.fileurl)
    RETURNING tool_id INTO v_new_id;
    INSERT INTO _tool_map VALUES (r.tool_id, v_new_id);
  END LOOP;

  -- warehouse: reuse the target's warehouse, or create it exactly like the app does
  IF v_src_wh IS NOT NULL THEN
    SELECT tool_id INTO v_dst_wh FROM public.tool
     WHERE fk_owner_id = v_dst_owner AND tool_metadata->>'is_warehouse' = 'true'
     ORDER BY tool_id LIMIT 1;
    IF v_dst_wh IS NULL THEN
      INSERT INTO public.tool (fk_owner_id, tool_code, tool_name, tool_active, tool_metadata)
      VALUES (v_dst_owner, '__WAREHOUSE__', 'Warehouse', 'Y', '{"is_warehouse": true}'::jsonb)
      RETURNING tool_id INTO v_dst_wh;
    END IF;
    INSERT INTO _tool_map    VALUES (v_src_wh, v_dst_wh);
    INSERT INTO _tool_client VALUES (v_src_wh, v_fb_client);
    SELECT count(*) INTO v_n_wh FROM _src_comp WHERE fk_tool_id = v_src_wh;
  END IF;

  ------------------------------------------------------------------ 6. components
  CREATE TEMP TABLE _comp_map (src_comp_id int PRIMARY KEY, dst_comp_id int NOT NULL) ON COMMIT DROP;

  FOR r IN SELECT c.*, tm.dst_tool_id, tc.dst_client_id
             FROM _src_comp c
             JOIN _tool_map tm    ON tm.src_tool_id = c.fk_tool_id
             JOIN _tool_client tc ON tc.src_tool_id = c.fk_tool_id
            ORDER BY c.component_id LOOP
    INSERT INTO public.tool_component (
      fk_tool_id, component_code, component_name, component_type, component_description, serial_number, installation_date,
      component_active, component_metadata, current_usage_hours, expected_lifespan_hours, maintenance_cycle,
      maintenance_cycle_hour, maintenance_cycle_day, maintenance_cycle_flight, current_maintenance_hours,
      current_maintenance_days, current_maintenance_flights, last_maintenance_date, dcc_drone_id, drone_registration_code,
      drc_synced_at, expiration_date, expiry_type, expiration_flights, expiration_flight_hours, qr_code_image,
      uas_serial_number, gcs_serial_number, certifications)
    VALUES (
      r.dst_tool_id, r.component_code, r.component_name, r.component_type, r.component_description, r.serial_number, r.installation_date,
      r.component_active,
      -- model + client remapped here; parent remapped in pass 2 (needs the full comp map)
      (COALESCE(r.component_metadata,'{}'::jsonb)
        || CASE WHEN r.component_metadata->>'fk_tool_model_id' ~ '^\d+$'
                THEN jsonb_build_object('fk_tool_model_id',
                       (SELECT dst_model_id FROM _model_map WHERE src_model_id = (r.component_metadata->>'fk_tool_model_id')::int))
                ELSE '{}'::jsonb END
        || CASE WHEN r.component_metadata->>'fk_client_id' ~ '^\d+$'
                THEN jsonb_build_object('fk_client_id',
                       COALESCE((SELECT dst_client_id FROM _client_map WHERE src_client_id = (r.component_metadata->>'fk_client_id')::int), r.dst_client_id))
                ELSE '{}'::jsonb END),
      r.current_usage_hours, r.expected_lifespan_hours, r.maintenance_cycle,
      r.maintenance_cycle_hour, r.maintenance_cycle_day, r.maintenance_cycle_flight, r.current_maintenance_hours,
      r.current_maintenance_days, r.current_maintenance_flights, r.last_maintenance_date, r.dcc_drone_id, r.drone_registration_code,
      r.drc_synced_at, r.expiration_date, r.expiry_type, r.expiration_flights, r.expiration_flight_hours, r.qr_code_image,
      r.uas_serial_number, r.gcs_serial_number, r.certifications)
    RETURNING component_id INTO v_new_id;
    INSERT INTO _comp_map VALUES (r.component_id, v_new_id);
  END LOOP;
  SELECT count(*) INTO v_n_comps FROM _comp_map;

  -- pass 2: parent links (battery/payload -> drone, etc.)
  UPDATE public.tool_component d
     SET component_metadata = jsonb_set(d.component_metadata, '{fk_parent_component_id}',
           COALESCE((SELECT to_jsonb(pm.dst_comp_id) FROM _comp_map pm
                      WHERE pm.src_comp_id = (s.component_metadata->>'fk_parent_component_id')::int), 'null'::jsonb))
    FROM _comp_map cm JOIN _src_comp s ON s.component_id = cm.src_comp_id
   WHERE d.component_id = cm.dst_comp_id
     AND s.component_metadata->>'fk_parent_component_id' ~ '^\d+$';

  -- parents pointing outside the copied set (e.g. a component that sits in the warehouse) are cleared, not left dangling to the source company
  SELECT count(*) INTO v_n_orphan
    FROM _src_comp s
   WHERE s.component_metadata->>'fk_parent_component_id' ~ '^\d+$'
     AND NOT EXISTS (SELECT 1 FROM _comp_map pm WHERE pm.src_comp_id = (s.component_metadata->>'fk_parent_component_id')::int);

  ------------------------------------------------------------------ 7. insurance (1:1 with component)
  INSERT INTO public.component_insurance (fk_component_id, insurance_name, insurance_company, expiry_date, alert_recipients, alert_days_before)
  SELECT cm.dst_comp_id, i.insurance_name, i.insurance_company, i.expiry_date, i.alert_recipients, i.alert_days_before
    FROM public.component_insurance i JOIN _comp_map cm ON cm.src_comp_id = i.fk_component_id;
  GET DIAGNOSTICS v_n_ins = ROW_COUNT;

  ------------------------------------------------------------------ 8. component type labels the target is missing
  INSERT INTO public.component_type_config (type_value, type_label, fk_owner_id)
  SELECT s.type_value, s.type_label, v_dst_owner
    FROM public.component_type_config s
   WHERE s.fk_owner_id = v_src_owner
     AND s.type_value IN (SELECT DISTINCT component_type FROM _src_comp)
     AND NOT EXISTS (SELECT 1 FROM public.component_type_config d WHERE d.fk_owner_id = v_dst_owner AND d.type_value = s.type_value);

  ------------------------------------------------------------------ 9. in-transaction verification (any failure aborts + rolls back)
  -- 9a counts
  IF (SELECT count(*) FROM _tool_map) <> v_n_tools + (CASE WHEN v_src_wh IS NOT NULL THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'VERIFY: tool count mismatch'; END IF;
  IF v_n_comps <> (SELECT count(*) FROM _src_comp) THEN RAISE EXCEPTION 'VERIFY: component count mismatch'; END IF;
  IF v_n_ins   <> (SELECT count(*) FROM public.component_insurance i JOIN _comp_map m ON m.src_comp_id = i.fk_component_id) THEN RAISE EXCEPTION 'VERIFY: insurance count mismatch'; END IF;

  -- 9b every component sits under the SAME system (by code) as in the source
  SELECT count(*) INTO v_bad
    FROM _comp_map cm
    JOIN public.tool_component sc ON sc.component_id = cm.src_comp_id
    JOIN public.tool_component dc ON dc.component_id = cm.dst_comp_id
    JOIN public.tool st ON st.tool_id = sc.fk_tool_id
    JOIN public.tool dt ON dt.tool_id = dc.fk_tool_id
   WHERE dt.fk_owner_id <> v_dst_owner OR dt.tool_code IS DISTINCT FROM st.tool_code
      OR dc.component_code IS DISTINCT FROM sc.component_code OR dc.serial_number IS DISTINCT FROM sc.serial_number;
  IF v_bad > 0 THEN RAISE EXCEPTION 'VERIFY: % components not under the matching target system', v_bad; END IF;

  -- 9c parent links: dst parent == mapped src parent, and parent lives in the same target system
  SELECT count(*) INTO v_bad
    FROM _comp_map cm
    JOIN public.tool_component sc ON sc.component_id = cm.src_comp_id
    JOIN public.tool_component dc ON dc.component_id = cm.dst_comp_id
    LEFT JOIN _comp_map pm ON pm.src_comp_id = CASE WHEN sc.component_metadata->>'fk_parent_component_id' ~ '^\d+$' THEN (sc.component_metadata->>'fk_parent_component_id')::int END
   WHERE (dc.component_metadata->>'fk_parent_component_id') IS DISTINCT FROM pm.dst_comp_id::text
     AND NOT (dc.component_metadata->'fk_parent_component_id' IS NULL OR dc.component_metadata->'fk_parent_component_id' = 'null'::jsonb) ;
  IF v_bad > 0 THEN RAISE EXCEPTION 'VERIFY: % parent links wrong', v_bad; END IF;

  SELECT count(*) INTO v_bad
    FROM public.tool_component dc
   WHERE dc.component_id IN (SELECT dst_comp_id FROM _comp_map)
     AND dc.component_metadata->>'fk_parent_component_id' ~ '^\d+$'
     AND NOT EXISTS (SELECT 1 FROM public.tool_component p
                      WHERE p.component_id = (dc.component_metadata->>'fk_parent_component_id')::int
                        AND p.fk_tool_id IN (SELECT dst_tool_id FROM _tool_map));
  IF v_bad > 0 THEN RAISE EXCEPTION 'VERIFY: % parent links point outside the copied target systems', v_bad; END IF;

  -- 9d every copied system has a target-owner client, in BOTH places
  SELECT count(*) INTO v_bad
    FROM public.tool t
   WHERE t.tool_id IN (SELECT dst_tool_id FROM _tool_map)
     AND t.tool_id IS DISTINCT FROM v_dst_wh      -- the warehouse has no client
     AND ( t.fk_owner_id <> v_dst_owner
        OR t.assigned_client_id IS NULL
        OR (t.tool_metadata->>'clientId')::int IS DISTINCT FROM t.assigned_client_id
        OR NOT EXISTS (SELECT 1 FROM public.client c WHERE c.client_id = t.assigned_client_id AND c.fk_owner_id = v_dst_owner));
  IF v_bad > 0 THEN RAISE EXCEPTION 'VERIFY: % systems with wrong/missing target client', v_bad; END IF;

  -- 9e models are target-owned
  SELECT count(*) INTO v_bad
    FROM public.tool_component dc JOIN public.tool_model m ON m.model_id = (dc.component_metadata->>'fk_tool_model_id')::int
   WHERE dc.component_id IN (SELECT dst_comp_id FROM _comp_map)
     AND dc.component_metadata->>'fk_tool_model_id' ~ '^\d+$'
     AND (m.specifications->>'fk_owner_id') <> v_dst_owner::text;
  IF v_bad > 0 THEN RAISE EXCEPTION 'VERIFY: % components reference a model of another owner', v_bad; END IF;

  -- 9f source untouched
  IF (SELECT count(*) FROM public.tool WHERE fk_owner_id = v_src_owner) <> v_src_tools_before
  OR (SELECT count(*) FROM public.tool_component WHERE fk_tool_id IN (SELECT tool_id FROM public.tool WHERE fk_owner_id = v_src_owner)) <> v_src_comps_before
  THEN RAISE EXCEPTION 'VERIFY: source data changed!'; END IF;

  ------------------------------------------------------------------ 10. finish
  IF NOT v_commit THEN
    RAISE EXCEPTION 'DRY RUN OK (rolled back): % systems, % components (of which % from warehouse), % insurance rows, % models, % parent links cleared (parent outside copied set). Client mapping: %',
      v_n_tools, v_n_comps, v_n_wh, v_n_ins, v_n_models, v_n_orphan,
      (SELECT string_agg(src_client_id || '->' || dst_client_id || ' (' || how || ')', ', ') FROM _client_map);
  END IF;
  RAISE NOTICE 'COMMITTED: % systems, % components (% from warehouse), % insurance, % models', v_n_tools, v_n_comps, v_n_wh, v_n_ins, v_n_models;
END
$copy$;
