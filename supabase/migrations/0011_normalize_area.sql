-- Normalize snii.researcher_snapshots.area_conocimiento to one canonical
-- form per (roman-numeral) area. Five separate concerns:
--   1. Diacritics + casing vary (FÍSICO-MATEMÁTICAS vs FISICO-MATEMATICAS).
--   2. Separator after roman varies (I.- / I. / no roman prefix at all).
--   3. Trailing dot on some 2022/2023 forms (IV. ... .).
--   4. 2024-2025 dropped the roman prefix entirely.
--   5. The pre-2003 5-area taxonomy uses different category names; those
--      stay as-is — collapsing them would erase real history.
--
-- Approach: explicit rewrite per known variant → canonical. Leaves the
-- pre-2003 short-list (CIENCIAS FISICO-MATEMATICAS, CIENCIAS BIOLOGICAS-
-- BIOMEDICAS-QUIMICAS, CIENCIAS SOCIALES Y HUMANIDADES, HUMANIDADES Y
-- CIENCIAS DE LA CONDUCTA, INGENIERIA Y TECNOLOGIA) untouched.

-- ─── Pass 1: roman-prefixed variants → canonical "N. NAME" form ──────────

-- I: Físico-Matemáticas y Ciencias de la Tierra (post-1999)
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'I. FISICO-MATEMATICAS Y CIENCIAS DE LA TIERRA'
WHERE area_conocimiento IN (
  'I.- FÍSICO-MATEMÁTICAS Y CIENCIAS DE LA TIERRA',
  'I. FISICO-MATEMATICAS Y CIENCIAS DE LA TIERRA'
);

-- II: Biología y Química
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'II. BIOLOGIA Y QUIMICA'
WHERE area_conocimiento IN (
  'II.- BIOLOGÍA Y QUÍMICA',
  'II. BIOLOGIA Y QUIMICA',
  'II.- CIENCIAS BIOLÓGICAS, BIOMÉDICAS Y QUÍMICAS'  -- pre-2003 collapse
);

-- III: Medicina y Ciencias de la Salud
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'III. MEDICINA Y CIENCIAS DE LA SALUD'
WHERE area_conocimiento IN (
  'III.- MEDICINA Y CIENCIAS DE LA SALUD',
  'III. MEDICINA Y CIENCIAS DE LA SALUD'
);

-- IV: Ciencias de la Conducta y la Educación
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACION'
WHERE area_conocimiento IN (
  'IV.- CIENCIAS DE LA CONDUCTA Y LA EDUCACIÓN',
  'IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACION',
  'IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACIÓN.',
  'IV.- HUMANIDADES Y CIENCIAS DE LA CONDUCTA'  -- pre-2003 collapse
);

-- V: Humanidades
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'V. HUMANIDADES'
WHERE area_conocimiento IN (
  'V.- HUMANIDADES.',
  'V. HUMANIDADES'
);

-- VI: Ciencias Sociales
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VI. CIENCIAS SOCIALES'
WHERE area_conocimiento IN (
  'VI.- CIENCIAS SOCIALES',
  'VI. CIENCIAS SOCIALES',
  'V.- CIENCIAS SOCIALES'                          -- pre-2008 numbering
);

-- VII: Ciencias de Agricultura, Agropecuarias, Forestales y de Ecosistemas
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS'
WHERE area_conocimiento IN (
  'VII.- CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS',
  'VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS',
  'VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS.',
  'VI.- BIOTECNOLOGÍA Y CIENCIAS AGROPECUARIAS'   -- pre-2008 numbering
);

-- VIII: Ingenierías y Desarrollo Tecnológico
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VIII. INGENIERIAS Y DESARROLLO TECNOLOGICO'
WHERE area_conocimiento IN (
  'VIII.- INGENIERÍAS Y DESARROLLO TECNOLÓGICO',
  'VIII. INGENIERIAS Y DESARROLLO TECNOLOGICO',
  'VII.- INGENIERÍAS',                             -- pre-2008 numbering
  'IV.- INGENIERÍA Y TECNOLOGÍA'                   -- pre-2003 numbering
);

-- Pre-2003 "Ciencias Sociales y Humanidades" was a single bucket; collapse
-- to ciencias-sociales since the modern category split that's where it lives.
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VI. CIENCIAS SOCIALES'
WHERE area_conocimiento = 'III.- CIENCIAS SOCIALES Y HUMANIDADES';

-- IX: Interdisciplinaria
UPDATE snii.researcher_snapshots
SET area_conocimiento = 'IX. INTERDISCIPLINARIA'
WHERE area_conocimiento IN (
  'IX.- INTERDISCIPLINARIA',
  'IX. INTERDISCIPLINARIA',
  'IX. INTERDISCIPLINARIA.'
);

-- ─── Pass 2: 2024-2025 variants without roman prefix ──────────────────────

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'I. FISICO-MATEMATICAS Y CIENCIAS DE LA TIERRA'
WHERE area_conocimiento IN (
  'FÍSICO-MATEMÁTICAS Y CIENCIAS DE LA TIERRA',
  'Físico-Matemáticas y Ciencias de la Tierra'
);

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'II. BIOLOGIA Y QUIMICA'
WHERE area_conocimiento IN ('BIOLOGÍA Y QUÍMICA', 'Biología y Química');

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'III. MEDICINA Y CIENCIAS DE LA SALUD'
WHERE area_conocimiento IN ('MEDICINA Y CIENCIAS DE LA SALUD', 'Medicina y Ciencias de la Salud');

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACION'
WHERE area_conocimiento IN (
  'CIENCIAS DE LA CONDUCTA Y LA EDUCACIÓN',
  'Ciencias de la Conducta y la Educación'
);

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'V. HUMANIDADES'
WHERE area_conocimiento IN ('HUMANIDADES', 'Humanidades');

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VI. CIENCIAS SOCIALES'
WHERE area_conocimiento IN ('CIENCIAS SOCIALES', 'Ciencias Sociales');

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS'
WHERE area_conocimiento IN (
  'CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS',
  'Ciencias de Agricultura, Agropecuarias, Forestales y de Ecosistemas'
);

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'VIII. INGENIERIAS Y DESARROLLO TECNOLOGICO'
WHERE area_conocimiento IN (
  'INGENIERÍAS Y DESARROLLO TECNOLÓGICO'
);

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'IX. INTERDISCIPLINARIA'
WHERE area_conocimiento IN ('INTERDISCIPLINARIA', 'Interdisciplinaria');

-- ─── Pass 3: pre-2003 area "I.- CIENCIAS FÍSICO-MATEMÁTICAS" ──────────────
-- This is a conscious collapse: the post-1999 form already includes the
-- "Ciencias de la Tierra" expansion, but for filter UX we want a single
-- area-1 bucket spanning all years.

UPDATE snii.researcher_snapshots
SET area_conocimiento = 'I. FISICO-MATEMATICAS Y CIENCIAS DE LA TIERRA'
WHERE area_conocimiento = 'I.- CIENCIAS FÍSICO-MATEMÁTICAS';

-- Final sanity: emit any leftover unmatched values so they're visible.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT area_conocimiento
    FROM snii.researcher_snapshots
    WHERE area_conocimiento IS NOT NULL
      AND area_conocimiento NOT LIKE '_X. %'
      AND area_conocimiento NOT LIKE '_. %'
      AND area_conocimiento NOT LIKE '__. %'
      AND area_conocimiento NOT LIKE '___. %'
  LOOP
    RAISE NOTICE 'Unmatched area: %', r.area_conocimiento;
  END LOOP;
END $$;
