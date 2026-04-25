-- HISTORICAL — NO LONGER PART OF THE IMPORT PATH.
-- The same logic now runs in TypeScript inside the importer:
--   src/infrastructure/import/normalize/entidad.ts
-- Kept in this file for the historical record and so any pre-existing DB
-- can still apply it. New deployments don't need it; the importer writes
-- already-clean values.

-- Normalize snii.researcher_snapshots.entidad to the same canonical form used
-- by STATE_CODE_TO_DB_NAME (uppercase, no diacritics). Without this, the
-- home-page map's choropleth can't look up rows by name, and entidad-based
-- search misses accented variants. unaccent() is provided by the unaccent
-- extension already loaded in 0001.

-- Promote the rare "MEXICO" / "MÉXICO" stand-alone strings to the canonical
-- "ESTADO DE MEXICO" first, before the global uppercase+unaccent pass.
UPDATE snii.researcher_snapshots
SET entidad = 'ESTADO DE MEXICO'
WHERE entidad IN ('MEXICO', 'MÉXICO');

-- Veracruz and Coahuila have long-form variants that should collapse.
UPDATE snii.researcher_snapshots
SET entidad = 'VERACRUZ'
WHERE entidad = 'VERACRUZ DE IGNACIO DE LA LLAVE';

UPDATE snii.researcher_snapshots
SET entidad = 'COAHUILA'
WHERE entidad = 'COAHUILA DE ZARAGOZA';

UPDATE snii.researcher_snapshots
SET entidad = 'MICHOACAN'
WHERE entidad IN ('MICHOACAN DE OCAMPO', 'MICHOACÁN DE OCAMPO');

-- Strip diacritics + uppercase across the board.
UPDATE snii.researcher_snapshots
SET entidad = upper(unaccent(entidad))
WHERE entidad IS NOT NULL
  AND entidad <> upper(unaccent(entidad));

-- Null out the obviously-not-a-state placeholders so they don't pollute counts.
UPDATE snii.researcher_snapshots
SET entidad = NULL
WHERE entidad IN (
  'SIN ENTIDAD DE ACREDITACION',
  'SIN INFORMACION COMISION',
  'SIN INSTITUCION',
  'SIN INSTITUCION DE ADSCRIPCION',
  'SIN UBICACION DE COMISION',
  'EXTERIOR'
);
