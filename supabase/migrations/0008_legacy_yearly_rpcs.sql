-- Year-aware analogs of the legacy facet/cross-tab RPCs, used by /researchers, /stats.

CREATE OR REPLACE FUNCTION snii.snapshots_counts_by_column(p_column text, p_year int)
RETURNS TABLE(value text, count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
BEGIN
  IF p_column NOT IN ('nivel', 'area_conocimiento', 'entidad', 'institucion') THEN
    RAISE EXCEPTION 'invalid column: %', p_column;
  END IF;
  RETURN QUERY EXECUTE format(
    'SELECT %I::text AS value, COUNT(*)::bigint AS count
     FROM snii.researcher_snapshots
     WHERE year = $1 AND %I IS NOT NULL
     GROUP BY %I ORDER BY count DESC',
    p_column, p_column, p_column
  ) USING p_year;
END;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_cross_state_level(p_year int)
RETURNS TABLE(entidad text, c bigint, n1 bigint, n2 bigint, n3 bigint, e bigint, total bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT entidad::text,
         COUNT(*) FILTER (WHERE nivel = 'C')::bigint,
         COUNT(*) FILTER (WHERE nivel = '1')::bigint,
         COUNT(*) FILTER (WHERE nivel = '2')::bigint,
         COUNT(*) FILTER (WHERE nivel = '3')::bigint,
         COUNT(*) FILTER (WHERE nivel = 'E')::bigint,
         COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND entidad IS NOT NULL
  GROUP BY entidad ORDER BY 7 DESC;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_area_discipline_breakdown(p_year int)
RETURNS TABLE(area text, discipline text, subdiscipline text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT area_conocimiento::text, COALESCE(disciplina, '—')::text,
         COALESCE(subdisciplina, '—')::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND area_conocimiento IS NOT NULL
  GROUP BY 1, 2, 3 ORDER BY 1, 2, 4 DESC;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_counts_by_institution(p_year int)
RETURNS TABLE(institucion text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT institucion::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND institucion IS NOT NULL
  GROUP BY institucion ORDER BY 2 DESC;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_counts_by_column(text, int)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_cross_state_level(int)             TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_area_discipline_breakdown(int)     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_counts_by_institution(int)         TO anon, authenticated, service_role;
