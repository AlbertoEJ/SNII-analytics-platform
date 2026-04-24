-- SNII platform schema
-- Isolated in `snii` schema; does not touch other schemas.

CREATE SCHEMA IF NOT EXISTS snii;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Researchers (Padron SNII enero 2026)
CREATE TABLE IF NOT EXISTS snii.researchers (
  cvu                          BIGINT       PRIMARY KEY,
  nombre                       TEXT         NOT NULL,
  nivel                        TEXT,
  categoria                    TEXT,
  fecha_inicio_vigencia        DATE,
  fecha_fin_vigencia           DATE,
  area_conocimiento            TEXT,
  disciplina                   TEXT,
  subdisciplina                TEXT,
  especialidad                 TEXT,
  cpi_s                        TEXT,
  institucion_acreditacion     TEXT,
  dependencia_acreditacion     TEXT,
  subdependencia_acreditacion  TEXT,
  departamento_acreditacion    TEXT,
  entidad_acreditacion         TEXT,
  posdoc_invest_por_mexico     TEXT,
  institucion_comision         TEXT,
  dependencia_comision         TEXT,
  ubicacion_comision           TEXT,
  institucion_final            TEXT,
  entidad_final                TEXT,
  notas                        TEXT,
  created_at                   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Search and filter indexes
CREATE INDEX IF NOT EXISTS idx_researchers_nombre_trgm
  ON snii.researchers USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_researchers_nivel
  ON snii.researchers (nivel);

CREATE INDEX IF NOT EXISTS idx_researchers_area
  ON snii.researchers (area_conocimiento);

CREATE INDEX IF NOT EXISTS idx_researchers_entidad_final
  ON snii.researchers (entidad_final);

CREATE INDEX IF NOT EXISTS idx_researchers_institucion_final
  ON snii.researchers (institucion_final);

-- Allow PostgREST (the Supabase REST layer) to expose this schema
GRANT USAGE ON SCHEMA snii TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA snii TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA snii TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA snii GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA snii GRANT ALL ON TABLES TO service_role;
