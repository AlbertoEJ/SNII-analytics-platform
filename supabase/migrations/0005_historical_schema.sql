-- Unified yearly-snapshot model. The current snii.researchers stays in place
-- for now; v2 tables live alongside it until 0007 swaps them.

-- Identity table — one row per canonical researcher.
CREATE TABLE IF NOT EXISTS snii.researchers_v2 (
  canonical_id   BIGSERIAL PRIMARY KEY,
  cvu            BIGINT UNIQUE,
  expedientes    TEXT[] NOT NULL DEFAULT '{}',
  canonical_name TEXT   NOT NULL,
  name_variants  TEXT[] NOT NULL DEFAULT '{}',
  ambiguous      BOOLEAN NOT NULL DEFAULT FALSE,
  ambiguity_note TEXT,
  first_year     INT NOT NULL,
  last_year      INT NOT NULL
);

-- Snapshot table — one row per researcher per year.
CREATE TABLE IF NOT EXISTS snii.researcher_snapshots (
  canonical_id          BIGINT NOT NULL
    REFERENCES snii.researchers_v2(canonical_id) ON DELETE CASCADE,
  year                  INT    NOT NULL,
  nivel                 TEXT,
  categoria             TEXT,
  area_conocimiento     TEXT,
  disciplina            TEXT,
  subdisciplina         TEXT,
  especialidad          TEXT,
  institucion           TEXT,
  dependencia           TEXT,
  entidad               TEXT,
  pais                  TEXT,
  fecha_inicio_vigencia DATE,
  fecha_fin_vigencia    DATE,
  source_file           TEXT NOT NULL,
  PRIMARY KEY (canonical_id, year)
);

-- Indexes for year-filtered reads (every page filters by year).
CREATE INDEX IF NOT EXISTS idx_snap_year                ON snii.researcher_snapshots (year);
CREATE INDEX IF NOT EXISTS idx_snap_year_entidad        ON snii.researcher_snapshots (year, entidad);
CREATE INDEX IF NOT EXISTS idx_snap_year_area           ON snii.researcher_snapshots (year, area_conocimiento);
CREATE INDEX IF NOT EXISTS idx_snap_year_nivel          ON snii.researcher_snapshots (year, nivel);
CREATE INDEX IF NOT EXISTS idx_snap_year_institucion    ON snii.researcher_snapshots (year, institucion);
CREATE INDEX IF NOT EXISTS idx_v2_canonical_name_trgm   ON snii.researchers_v2 USING gin (canonical_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_v2_expedientes_gin       ON snii.researchers_v2 USING gin (expedientes);

-- Allow PostgREST to expose them.
GRANT SELECT ON snii.researchers_v2 TO anon, authenticated;
GRANT SELECT ON snii.researcher_snapshots TO anon, authenticated;
GRANT ALL    ON snii.researchers_v2 TO service_role;
GRANT ALL    ON snii.researcher_snapshots TO service_role;
