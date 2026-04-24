# Historic SNII — Design Spec

**Date:** 2026-04-24
**Status:** Approved (brainstorm phase)
**Scope:** Add historical (1984–2026) coverage to the SNII platform — a year-aware home-page map, a trends page, and per-researcher career timelines.

## 1. Goal

Today the platform shows a single snapshot of the SNII researcher roll (the 2026 padrón). We have 41 yearly historical files (1984–2025, missing 2021) plus the current 2026 padrón. This spec extends the platform to:

- **A1.** Make the existing home-page map time-travel via a year slider with play/pause animation (1984 → 2026).
- **B.** Add a new `/historic` trends page with six analytical views.
- **C1.** Add a per-researcher career-level timeline on the detail page.

All three rest on a unified yearly-snapshot data model and a one-time identity-resolution pass that links pre-2003 `EXPEDIENTE` records to post-2003 `CVU` records.

## 2. Source data

`Documents/Historico SNII/` contains:

- `Investigadores_vigentes_1984.xlsx` … `_2025.xlsx` — 41 files, missing 2021.
- `Padron_enero_2026.xlsx` — already loaded in the current `snii.researchers` table.

Total ≈ 583,682 row-years across ≈ 33,000 distinct researchers.

### Schema variation across eras

| Era | Years | Identity | State / Institution | Discipline tree |
|-----|-------|----------|---------------------|-----------------|
| early | 1984–1989 | EXPEDIENTE only | none | none (just área) |
| mid90s | 1990–1999 | EXPEDIENTE only | INSTITUCIÓN DE ADSCRIPCIÓN, ENTIDAD FEDERATIVA | none |
| cvu-era | 2000–2014 | EXPEDIENTE + CVU (CVU populated from 2003) | yes | yes |
| cvu-only | 2015–2020, 2022–2024 | CVU only | yes | yes |
| 2025 | 2025 | CVU (renamed "CVU padrón corregido") | INSTITUCIÓN DE ACREDITACIÓN | yes + CAMPO |
| 2026 | 2026 | CVU | ACREDITACIÓN / COMISIÓN / FINAL split | yes |

### Identity findings (from a scan of all files)

- **EXPEDIENTE → CVU is 1:1** (0 expedientes with multiple CVUs).
- **CVU → EXPEDIENTE is 1:1 in 27,799 / 27,883 cases (99.7%)**.
- **84 CVUs map to 2+ expedientes** — these are flagged as `ambiguous = TRUE` for warning banners.
- 64% of expedientes have multiple distinct *name strings* across years, but spot-checks show these are cosmetic (comma/space/diacritic differences). A single normalized form (uppercase + `unaccent` + collapse whitespace + strip punctuation + handle `Ä/Ð → Ñ` OCR artifacts) collapses them.

## 3. Data model

Two tables in the `snii` schema, replacing the current `snii.researchers`.

### `snii.researchers` — canonical identities

```sql
CREATE TABLE snii.researchers (
  canonical_id   BIGSERIAL PRIMARY KEY,
  cvu            BIGINT UNIQUE,                   -- nullable for pre-2003-only people
  expedientes    TEXT[] NOT NULL DEFAULT '{}',
  canonical_name TEXT   NOT NULL,
  name_variants  TEXT[] NOT NULL DEFAULT '{}',
  ambiguous      BOOLEAN NOT NULL DEFAULT FALSE,
  ambiguity_note TEXT,
  first_year     INT NOT NULL,
  last_year      INT NOT NULL
);
```

### `snii.researcher_snapshots` — per-researcher per-year state

```sql
CREATE TABLE snii.researcher_snapshots (
  canonical_id          BIGINT NOT NULL REFERENCES snii.researchers(canonical_id) ON DELETE CASCADE,
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
```

### Indexes

