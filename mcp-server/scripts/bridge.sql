CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  EXECUTE query;
  RETURN '{"ok": true}'::json;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', false, 'error', SQLERRM);
END;
$$;
