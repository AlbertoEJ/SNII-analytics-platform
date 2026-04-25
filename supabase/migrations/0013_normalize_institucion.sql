-- Reduce institucion noise without trying to fully canonicalize 3,641
-- distinct strings:
--   1. unaccent + uppercase
--   2. strip trailing "(ACRONYM)" — UNAM, IPN etc.
--   3. strip trailing ", FACULTAD DE …" sub-units
--   4. collapse runs of whitespace
-- This drops the distinct count to ~3,180 and merges the obvious dup
-- clusters (UNAM had 5 spellings, CINVESTAV had 4, etc.). True
-- canonicalization across the long tail (synonym dictionaries) is
-- still a separate task.

UPDATE snii.researcher_snapshots
SET institucion = regexp_replace(
  regexp_replace(
    upper(unaccent(institucion)),
    '\s*\(.*\)$|,.*$', '', 'g'  -- drop trailing "(ACRONYM)" and ", suffix"
  ),
  '\s+', ' ', 'g'                -- collapse whitespace
)
WHERE institucion IS NOT NULL;

-- Trim leading/trailing whitespace post-rewrite.
UPDATE snii.researcher_snapshots
SET institucion = btrim(institucion)
WHERE institucion IS NOT NULL AND institucion <> btrim(institucion);