```sql
CREATE INDEX ON snii.researcher_snapshots (year);
CREATE INDEX ON snii.researcher_snapshots (year, entidad);
CREATE INDEX ON snii.researcher_snapshots (year, area_conocimiento);
CREATE INDEX ON snii.researcher_snapshots (year, nivel);
CREATE INDEX ON snii.researcher_snapshots (year, institucion);
CREATE INDEX ON snii.researchers USING gin (canonical_name gin_trgm_ops);
CREATE INDEX ON snii.researchers USING gin (expedientes);
```

### Field collapse rules (2025 / 2026)

When a row has both `INSTITUCIÓN FINAL` (or `INSTITUCIÓN DE COMISIÓN`) and `INSTITUCIÓN DE ACREDITACIÓN`, the snapshot's `institucion` column takes the first non-null of: `final`, `comisión`, `acreditación`. Same fallback chain for `entidad` and `dependencia`. The full multi-column 2026 detail is *not* preserved in v1 — if needed later, add a sidecar table.

## 4. Importer

`src/infrastructure/import/importHistorical.ts`

```
npx tsx src/infrastructure/import/importHistorical.ts <historic-dir>
```

### Era detection

Each file is classified by header presence:

```ts
const eras = [
  { match: ["EXPEDIENTE", "ÁREA DEL CONOCIMIENTO"],
    without: ["INSTITUCIÓN DE ADSCRIPCIÓN", "DISCIPLINA"], era: "early" },
  { match: ["EXPEDIENTE", "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA"],
    without: ["DISCIPLINA"], era: "mid90s" },
  { match: ["EXPEDIENTE", "DISCIPLINA"], era: "cvu-era" },
  { match: ["CVU", "INSTITUCIÓN DE ADSCRIPCIÓN"], era: "cvu-only" },
  { match: ["CVU padrón corregido", "INSTITUCIÓN DE ACREDITACIÓN"], era: "2025" },
  { match: ["INSTITUCION DE ACREDITACION", "INSTITUCION FINAL"], era: "2026" },
];
```

Each era owns a `headerMap` that translates raw headers to the canonical snapshot fields. Unknown era → hard error so we notice new file shapes.

### Identity resolution (two-pass)

1. **Pass 1** — read all files, extract `(year, cvu?, expediente?, name)` tuples. Normalize name in-flight.
2. **Pass 2** — union-find over the tuples:
   - Each distinct CVU seeds a canonical_id.
   - Each CVU absorbs every `expediente` it appeared with.
   - Pre-2003 rows (no CVU) link to a CVU's canonical_id by their expediente if known, else seed their own canonical_id with `cvu = NULL`.
   - **Ambiguity check**: a CVU whose expediente set overlaps another CVU's expediente set marks both as `ambiguous = TRUE`. The note records the colliding CVUs/expedientes.
3. Collect `name_variants` per canonical_id; `canonical_name` = the variant from the most recent year.

### Write

`TRUNCATE` both tables, then bulk-insert in batches of 1000. Idempotent — re-running with new files is safe.

### Performance budget

Full reload (41 files + 2026 padrón) ≤ 60s on local Postgres.

## 5. Domain & application layer

### Entities (`src/domain/entities/`)

- `ResearcherIdentity` — canonical_id, cvu, expedientes, names, ambiguity flag, first/last year.
- `ResearcherSnapshot` — canonical_id, year, plus every snapshot field.

### Repositories (`src/domain/repositories/`)

- `IdentityRepository` — `findByCanonicalId`, `findByCvu`, `search`.
- `SnapshotRepository` — `availableYears`, `countsByState(year, filters)`, `countsByLevel(year)`, `countsByArea(year)`, `countsByInstitution(year, limit)`, `totalsPerYear`, `levelsByYear`, `statesByYear`, `areasByYear`, `institutionsByYear(topN)`, `netFlowsByYear`, `timelineFor(canonicalId)`, `list(year, filters, page)`.

### Use cases (`src/application/use-cases/`)

`GetCountsByState` (refactored, year-aware), `GetTotalsPerYear`, `GetLevelsByYear`, `GetStatesByYear`, `GetAreasByYear`, `GetInstitutionsByYear`, `GetNetFlowsByYear`, `GetResearcherTimeline`, `GetAvailableYears`. Each is one query (RPC for aggregates).

