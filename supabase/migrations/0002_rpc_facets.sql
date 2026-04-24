-- Aggregation RPCs used by the app for facets and the Mexico map.
-- PostgREST caps `select` queries at 1000 rows by default, so any
-- "group-by-then-count" must run as SQL on the server.

CREATE OR REPLACE FUNCTION snii.researcher_counts_by_column(p_column text)
RETURNS TABLE(value text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = snii, pg_temp
AS $$
BEGIN
  IF p_column NOT IN ('nivel', 'area_conocimiento', 'entidad_final', 'institucion_final') THEN
    RAISE EXCEPTION 'invalid column: %', p_column;
  END IF;
  RETURN QUERY EXECUTE format(
    'SELECT %I::text AS value, COUNT(*)::bigint AS count
     FROM snii.researchers
     WHERE %I IS NOT NULL
     GROUP BY %I
     ORDER BY count DESC',
    p_column, p_column, p_column
  );
END;
$$;

CREATE OR REPLACE FUNCTION snii.researchers_by_state(p_area text DEFAULT NULL)
RETURNS TABLE(entidad text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = snii, pg_temp
AS $$
  SELECT entidad_final::text, COUNT(*)::bigint
  FROM snii.researchers
  WHERE entidad_final IS NOT NULL
    AND (p_area IS NULL OR area_conocimiento = p_area)
  GROUP BY entidad_final
  ORDER BY 2 DESC;
$$;

GRANT EXECUTE ON FUNCTION snii.researcher_counts_by_column(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.researchers_by_state(text) TO anon, authenticated, service_role;
