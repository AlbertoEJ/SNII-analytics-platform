-- Materialize the (year, entidad, area) aggregate so the home-page prefetch
-- doesn't time out. ~7,000 rows total — refreshed manually after each import.
--
-- Apply once to create the MV and rewrite the RPC; refresh with:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY snii.mv_states_by_year_area;

SET default_transaction_read_only = off;

CREATE MATERIALIZED VIEW IF NOT EXISTS snii.mv_states_by_year_area AS
  SELECT year, entidad::text AS entidad, area_conocimiento::text AS area, COUNT(*)::bigint AS count
  FROM snii.researcher_snapshots
  WHERE entidad IS NOT NULL
    AND area_conocimiento IS NOT NULL
    AND year >= 1990
  GROUP BY year, entidad, area_conocimiento;

-- Unique index required for REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS mv_states_by_year_area_pk
  ON snii.mv_states_by_year_area (year, entidad, area);

CREATE INDEX IF NOT EXISTS mv_states_by_year_area_year_idx
  ON snii.mv_states_by_year_area (year);

GRANT SELECT ON snii.mv_states_by_year_area TO anon, authenticated, service_role;

-- RPC now reads from the MV — instant.
CREATE OR REPLACE FUNCTION snii.snapshots_states_by_year_area()
RETURNS TABLE(year int, entidad text, area text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, entidad, area, count
  FROM snii.mv_states_by_year_area
  ORDER BY year, entidad, area;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_states_by_year_area() TO anon, authenticated, service_role;