### Infrastructure

`SupabaseIdentityRepository`, `SupabaseSnapshotRepository`. Aggregates go through SQL RPCs in `0006_historical_rpcs.sql`. DI via `lib/container.ts`.

## 6. UI — A1: Time-traveling map (home page)

`src/app/page.tsx` gets a `YearSlider` card above the existing map+ranking grid. Selected year lives in `?year=`, default = latest available.

### `YearSlider.tsx` (client component)

- Shadcn `Slider`, range = `[min, max]` from `availableYears`.
- Decade tick labels (1990, 2000, 2010, 2020).
- Play/pause button: `setInterval` advances year by 1 at speeds 1× = 1500 ms, 2× = 750 ms, 4× = 375 ms. Stops at max.
- 2021 marker: visible hatched tick on the track; auto-skipped during play.
- On change (debounced 300 ms): `router.replace` with new `?year=N` so the server re-renders.
- Keyboard: ←/→ to step.

### Server-side change

`page.tsx` reads `searchParams.year`, validates against `availableYears`, falls back to latest. Use cases (`getCountsByState`, `getStats`, `crossStateLevel`) take the year. `MexicoMap`, `MapLegend`, `AreaPills` unchanged.

### Pre-1990 empty state

Years 1984–1989 have no state data. The map shows a friendly empty state ("State-level data not available before 1990") with a link to `/historic`. Ranking panel is replaced by a brief explanation.

### Area filter per year

Pills show areas active in the selected year only — no cross-year taxonomy. Honest about the 2008 area-name change.

## 7. UI — B: Trends page (`/historic`)

Server component, `revalidate = 86400`. One scrollable page with six chart cards in this order:

1. **B1. Total per year** — single line, `LineChart`, dashed gap for 2021.
2. **B3. Levels over time** — stacked `AreaChart`, abs/percent toggle (client state).
3. **B6. Net flow** — diverging `BarChart`, entrants positive / departures negative. Pre-1990 only entrants (no prior data).
4. **B2. Growth by state** — 4×8 grid of mini sparkline `LineChart`s, sorted by 2026 count desc, click → `/researchers?entidad=…&year=…`. Pre-1990 shown flat-zero.
5. **B4. Areas of knowledge over time** — stacked `AreaChart` with non-dismissable note about 2008 taxonomy change.
6. **B5. Top institutions (top 15)** — bump chart (`LineChart` with rank on y-axis), hover highlights one line.

### Components in `src/presentation/components/historic/`

`TotalPerYearChart.tsx`, `LevelsAreaChart.tsx`, `NetFlowChart.tsx`, `StateSmallMultiples.tsx`, `AreasAreaChart.tsx`, `InstitutionBumpChart.tsx`. All client components; the page is a server component.

### Library

Recharts. Add to dependencies if not already present.

### Data flow

```ts
const [totals, levels, netFlows, states, areas, institutions] = await Promise.all([
  getTotalsPerYear.execute(),
  getLevelsByYear.execute(),
  getNetFlowsByYear.execute(),
  getStatesByYear.execute(),
  getAreasByYear.execute(),
  getInstitutionsByYear.execute({ topN: 15 }),
]);
```

Six RPCs in parallel, all indexed.

### Navigation

Top nav adds "Histórico / Historic" → `/historic`.

### Out of scope (v1)

No filters across the page, no CSV export, no animated chart entrances.

## 8. UI — C1: Career timeline (researcher detail)

### Route change

Today: `/researchers/[cvu]`. New: `/researchers/[id]` where `id` is either a numeric CVU *or* `c-<canonical_id>` for pre-2003-only researchers. Detail page resolves either form to a `canonical_id` via `IdentityRepository`.

### New section: "Trayectoria"

Above the existing detail body. Layout: a horizontal SVG strip, one cell per year from `firstYear` to `lastYear`.

