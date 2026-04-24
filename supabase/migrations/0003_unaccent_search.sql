-- Accent-insensitive search support.
-- unaccent() ships as STABLE in Postgres, which means we can't use it directly
-- in a generated column or trigram index. We wrap it in an IMMUTABLE function
-- so it becomes indexable.

CREATE OR REPLACE FUNCTION snii.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;

GRANT EXECUTE ON FUNCTION snii.immutable_unaccent(text) TO anon, authenticated, service_role;

-- Generated column with the unaccented form of the name.
ALTER TABLE snii.researchers
  ADD COLUMN IF NOT EXISTS nombre_unaccent text
    GENERATED ALWAYS AS (snii.immutable_unaccent(nombre)) STORED;

-- Trigram index on the unaccented column for fast ILIKE %term% searches.
CREATE INDEX IF NOT EXISTS idx_researchers_nombre_unaccent_trgm
  ON snii.researchers USING gin (nombre_unaccent gin_trgm_ops);
