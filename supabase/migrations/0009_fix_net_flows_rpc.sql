-- After 0007 swapped researchers_v2 -> researchers, this RPC still pointed at
-- the old name and crashed at runtime. Re-define it against the canonical table.

CREATE OR REPLACE FUNCTION snii.snapshots_net_flows_by_year()
RETURNS TABLE(year int, entrants bigint, departures bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  WITH years AS (SELECT DISTINCT year FROM snii.researcher_snapshots),
       e AS (
         SELECT first_year AS year, COUNT(*)::bigint AS entrants
         FROM snii.researchers GROUP BY first_year
       ),
       d AS (
         SELECT last_year + 1 AS year, COUNT(*)::bigint AS departures
         FROM snii.researchers GROUP BY last_year + 1
       )
  SELECT y.year, COALESCE(e.entrants, 0), COALESCE(d.departures, 0)
  FROM years y
  LEFT JOIN e USING (year)
  LEFT JOIN d USING (year)
  ORDER BY y.year;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_net_flows_by_year() TO anon, authenticated, service_role;

-- truncate_v2_tables also referenced researchers_v2 by name; the table is now `researchers`.
CREATE OR REPLACE FUNCTION snii.truncate_v2_tables() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
BEGIN
  TRUNCATE snii.researcher_snapshots, snii.researchers RESTART IDENTITY;
END;
$$;

GRANT EXECUTE ON FUNCTION snii.truncate_v2_tables() TO service_role;
