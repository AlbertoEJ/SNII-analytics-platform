-- Drop the old single-snapshot researchers table and rename _v2 to canonical.
-- ONLY run this after the importer has populated _v2 and the new code
-- (home page, /historic, [id] route) is verified end-to-end.

BEGIN;

-- Drop old RPCs that referenced the old table.
DROP FUNCTION IF EXISTS snii.cross_state_level();
DROP FUNCTION IF EXISTS snii.area_discipline_breakdown();
DROP FUNCTION IF EXISTS snii.counts_by_institution();
DROP FUNCTION IF EXISTS snii.researcher_counts_by_column(text);
DROP FUNCTION IF EXISTS snii.researchers_by_state(text);

-- Drop old table.
DROP TABLE IF EXISTS snii.researchers CASCADE;

-- Rename v2 → canonical.
ALTER TABLE snii.researchers_v2 RENAME TO researchers;

COMMIT;
