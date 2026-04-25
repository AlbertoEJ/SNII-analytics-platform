-- Final pass: canonicalize remaining institucion clusters by slug.
-- For each cluster of variants whose slug (alphanumeric-only, lowercase)
-- is identical, pick the most-common form and rewrite all variants to it.
-- This catches the residual "KING S COLLEGE" vs "KINGS COLLEGE",
-- "UNIVERSIDAD DE MONTEMORELOS A C" vs "UNIVERSIDAD DE MONTEMORELOS AC",
-- etc. that survived 0013/0014/0015.

WITH slugs AS (
  SELECT institucion,
         regexp_replace(institucion, '[^A-Z0-9]+', '', 'g') AS slug
  FROM snii.researcher_snapshots
  WHERE institucion IS NOT NULL
),
counts AS (
  SELECT institucion, slug, COUNT(*) AS n FROM slugs GROUP BY 1, 2
),
canon AS (
  SELECT slug,
         (array_agg(institucion ORDER BY n DESC, length(institucion) ASC))[1] AS canonical
  FROM counts GROUP BY slug
)
UPDATE snii.researcher_snapshots s
SET institucion = c.canonical
FROM canon c
WHERE s.institucion IS NOT NULL
  AND regexp_replace(s.institucion, '[^A-Z0-9]+', '', 'g') = c.slug
  AND s.institucion <> c.canonical;
