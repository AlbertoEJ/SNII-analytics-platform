-- HISTORICAL — NO LONGER PART OF THE IMPORT PATH.
-- Logic now lives in src/infrastructure/import/normalize/{nivel,categoria,
-- pais,dependencia,institucion}.ts.

-- Normalize the rest of the easily-fixable string columns.
--   1. nivel: collapse long-form ("Investigador(a) Nacional Nivel I") and
--      "Emérito" to the canonical single-character codes. Without this,
--      ~40k snapshots show as "Sin nivel registrado" in the UI.
--   2. categoria: 4 distinct values, just casing/diacritic drift.
--   3. pais: null out placeholder strings; uppercase + unaccent the rest.
--   4. dependencia: null out placeholder strings.
--   5. institucion: null out placeholder strings (full canonicalization
--      across 3,649 institution name variants is deferred).

-- ─── nivel ────────────────────────────────────────────────────────────────

UPDATE snii.researcher_snapshots SET nivel = 'C'
WHERE nivel IN ('Candidato(a) a Investigador(a) Nacional', 'Candidato(a) a Investigador Nacional');

UPDATE snii.researcher_snapshots SET nivel = '1'
WHERE nivel = 'Investigador(a) Nacional Nivel I';

UPDATE snii.researcher_snapshots SET nivel = '2'
WHERE nivel = 'Investigador(a) Nacional Nivel II';

UPDATE snii.researcher_snapshots SET nivel = '3'
WHERE nivel = 'Investigador(a) Nacional Nivel III';

UPDATE snii.researcher_snapshots SET nivel = 'E'
WHERE nivel = 'Emérito';

-- ─── categoria ────────────────────────────────────────────────────────────

UPDATE snii.researcher_snapshots SET categoria = 'EXTENSION 15 ANOS'
WHERE categoria IN ('EXTENSIÓN 15 AÑOS', 'EXTENSION 15 AÑOS');

UPDATE snii.researcher_snapshots SET categoria = 'EMERITO'
WHERE categoria IN ('EMERITO', 'EMÉRITO');

-- ─── pais ─────────────────────────────────────────────────────────────────

-- Placeholders → NULL. These are not countries.
UPDATE snii.researcher_snapshots
SET pais = NULL
WHERE pais IN (
  'SIN INSTITUCIÓN',
  'Sin Institución de adscripción',
  'Sin Institución de Adscripción',
  'SIN INSTITUCIÓN DE ADSCRIPCIÓN'
);

-- Uppercase + unaccent for cross-year consistency.
UPDATE snii.researcher_snapshots
SET pais = upper(unaccent(pais))
WHERE pais IS NOT NULL AND pais <> upper(unaccent(pais));

-- Manual mappings for known synonym variants surfaced after the unaccent pass.
UPDATE snii.researcher_snapshots SET pais = 'ESTADOS UNIDOS'
WHERE pais IN ('USA');
UPDATE snii.researcher_snapshots SET pais = 'REINO UNIDO'
WHERE pais IN ('GRAN BRETANA', 'INGLATERRA', 'ESCOCIA');
UPDATE snii.researcher_snapshots SET pais = 'PAISES BAJOS'
WHERE pais IN ('HOLANDA');
UPDATE snii.researcher_snapshots SET pais = 'COREA DEL SUR'
WHERE pais IN ('KOREA');
UPDATE snii.researcher_snapshots SET pais = 'SINGAPUR'
WHERE pais IN ('SINGAPORE');
UPDATE snii.researcher_snapshots SET pais = 'EMIRATOS ARABES UNIDOS'
WHERE pais IN ('EMIRATOS ARABES');
UPDATE snii.researcher_snapshots SET pais = 'OMAN'
WHERE pais IN ('OMÁN');

-- ─── dependencia ──────────────────────────────────────────────────────────

UPDATE snii.researcher_snapshots
SET dependencia = NULL
WHERE dependencia IN (
  'No Disponible',
  'NO DISPONIBLE',
  'NO ESPECIFICADO',
  'Sin Institución de adscripción',
  'SIN INFORMACIÓN',
  'Sin Información',
  'SIN INSTITUCION',
  'SIN INSTITUCIÓN',
  'SIN INSTITUCIÓN REGISTRADA EN EL SNII',
  'SIN INSTITUCIÓN DE ADSCRIPCIÓN'
);

-- ─── institucion ──────────────────────────────────────────────────────────
-- Canonicalizing the 3,649 distinct institution names is a separate task.
-- For now, only null out the obvious "no institution" placeholders so the
-- bump chart and search filter don't show them as institutions.

UPDATE snii.researcher_snapshots
SET institucion = NULL
WHERE institucion IN (
  'SIN INSTITUCIÓN DE COMISIÓN',
  'Sin Institución de adscripción',
  'SIN INSTITUCIÓN',
  'SIN INSTITUCION',
  'SIN INSTITUCIÓN DE ADSCRIPCIÓN',
  'Sin Institución de Adscripción',
  'SIN INFORMACIÓN COMISIÓN',
  'Sin Institución de Adscripcipción'
);