- Filled with the level's color if the researcher had a snapshot that year.
- Empty/white for personal gaps.
- Hatched for `globallyMissingYears` (currently `[2021]`).
- CSS `<title>` tooltip per cell: `"2010 · Nivel 1"` or `"2008 · sin datos"`.
- Decade tick labels below.
- Heading: `"Trayectoria · activo {firstYear}–{lastYear} · {n} años"`.
- Color palette reused from `presentation/components/stats/CountPane`.

### `CareerTimeline.tsx`

Server-rendered SVG. Props:

```ts
interface CareerTimelineProps {
  snapshots: { year: number; nivel: SniiLevelCode | null }[];
  globallyMissingYears: number[];
  locale: Locale;
}
```

### Ambiguity warning

If the identity has `ambiguous = TRUE`, render an inline amber warning banner above the timeline:

> ⚠ Identidad ambigua: este expediente coincide con varios CVU. La trayectoria mostrada puede combinar registros de personas distintas.

(English equivalent for `locale === "en"`.) Permanent; no dismiss.

### Existing detail content

Continues to render — now reads from the *most recent* snapshot for that canonical_id. List page row links use `c-<canonical_id>` form when `cvu IS NULL`.

### Out of scope (C2/C3)

No promotion/transfer delta table. No multi-researcher comparison. No raw-list-only fallback.

## 9. Migration & rollout

### Migrations

- `0005_historical_schema.sql` — creates `snii.researchers_v2` and `snii.researcher_snapshots`.
- `0006_historical_rpcs.sql` — RPC functions for trends + year-aware analysis.
- `0007_historical_swap.sql` — `DROP TABLE snii.researchers CASCADE; ALTER TABLE snii.researchers_v2 RENAME TO researchers;`. Run only after the importer has populated v2 and the new code path is verified end-to-end.

### Order of operations

1. Land `0005` + `0006`.
2. Build `importHistorical.ts`, run against historic dir + 2026 padrón. Verify counts (~580k snapshots, ~33–35k identities, ~84 ambiguous).
3. Build new repos, use cases, components.
4. Wire `/historic` (new route) — uses `_v2`.
5. Wire `/` slider, `/researchers/[id]` timeline, year-aware `/stats` — all reading from `_v2`.
6. Verify QA checklist.
7. Run `0007` (rename swap). Delete old `importPadron.ts`.

### Testing

**Unit tests (`*.test.ts`, vitest, mocked repos):**
- `GetTotalsPerYear.test.ts`, `GetResearcherTimeline.test.ts`, `GetNetFlowsByYear.test.ts`.
- `normalizeName.test.ts` — diacritic, OCR `Ä/Ð → Ñ`, comma/space collapse, accept that `ECEVES TORRES`-typo cluster does *not* match.
- `eraDetection.test.ts` — each era's headers classify correctly; unknown era throws.
- `identityResolution.test.ts` — synthetic 2-CVU collision flags both as ambiguous.

**Integration tests (real Postgres):**
- `SupabaseSnapshotRepository.test.ts` — small fixture (3 years × 10 researchers), exercise each method.

**Manual QA checklist:**
- Slider plays from 1984 → 2026 without errors; pre-1990 shows the empty state.
- 2021 visually marked and skipped during play.
- `/historic` renders all six charts; numbers match a sanity-check `SELECT count(*) FROM researcher_snapshots WHERE year = 2010`.
- Timeline renders for a CVU-era researcher, a pre-2003-only researcher (URL `/researchers/c-XXXX`), and an ambiguous one (warning banner shows).
- Existing `/researchers` list and `/stats` still work after cutover.

### Performance budgets

- Importer reload: < 60s.
- `/historic` server render: < 800 ms.
- Slider year change: < 200 ms server response.

## 10. Out of scope (whole spec)

- CSV / Excel export.
- Multi-researcher comparison.
- Forecasting / predictions.
- Public data API.
- Search/filter UI changes on `/researchers` beyond a year filter.
- C2 (promotions/transfers detail), C3 (raw years-active fallback).
- Resolving the 84 ambiguous identities manually.
- Backfilling area-taxonomy mapping across the 2008 change.
