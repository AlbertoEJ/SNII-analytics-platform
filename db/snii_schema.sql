--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6
-- Manual edits applied: removed \restrict / \unrestrict psql meta-commands so
-- this file can be pasted into the Supabase SQL editor. Required extensions
-- (pg_trgm, unaccent) are created up front in db/apply_to_cloud.sql.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: snii; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA snii;


--
-- Name: immutable_unaccent(text); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $_$
  SELECT public.unaccent('public.unaccent', $1);
$_$;


--
-- Name: snapshots_area_discipline_breakdown(integer); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_area_discipline_breakdown(p_year integer) RETURNS TABLE(area text, discipline text, subdiscipline text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT area_conocimiento::text, COALESCE(disciplina, '—')::text,
         COALESCE(subdisciplina, '—')::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND area_conocimiento IS NOT NULL
  GROUP BY 1, 2, 3 ORDER BY 1, 2, 4 DESC;
$$;


--
-- Name: snapshots_areas_by_year(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_areas_by_year() RETURNS TABLE(year integer, area text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT year, area_conocimiento::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE area_conocimiento IS NOT NULL
  GROUP BY year, area_conocimiento
  ORDER BY year, area_conocimiento;
$$;


--
-- Name: snapshots_available_years(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_available_years() RETURNS TABLE(year integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT DISTINCT year FROM snii.researcher_snapshots ORDER BY year;
$$;


--
-- Name: snapshots_counts_by_column(text, integer); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_counts_by_column(p_column text, p_year integer) RETURNS TABLE(value text, count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $_$
BEGIN
  IF p_column NOT IN ('nivel', 'area_conocimiento', 'entidad', 'institucion') THEN
    RAISE EXCEPTION 'invalid column: %', p_column;
  END IF;
  RETURN QUERY EXECUTE format(
    'SELECT %I::text AS value, COUNT(*)::bigint AS count
     FROM snii.researcher_snapshots
     WHERE year = $1 AND %I IS NOT NULL
     GROUP BY %I ORDER BY count DESC',
    p_column, p_column, p_column
  ) USING p_year;
END;
$_$;


--
-- Name: snapshots_counts_by_institution(integer); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_counts_by_institution(p_year integer) RETURNS TABLE(institucion text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT institucion::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND institucion IS NOT NULL
  GROUP BY institucion ORDER BY 2 DESC;
$$;


--
-- Name: snapshots_counts_by_state(integer, text); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_counts_by_state(p_year integer, p_area text DEFAULT NULL::text) RETURNS TABLE(entidad text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT entidad::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year
    AND entidad IS NOT NULL
    AND (p_area IS NULL OR area_conocimiento = p_area)
  GROUP BY entidad
  ORDER BY 2 DESC;
$$;


--
-- Name: snapshots_cross_state_level(integer); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_cross_state_level(p_year integer) RETURNS TABLE(entidad text, c bigint, n1 bigint, n2 bigint, n3 bigint, e bigint, total bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT entidad::text,
         COUNT(*) FILTER (WHERE nivel = 'C')::bigint,
         COUNT(*) FILTER (WHERE nivel = '1')::bigint,
         COUNT(*) FILTER (WHERE nivel = '2')::bigint,
         COUNT(*) FILTER (WHERE nivel = '3')::bigint,
         COUNT(*) FILTER (WHERE nivel = 'E')::bigint,
         COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND entidad IS NOT NULL
  GROUP BY entidad ORDER BY 7 DESC;
$$;


--
-- Name: snapshots_institutions_by_year(integer); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_institutions_by_year(p_top_n integer DEFAULT 15) RETURNS TABLE(year integer, institucion text, count bigint, rank integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  WITH per AS (
    SELECT year, institucion::text AS institucion, COUNT(*)::bigint AS count,
           ROW_NUMBER() OVER (PARTITION BY year ORDER BY COUNT(*) DESC) AS rnk
    FROM snii.researcher_snapshots
    WHERE institucion IS NOT NULL
    GROUP BY year, institucion
  )
  SELECT year, institucion, count, rnk::int
  FROM per
  WHERE rnk <= p_top_n
  ORDER BY year, rnk;
$$;


--
-- Name: snapshots_levels_by_year(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_levels_by_year() RETURNS TABLE(year integer, nivel text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT year, COALESCE(nivel, '—')::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  GROUP BY year, COALESCE(nivel, '—')
  ORDER BY year, 2;
$$;


--
-- Name: snapshots_net_flows_by_year(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_net_flows_by_year() RETURNS TABLE(year integer, entrants bigint, departures bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  WITH years AS (SELECT DISTINCT year FROM snii.researcher_snapshots),
       e AS (
         SELECT first_year AS year, COUNT(*)::bigint AS entrants
         FROM snii.researchers GROUP BY first_year
       ),
       d AS (
         SELECT last_year + 1 AS year, COUNT(*)::bigint AS departures
         FROM snii.researchers GROUP BY last_year + 1
       )
  SELECT y.year, COALESCE(e.entrants, 0), COALESCE(d.departures, 0)
  FROM years y
  LEFT JOIN e USING (year)
  LEFT JOIN d USING (year)
  ORDER BY y.year;
$$;


--
-- Name: snapshots_states_by_year(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_states_by_year() RETURNS TABLE(year integer, entidad text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT year, entidad::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE entidad IS NOT NULL
  GROUP BY year, entidad
  ORDER BY year, entidad;
$$;


--
-- Name: snapshots_timeline_for(bigint); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_timeline_for(p_canonical_id bigint) RETURNS TABLE(year integer, nivel text, categoria text, area_conocimiento text, disciplina text, subdisciplina text, especialidad text, institucion text, dependencia text, entidad text, pais text, fecha_inicio_vigencia date, fecha_fin_vigencia date, source_file text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT year, nivel, categoria, area_conocimiento, disciplina, subdisciplina,
         especialidad, institucion, dependencia, entidad, pais,
         fecha_inicio_vigencia, fecha_fin_vigencia, source_file
  FROM snii.researcher_snapshots
  WHERE canonical_id = p_canonical_id
  ORDER BY year;
$$;


--
-- Name: snapshots_totals_per_year(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.snapshots_totals_per_year() RETURNS TABLE(year integer, count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
  SELECT year, COUNT(*)::bigint FROM snii.researcher_snapshots GROUP BY year ORDER BY year;
$$;


--
-- Name: truncate_v2_tables(); Type: FUNCTION; Schema: snii; Owner: -
--

CREATE FUNCTION snii.truncate_v2_tables() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'snii', 'pg_temp'
    AS $$
BEGIN
  TRUNCATE snii.researcher_snapshots, snii.researchers RESTART IDENTITY;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: researcher_snapshots; Type: TABLE; Schema: snii; Owner: -
--

CREATE TABLE snii.researcher_snapshots (
    canonical_id bigint NOT NULL,
    year integer NOT NULL,
    nivel text,
    categoria text,
    area_conocimiento text,
    disciplina text,
    subdisciplina text,
    especialidad text,
    institucion text,
    dependencia text,
    entidad text,
    pais text,
    fecha_inicio_vigencia date,
    fecha_fin_vigencia date,
    source_file text NOT NULL
);


--
-- Name: researchers; Type: TABLE; Schema: snii; Owner: -
--

CREATE TABLE snii.researchers (
    canonical_id bigint NOT NULL,
    cvu bigint,
    expedientes text[] DEFAULT '{}'::text[] NOT NULL,
    canonical_name text NOT NULL,
    name_variants text[] DEFAULT '{}'::text[] NOT NULL,
    ambiguous boolean DEFAULT false NOT NULL,
    ambiguity_note text,
    first_year integer NOT NULL,
    last_year integer NOT NULL
);


--
-- Name: researchers_v2_canonical_id_seq; Type: SEQUENCE; Schema: snii; Owner: -
--

CREATE SEQUENCE snii.researchers_v2_canonical_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: researchers_v2_canonical_id_seq; Type: SEQUENCE OWNED BY; Schema: snii; Owner: -
--

ALTER SEQUENCE snii.researchers_v2_canonical_id_seq OWNED BY snii.researchers.canonical_id;


--
-- Name: researchers canonical_id; Type: DEFAULT; Schema: snii; Owner: -
--

ALTER TABLE ONLY snii.researchers ALTER COLUMN canonical_id SET DEFAULT nextval('snii.researchers_v2_canonical_id_seq'::regclass);


--
-- Name: researcher_snapshots researcher_snapshots_pkey; Type: CONSTRAINT; Schema: snii; Owner: -
--

ALTER TABLE ONLY snii.researcher_snapshots
    ADD CONSTRAINT researcher_snapshots_pkey PRIMARY KEY (canonical_id, year);


--
-- Name: researchers researchers_v2_cvu_key; Type: CONSTRAINT; Schema: snii; Owner: -
--

ALTER TABLE ONLY snii.researchers
    ADD CONSTRAINT researchers_v2_cvu_key UNIQUE (cvu);


--
-- Name: researchers researchers_v2_pkey; Type: CONSTRAINT; Schema: snii; Owner: -
--

ALTER TABLE ONLY snii.researchers
    ADD CONSTRAINT researchers_v2_pkey PRIMARY KEY (canonical_id);


--
-- Name: idx_snap_year; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_snap_year ON snii.researcher_snapshots USING btree (year);


--
-- Name: idx_snap_year_area; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_snap_year_area ON snii.researcher_snapshots USING btree (year, area_conocimiento);


--
-- Name: idx_snap_year_entidad; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_snap_year_entidad ON snii.researcher_snapshots USING btree (year, entidad);


--
-- Name: idx_snap_year_institucion; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_snap_year_institucion ON snii.researcher_snapshots USING btree (year, institucion);


--
-- Name: idx_snap_year_nivel; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_snap_year_nivel ON snii.researcher_snapshots USING btree (year, nivel);


--
-- Name: idx_v2_canonical_name_trgm; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_v2_canonical_name_trgm ON snii.researchers USING gin (canonical_name public.gin_trgm_ops);


--
-- Name: idx_v2_expedientes_gin; Type: INDEX; Schema: snii; Owner: -
--

CREATE INDEX idx_v2_expedientes_gin ON snii.researchers USING gin (expedientes);


--
-- Name: researcher_snapshots researcher_snapshots_canonical_id_fkey; Type: FK CONSTRAINT; Schema: snii; Owner: -
--

ALTER TABLE ONLY snii.researcher_snapshots
    ADD CONSTRAINT researcher_snapshots_canonical_id_fkey FOREIGN KEY (canonical_id) REFERENCES snii.researchers(canonical_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


