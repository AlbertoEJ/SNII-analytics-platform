-- Year-aware analysis RPCs over snii.researcher_snapshots.

CREATE OR REPLACE FUNCTION snii.snapshots_available_years()
RETURNS TABLE(year int)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT DISTINCT year FROM snii.researcher_snapshots ORDER BY year;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_counts_by_state(p_year int, p_area text DEFAULT NULL)
RETURNS TABLE(entidad text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT entidad::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year
    AND entidad IS NOT NULL
    AND (p_area IS NULL OR area_conocimiento = p_area)
  GROUP BY entidad
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_totals_per_year()
RETURNS TABLE(year int, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, COUNT(*)::bigint FROM snii.researcher_snapshots GROUP BY year ORDER BY year;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_levels_by_year()
RETURNS TABLE(year int, nivel text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, COALESCE(nivel, '—')::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  GROUP BY year, COALESCE(nivel, '—')
  ORDER BY year, 2;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_states_by_year()
RETURNS TABLE(year int, entidad text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, entidad::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE entidad IS NOT NULL
  GROUP BY year, entidad
  ORDER BY year, entidad;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_areas_by_year()
RETURNS TABLE(year int, area text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, area_conocimiento::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE area_conocimiento IS NOT NULL
  GROUP BY year, area_conocimiento
  ORDER BY year, area_conocimiento;
$$;

-- Top-N institutions per year, ranked by count.
CREATE OR REPLACE FUNCTION snii.snapshots_institutions_by_year(p_top_n int DEFAULT 15)
RETURNS TABLE(year int, institucion text, count bigint, rank int)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  WITH per AS (
    SELECT year, institucion::text AS institucion, COUNT(*)::bigint AS count,
           ROW_NUMBER() OVER (PARTITION BY year ORDER BY COUNT(*) DESC) AS rnk
    FROM snii.researcher_snapshots
    WHERE institucion IS NOT NULL
    GROUP BY year, institucion
  )
  SELECT year, institucion, count, rnk::int
  FROM per
  WHERE rnk <= p_top_n
  ORDER BY year, rnk;
$$;

-- Net flow: entrants if first_year = year, departures if last_year + 1 = year.
CREATE OR REPLACE FUNCTION snii.snapshots_net_flows_by_year()
RETURNS TABLE(year int, entrants bigint, departures bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  WITH years AS (SELECT DISTINCT year FROM snii.researcher_snapshots),
       e AS (
         SELECT first_year AS year, COUNT(*)::bigint AS entrants
         FROM snii.researchers_v2 GROUP BY first_year
       ),
       d AS (
         SELECT last_year + 1 AS year, COUNT(*)::bigint AS departures
         FROM snii.researchers_v2 GROUP BY last_year + 1
       )
  SELECT y.year, COALESCE(e.entrants, 0), COALESCE(d.departures, 0)
  FROM years y
  LEFT JOIN e USING (year)
  LEFT JOIN d USING (year)
  ORDER BY y.year;
$$;

-- Per-researcher timeline.
CREATE OR REPLACE FUNCTION snii.snapshots_timeline_for(p_canonical_id bigint)
RETURNS TABLE(
  year int, nivel text, categoria text,
  area_conocimiento text, disciplina text, subdisciplina text, especialidad text,
  institucion text, dependencia text, entidad text, pais text,
  fecha_inicio_vigencia date, fecha_fin_vigencia date, source_file text
)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, nivel, categoria, area_conocimiento, disciplina, subdisciplina,
         especialidad, institucion, dependencia, entidad, pais,
         fecha_inicio_vigencia, fecha_fin_vigencia, source_file
  FROM snii.researcher_snapshots
  WHERE canonical_id = p_canonical_id
  ORDER BY year;
$$;

-- Truncate helper used by the importer.
CREATE OR REPLACE FUNCTION snii.truncate_v2_tables() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
BEGIN
  TRUNCATE snii.researcher_snapshots, snii.researchers_v2 RESTART IDENTITY;
END;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_available_years()           TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_counts_by_state(int, text)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_totals_per_year()           TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_levels_by_year()            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_states_by_year()            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_areas_by_year()             TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_institutions_by_year(int)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_net_flows_by_year()         TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_timeline_for(bigint)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.truncate_v2_tables()                  TO service_role;
