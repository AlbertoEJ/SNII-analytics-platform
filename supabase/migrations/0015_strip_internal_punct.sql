-- Catches the remaining ~15 institucion duplicate clusters that survived
-- 0013 + 0014:
--   - "CENTRO ... A.C" vs "CENTRO ... AC"     (~5 clusters)
--   - "CARNEGIE-MELLON" vs "CARNEGIE MELLON"  (hyphen variants, ~5)
--   - "MEXICO-ESTADOS UNIDOS" vs "MEXICO ESTADOS UNIDOS"
--   - "& INFORMATICA" vs " INFORMATICA"
--
-- Strip all periods, normalize hyphens and ampersands to spaces, then
-- collapse runs of whitespace. Verified beforehand that no genuinely-
-- distinct institutions collide under this rule (all merged clusters are
-- the same entity differing only by tax-form punctuation or dash style).

UPDATE snii.researcher_snapshots
SET institucion = regexp_replace(
  regexp_replace(
    regexp_replace(institucion, '[\.''""]', '', 'g'),  -- drop periods/quotes/apostrophes
    '[&\-]', ' ', 'g'                                  -- normalize - and & to space
  ),
  '\s+', ' ', 'g'                                      -- collapse spaces
)
WHERE institucion IS NOT NULL;

UPDATE snii.researcher_snapshots
SET institucion = btrim(institucion)
WHERE institucion IS NOT NULL AND institucion <> btrim(institucion);
