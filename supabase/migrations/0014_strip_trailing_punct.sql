-- HISTORICAL — NO LONGER PART OF THE IMPORT PATH.
-- Logic now lives in src/infrastructure/import/normalize/institucion.ts.

-- 0013 collapsed accent/parens variants but missed trailing punctuation
-- ("CENTRO ... NACIONAL." vs "CENTRO ... NACIONAL"). Strip trailing
-- whitespace and periods, then collapse internal whitespace runs that
-- result from removing internal periods (e.g. "A. C." → "A C").

UPDATE snii.researcher_snapshots
SET institucion = regexp_replace(
  regexp_replace(institucion, '[\.\s]+$', ''),  -- trim trailing
  '\s+', ' ', 'g'                               -- collapse spaces
)
WHERE institucion IS NOT NULL;
