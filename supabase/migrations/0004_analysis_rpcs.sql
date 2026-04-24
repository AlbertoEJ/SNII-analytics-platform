-- Analysis RPCs for the stats page.

-- Cross-tab: state × level. Returns one row per state with a count per level.
CREATE OR REPLACE FUNCTION snii.cross_state_level()
RETURNS TABLE(
  entidad text,
  c bigint,
  n1 bigint,
  n2 bigint,
  n3 bigint,
  e bigint,
  total bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = snii, pg_temp
AS $$
  SELECT
    entidad_final::text AS entidad,
    COUNT(*) FILTER (WHERE nivel = 'C')::bigint AS c,
    COUNT(*) FILTER (WHERE nivel = '1')::bigint AS n1,
    COUNT(*) FILTER (WHERE nivel = '2')::bigint AS n2,
    COUNT(*) FILTER (WHERE nivel = '3')::bigint AS n3,
    COUNT(*) FILTER (WHERE nivel = 'E')::bigint AS e,
    COUNT(*)::bigint AS total
  FROM snii.researchers
  WHERE entidad_final IS NOT NULL
  GROUP BY entidad_final
  ORDER BY total DESC;
$$;

-- Hierarchical: area → discipline → subdiscipline counts.
-- Returns flat rows; the client builds the tree.
CREATE OR REPLACE FUNCTION snii.area_discipline_breakdown()
RETURNS TABLE(
  area text,
  discipline text,
  subdiscipline text,
  count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = snii, pg_temp
AS $$
  SELECT
    area_conocimiento::text,
    COALESCE(disciplina, '—')::text,
    COALESCE(subdisciplina, '—')::text,
    COUNT(*)::bigint
  FROM snii.researchers
  WHERE area_conocimiento IS NOT NULL
  GROUP BY area_conocimiento, COALESCE(disciplina, '—'), COALESCE(subdisciplina, '—')
  ORDER BY 1, 2, 4 DESC;
$$;

-- Counts by institution_final (used for the concentration metric).
CREATE OR REPLACE FUNCTION snii.counts_by_institution()
RETURNS TABLE(institucion text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = snii, pg_temp
AS $$
  SELECT institucion_final::text, COUNT(*)::bigint
  FROM snii.researchers
  WHERE institucion_final IS NOT NULL
  GROUP BY institucion_final
  ORDER BY 2 DESC;
$$;

GRANT EXECUTE ON FUNCTION snii.cross_state_level() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.area_discipline_breakdown() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.counts_by_institution() TO anon, authenticated, service_role;
