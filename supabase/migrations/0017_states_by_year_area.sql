-- Aggregated counts per (year, state, area) for the home-page map prefetch.
-- Lets the client filter/animate locally without a network round-trip per year.
-- Restricted to year >= 1990 because state-level data only exists from then on.

CREATE OR REPLACE FUNCTION snii.snapshots_states_by_year_area()
RETURNS TABLE(year int, entidad text, area text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, entidad::text, area_conocimiento::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE entidad IS NOT NULL
    AND area_conocimiento IS NOT NULL
    AND year >= 1990
  GROUP BY year, entidad, area_conocimiento
  ORDER BY year, entidad, area_conocimiento;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_states_by_year_area() TO anon, authenticated, service_role;
