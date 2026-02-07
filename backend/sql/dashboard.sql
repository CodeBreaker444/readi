-- =============================================
-- Supabase SQL Functions for Dashboard
-- =============================================

-- Function to execute dynamic queries (helper function)
CREATE OR REPLACE FUNCTION execute_query(query_text TEXT, params ANYARRAY DEFAULT '{}')
RETURNS SETOF JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- This is a simplified version. In production, use prepared statements
  -- For now, this assumes the query is safe and parameterized
  RETURN QUERY EXECUTE query_text USING params;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Get Pilot Total Statistics
-- =============================================
CREATE OR REPLACE FUNCTION get_pilot_total(
  p_user_id INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  total_missions BIGINT,
  total_hours NUMERIC,
  total_distance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pm.pilot_mission_id)::BIGINT as total_missions,
    COALESCE(FLOOR(SUM(pm.flight_duration) / 60), 0)::NUMERIC as total_hours,
    COALESCE(SUM(pm.distance_flown), 0)::NUMERIC as total_distance
  FROM pilot_mission pm
  WHERE pm.fk_pilot_user_id = p_user_id
    AND EXTRACT(YEAR FROM pm.actual_start) = p_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Get Mission Totals
-- =============================================
CREATE OR REPLACE FUNCTION get_mission_totals(
  p_client_id INTEGER,
  p_user_id INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  status TEXT,
  year INTEGER,
  fk_client_id INTEGER,
  client_name VARCHAR,
  total_mission BIGINT,
  total_time NUMERIC,
  total_hours NUMERIC,
  total_meter NUMERIC,
  total_planned BIGINT,
  total_drones_used BIGINT,
  total_clients_served BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'success'::TEXT as status,
    p_year as year,
    COALESCE(p_client_id, 0) as fk_client_id,
    COALESCE(c.client_name, 'All Clients')::VARCHAR as client_name,
    COUNT(DISTINCT pm.pilot_mission_id) as total_mission,
    COALESCE(SUM(pm.flight_duration), 0) as total_time,
    COALESCE(FLOOR(SUM(pm.flight_duration) / 60), 0) as total_hours,
    COALESCE(SUM(pm.distance_flown), 0) as total_meter,
    COUNT(DISTINCT CASE WHEN pms.status_code IN ('PLANNED', 'SCHEDULED') THEN pm.pilot_mission_id END) as total_planned,
    COUNT(DISTINCT pm.fk_tool_id) as total_drones_used,
    COUNT(DISTINCT p.fk_client_id) as total_clients_served
  FROM pilot_mission pm
  LEFT JOIN pilot_mission_status pms ON pm.fk_mission_status_id = pms.status_id
  LEFT JOIN planning p ON pm.fk_planning_id = p.planning_id
  LEFT JOIN client c ON p.fk_client_id = c.client_id
  WHERE EXTRACT(YEAR FROM pm.actual_start) = p_year
    AND (p_client_id = 0 OR p.fk_client_id = p_client_id)
    AND (p_user_id = 0 OR pm.fk_pilot_user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Get Mission List (Last or Next)
-- =============================================
CREATE OR REPLACE FUNCTION get_mission_list(
  p_client_id INTEGER,
  p_user_id INTEGER,
  p_is_future INTEGER,
  p_limit INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  status TEXT,
  year INTEGER,
  fk_client_id INTEGER,
  fk_user_id INTEGER,
  mission_id INTEGER,
  date_utc TIMESTAMP,
  pilot_name TEXT,
  drone_code VARCHAR,
  mission_type_desc VARCHAR,
  mission_result_desc VARCHAR,
  mission_duration_min NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'success'::TEXT as status,
    p_year as year,
    COALESCE(p_client_id, 0) as fk_client_id,
    COALESCE(p_user_id, 0) as fk_user_id,
    pm.pilot_mission_id as mission_id,
    pm.actual_start as date_utc,
    CONCAT(u.first_name, ' ', u.last_name) as pilot_name,
    t.tool_code as drone_code,
    pmt.type_name as mission_type_desc,
    pmr.result_type as mission_result_desc,
    COALESCE(pm.flight_duration, 0) as mission_duration_min
  FROM pilot_mission pm
  LEFT JOIN users u ON pm.fk_pilot_user_id = u.user_id
  LEFT JOIN tool t ON pm.fk_tool_id = t.tool_id
  LEFT JOIN pilot_mission_type pmt ON pm.fk_mission_type_id = pmt.mission_type_id
  LEFT JOIN pilot_mission_result pmr ON pm.pilot_mission_id = pmr.fk_pilot_mission_id
  LEFT JOIN planning p ON pm.fk_planning_id = p.planning_id
  WHERE 
    (p_client_id = 0 OR p.fk_client_id = p_client_id)
    AND (p_user_id = 0 OR pm.fk_pilot_user_id = p_user_id)
    AND CASE 
      WHEN p_is_future = 1 THEN pm.actual_start > NOW()
      ELSE pm.actual_start <= NOW()
    END
  ORDER BY 
    CASE 
      WHEN p_is_future = 1 THEN pm.actual_start
    END ASC,
    CASE 
      WHEN p_is_future = 0 THEN pm.actual_start
    END DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Get Mission Chart Data (Monthly per Drone)
-- =============================================
CREATE OR REPLACE FUNCTION get_mission_chart_data(
  p_client_id INTEGER,
  p_user_id INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  drone_name VARCHAR,
  month NUMERIC,
  mission_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tool_code as drone_name,
    EXTRACT(MONTH FROM pm.actual_start) as month,
    COUNT(pm.pilot_mission_id) as mission_count
  FROM pilot_mission pm
  LEFT JOIN tool t ON pm.fk_tool_id = t.tool_id
  LEFT JOIN planning p ON pm.fk_planning_id = p.planning_id
  WHERE EXTRACT(YEAR FROM pm.actual_start) = p_year
    AND (p_client_id = 0 OR p.fk_client_id = p_client_id)
    AND (p_user_id = 0 OR pm.fk_pilot_user_id = p_user_id)
    AND t.tool_code IS NOT NULL
  GROUP BY t.tool_code, EXTRACT(MONTH FROM pm.actual_start)
  ORDER BY t.tool_code, month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Get Mission Result Chart Data
-- =============================================
CREATE OR REPLACE FUNCTION get_mission_result_chart_data(
  p_client_id INTEGER,
  p_user_id INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  result_type VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pmr.result_type, 'Unknown')::VARCHAR as result_type,
    COUNT(pm.pilot_mission_id) as count
  FROM pilot_mission pm
  LEFT JOIN pilot_mission_result pmr ON pm.pilot_mission_id = pmr.fk_pilot_mission_id
  LEFT JOIN planning p ON pm.fk_planning_id = p.planning_id
  WHERE EXTRACT(YEAR FROM pm.actual_start) = p_year
    AND (p_client_id = 0 OR p.fk_client_id = p_client_id)
    AND (p_user_id = 0 OR pm.fk_pilot_user_id = p_user_id)
  GROUP BY pmr.result_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Grant necessary permissions
-- =============================================
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_pilot_total(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mission_totals(INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mission_list(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mission_chart_data(INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mission_result_chart_data(INTEGER, INTEGER, INTEGER) TO authenticated;

-- =============================================
-- Comments for documentation
-- =============================================
COMMENT ON FUNCTION get_pilot_total IS 'Get total statistics for a specific pilot';
COMMENT ON FUNCTION get_mission_totals IS 'Get aggregated mission statistics';
COMMENT ON FUNCTION get_mission_list IS 'Get list of past or upcoming missions';
COMMENT ON FUNCTION get_mission_chart_data IS 'Get mission count data grouped by month and drone';
COMMENT ON FUNCTION get_mission_result_chart_data IS 'Get mission count grouped by result type';