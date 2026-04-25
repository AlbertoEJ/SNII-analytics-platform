-- Apply this in the Supabase SQL editor on a fresh project.
-- Order matters: extensions, then schema, then RLS policies.

-- 1. Extensions used by the snii schema.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Schema, tables, indexes, functions.
-- (Paste the contents of snii_schema.sql here, or run it as a second statement
-- in the SQL editor. Keep it as a separate file so re-dumps stay clean.)

-- 3. Row-level security: read-only public access for the browse app.
-- The app uses the anon/publishable key from the browser; we want it to be
-- able to SELECT but never write. Service-role key bypasses RLS for the
-- importer.
ALTER TABLE snii.researchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE snii.researcher_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read researchers"
  ON snii.researchers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon read snapshots"
  ON snii.researcher_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. PostgREST needs to see the schema. The Supabase dashboard equivalent is
-- Settings → API → Exposed schemas → add "snii". This GRANT is what actually
-- lets the anon role hit the tables once they're exposed.
GRANT USAGE ON SCHEMA snii TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA snii TO anon, authenticated;

-- The importer connects with the service_role key, which bypasses RLS, so it
-- doesn't need an insert/update/delete policy.
