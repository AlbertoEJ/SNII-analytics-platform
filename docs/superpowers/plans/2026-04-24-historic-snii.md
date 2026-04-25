# Historic SNII Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add historical (1984–2026) coverage to the SNII platform: a year-aware home-page map with a play/pause slider, a `/historic` trends page with six analytical charts, and a per-researcher career-level timeline on the detail page.

**Architecture:** A unified yearly-snapshot model (`snii.researchers` for canonical identities, `snii.researcher_snapshots` for per-year state) replaces the current single-snapshot table. A one-time identity-resolution pass links pre-2003 `EXPEDIENTE` records to post-2003 `CVU` records. New repository + use cases provide year-filtered reads. UI work layers on top of the existing clean-architecture stack (domain → application → infrastructure → presentation, wired via `lib/container.ts`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Supabase JS (`db: { schema: "snii" }`), Postgres RPCs, d3 (`d3-shape`, `d3-scale`) for charts, vitest for tests, `xlsx` for the importer.

**Spec:** `docs/superpowers/specs/2026-04-24-historic-snii-design.md`

---

## File structure overview

### New files
- `supabase/migrations/0005_historical_schema.sql` — `_v2` tables and indexes.
- `supabase/migrations/0006_historical_rpcs.sql` — RPCs for trends + year-aware analysis.
- `supabase/migrations/0007_historical_swap.sql` — drops old `snii.researchers`, renames `_v2` to canonical names.
- `src/domain/entities/ResearcherIdentity.ts`
- `src/domain/entities/ResearcherSnapshot.ts`
- `src/domain/repositories/IdentityRepository.ts`
- `src/domain/repositories/SnapshotRepository.ts`
- `src/infrastructure/import/normalizeName.ts` (+ `.test.ts`)
- `src/infrastructure/import/eraDetection.ts` (+ `.test.ts`)
- `src/infrastructure/import/identityResolution.ts` (+ `.test.ts`)
- `src/infrastructure/import/importHistorical.ts` — replaces `importPadron.ts`.
- `src/infrastructure/repositories/SupabaseIdentityRepository.ts`
- `src/infrastructure/repositories/SupabaseSnapshotRepository.ts`
- `src/application/use-cases/GetTotalsPerYear.ts` (+ `.test.ts`)
- `src/application/use-cases/GetLevelsByYear.ts`
- `src/application/use-cases/GetStatesByYear.ts`
- `src/application/use-cases/GetAreasByYear.ts`
- `src/application/use-cases/GetInstitutionsByYear.ts`
- `src/application/use-cases/GetNetFlowsByYear.ts`
- `src/application/use-cases/GetResearcherTimeline.ts` (+ `.test.ts`)
- `src/application/use-cases/GetAvailableYears.ts`
- `src/app/historic/page.tsx`
- `src/app/historic/loading.tsx`
- `src/presentation/components/YearSlider.tsx`
- `src/presentation/components/researcher/CareerTimeline.tsx`
- `src/presentation/components/historic/TotalPerYearChart.tsx`
- `src/presentation/components/historic/LevelsAreaChart.tsx`
- `src/presentation/components/historic/NetFlowChart.tsx`
- `src/presentation/components/historic/StateSmallMultiples.tsx`
- `src/presentation/components/historic/AreasAreaChart.tsx`
- `src/presentation/components/historic/InstitutionBumpChart.tsx`

### Files modified
- `src/domain/repositories/ResearcherRepository.ts` — `countsByState`, `crossStateLevel`, `distinctValues`, `facets` accept an optional `year`.
- `src/infrastructure/repositories/SupabaseResearcherRepository.ts` — passes `year` to RPCs that now accept it.
- `src/lib/container.ts` — wires the new repos and use cases.
- `src/app/page.tsx` — reads `?year=`, renders `YearSlider`, passes `year` to use cases.
- `src/app/researchers/[cvu]/page.tsx` → renamed to `src/app/researchers/[id]/page.tsx`. Resolves `id` (numeric CVU or `c-<canonical_id>` token) to a canonical id, renders `CareerTimeline`, shows the ambiguity warning.
- `src/app/researchers/page.tsx` — list rows link via `c-<canonical_id>` when `cvu IS NULL`.
- `src/presentation/i18n/messages.ts` — adds `slider.*`, `historic.*`, `researcher.timeline.*`, `researcher.ambiguous` strings (es + en).
- `src/presentation/components/AppShell.tsx` (or wherever nav items live) — adds `/historic` link.

### Files deleted
- `src/infrastructure/import/importPadron.ts` (after `0007` swap).

---

## Phase 1 — Data model + identity resolution + importer

### Task 1: Migration `0005_historical_schema.sql`

**Files:**
- Create: `supabase/migrations/0005_historical_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run: `npx supabase migration up` (or whatever the project uses to apply migrations against the local Postgres — check `README.md` if unclear; if no script exists, run the SQL directly via `psql` against the local Supabase Postgres URL from `.env.local`).
Expected: command succeeds, both tables exist.

- [ ] **Step 3: Verify schema with a quick `psql` check**

Run from a `psql` session against local Supabase:
```sql
\dt snii.*
```
Expected: lists `snii.researchers`, `snii.researchers_v2`, `snii.researcher_snapshots`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_historical_schema.sql
git commit -m "feat(snii): add historical _v2 schema (researchers + snapshots)"
```

---

### Task 2: Domain entities — `ResearcherIdentity` and `ResearcherSnapshot`

**Files:**
- Create: `src/domain/entities/ResearcherIdentity.ts`
- Create: `src/domain/entities/ResearcherSnapshot.ts`

- [ ] **Step 1: Write `ResearcherIdentity.ts`**

```ts
export interface ResearcherIdentity {
  canonicalId: number;
  cvu: number | null;
  expedientes: string[];
  canonicalName: string;
  nameVariants: string[];
  ambiguous: boolean;
  ambiguityNote: string | null;
  firstYear: number;
  lastYear: number;
}
```

- [ ] **Step 2: Write `ResearcherSnapshot.ts`**

```ts
import type { SniiLevelCode } from "../value-objects/SniiLevel";

export interface ResearcherSnapshot {
  canonicalId: number;
  year: number;
  nivel: SniiLevelCode | null;
  categoria: string | null;
  areaConocimiento: string | null;
  disciplina: string | null;
  subdisciplina: string | null;
  especialidad: string | null;
  institucion: string | null;
  dependencia: string | null;
  entidad: string | null;
  pais: string | null;
  fechaInicioVigencia: string | null;
  fechaFinVigencia: string | null;
  sourceFile: string;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/entities/ResearcherIdentity.ts src/domain/entities/ResearcherSnapshot.ts
git commit -m "feat(domain): add ResearcherIdentity and ResearcherSnapshot entities"
```

---

### Task 3: Domain repository interfaces

**Files:**
- Create: `src/domain/repositories/IdentityRepository.ts`
- Create: `src/domain/repositories/SnapshotRepository.ts`

- [ ] **Step 1: Write `IdentityRepository.ts`**

```ts
import type { ResearcherIdentity } from "../entities/ResearcherIdentity";

export interface IdentityRepository {
  findByCanonicalId(id: number): Promise<ResearcherIdentity | null>;
  findByCvu(cvu: number): Promise<ResearcherIdentity | null>;
  search(query: string, opts: { year?: number; limit: number; offset: number }): Promise<ResearcherIdentity[]>;
}
```

- [ ] **Step 2: Write `SnapshotRepository.ts`**

```ts
import type { ResearcherSnapshot } from "../entities/ResearcherSnapshot";

export interface YearTotal { year: number; count: number }
export interface YearLevelCount { year: number; nivel: string; count: number }
export interface YearStateCount { year: number; entidad: string; count: number }
export interface YearAreaCount { year: number; area: string; count: number }
export interface YearInstitutionCount { year: number; institucion: string; count: number; rank: number }
export interface YearNetFlow { year: number; entrants: number; departures: number }
export interface YearStateCountFiltered { entidad: string; count: number }

export interface SnapshotRepository {
  availableYears(): Promise<number[]>;
  countsByState(year: number, filters?: { area?: string }): Promise<YearStateCountFiltered[]>;
  totalsPerYear(): Promise<YearTotal[]>;
  levelsByYear(): Promise<YearLevelCount[]>;
  statesByYear(): Promise<YearStateCount[]>;
  areasByYear(): Promise<YearAreaCount[]>;
  institutionsByYear(topN: number): Promise<YearInstitutionCount[]>;
  netFlowsByYear(): Promise<YearNetFlow[]>;
  timelineFor(canonicalId: number): Promise<ResearcherSnapshot[]>;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/repositories/IdentityRepository.ts src/domain/repositories/SnapshotRepository.ts
git commit -m "feat(domain): add IdentityRepository and SnapshotRepository interfaces"
```

---

### Task 4: `normalizeName` utility (TDD)

**Files:**
- Create: `src/infrastructure/import/normalizeName.test.ts`
- Create: `src/infrastructure/import/normalizeName.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeName } from "./normalizeName";

describe("normalizeName", () => {
  it("uppercases and removes accents", () => {
    expect(normalizeName("José María Pérez")).toBe("JOSE MARIA PEREZ");
  });

  it("collapses whitespace and strips commas", () => {
    expect(normalizeName("ABREU GROBOIS, FEDERICO ALBERTO"))
      .toBe(normalizeName("ABREU GROBOIS,FEDERICO ALBERTO"));
    expect(normalizeName("ABREU GROBOIS, FEDERICO ALBERTO"))
      .toBe(normalizeName("ABREU GROBOIS FEDERICO ALBERTO"));
  });

  it("repairs OCR artifacts Ä and Ð back to Ñ", () => {
    expect(normalizeName("ALLEN ARMIÄO")).toBe(normalizeName("ALLEN ARMIÑO"));
    expect(normalizeName("ALLEN ARMIÐO")).toBe(normalizeName("ALLEN ARMIÑO"));
  });

  it("strips punctuation other than letters/digits/spaces", () => {
    expect(normalizeName("O'BRIEN-SMITH, J.")).toBe("OBRIENSMITH J");
  });

  it("returns empty string for nullish inputs", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName("")).toBe("");
  });

  it("does NOT match a real typo cluster (ECEVES vs ACEVES)", () => {
    expect(normalizeName("ECEVES TORRES, RAUL"))
      .not.toBe(normalizeName("ACEVES TORRES, RAUL"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/import/normalizeName.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
const OCR_FIXES: Array<[RegExp, string]> = [
  [/Ä/g, "Ñ"],
  [/Ð/g, "Ñ"],
];

export function normalizeName(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw);
  for (const [re, ch] of OCR_FIXES) s = s.replace(re, ch);
  s = s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/infrastructure/import/normalizeName.test.ts`
Expected: PASS (all six tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/import/normalizeName.ts src/infrastructure/import/normalizeName.test.ts
git commit -m "feat(import): add normalizeName with OCR fixes (Ä/Ð → Ñ)"
```

---

### Task 5: Era detection (TDD)

**Files:**
- Create: `src/infrastructure/import/eraDetection.test.ts`
- Create: `src/infrastructure/import/eraDetection.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { detectEra } from "./eraDetection";

describe("detectEra", () => {
  it("classifies 1984 era (early)", () => {
    expect(detectEra(["EXPEDIENTE", "NIVEL", "ÁREA DEL CONOCIMIENTO"])).toBe("early");
  });

  it("classifies 1990s era (mid90s)", () => {
    expect(detectEra([
      "EXPEDIENTE", "NIVEL", "ÁREA DEL CONOCIMIENTO",
      "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA", "PAIS",
    ])).toBe("mid90s");
  });

  it("classifies 2000–2014 era (cvu-era)", () => {
    expect(detectEra([
      "AÑO", "CVU (a partir de 2003)", "EXPEDIENTE", "NIVEL",
      "ÁREA DEL CONOCIMIENTO", "DISCIPLINA (a partir de 1991)",
    ])).toBe("cvu-era");
  });

  it("classifies 2015–2020 era (cvu-only)", () => {
    expect(detectEra([
      "CVU", "NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR", "NIVEL",
      "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA",
    ])).toBe("cvu-only");
  });

  it("classifies 2025 era", () => {
    expect(detectEra([
      "CVU padrón corregido", "NOMBRE DEL INVESTIGADOR", "NIVEL",
      "INSTITUCIÓN DE ACREDITACIÓN", "ÁREA DE CONOCIMIENTO",
    ])).toBe("2025");
  });

  it("classifies 2026 era", () => {
    expect(detectEra([
      "CVU", "NOMBRE DEL INVESTIGADOR", "NIVEL",
      "INSTITUCION DE ACREDITACION", "INSTITUCION FINAL",
    ])).toBe("2026");
  });

  it("throws for unknown header set", () => {
    expect(() => detectEra(["FOO", "BAR"])).toThrow(/unknown era/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/import/eraDetection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
export type Era = "early" | "mid90s" | "cvu-era" | "cvu-only" | "2025" | "2026";

interface EraRule {
  era: Era;
  match: (h: Set<string>) => boolean;
}

const has = (h: Set<string>, ...keys: string[]) => keys.every((k) => h.has(k));
const lacks = (h: Set<string>, ...keys: string[]) => keys.every((k) => !h.has(k));

// Order matters: most-specific first.
const RULES: EraRule[] = [
  { era: "2026", match: (h) => has(h, "INSTITUCION DE ACREDITACION", "INSTITUCION FINAL") },
  { era: "2025", match: (h) => has(h, "CVU padrón corregido", "INSTITUCIÓN DE ACREDITACIÓN") },
  { era: "cvu-only", match: (h) => has(h, "CVU") && lacks(h, "EXPEDIENTE") && has(h, "INSTITUCIÓN DE ADSCRIPCIÓN") },
  { era: "cvu-era", match: (h) => has(h, "EXPEDIENTE") && Array.from(h).some((k) => /CVU/i.test(k)) && Array.from(h).some((k) => /^DISCIPLINA/i.test(k)) },
  { era: "mid90s", match: (h) => has(h, "EXPEDIENTE", "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA") && lacks(h, "DISCIPLINA") },
  { era: "early", match: (h) => has(h, "EXPEDIENTE", "ÁREA DEL CONOCIMIENTO") && lacks(h, "INSTITUCIÓN DE ADSCRIPCIÓN") },
];

export function detectEra(headers: string[]): Era {
  const h = new Set(headers);
  for (const r of RULES) if (r.match(h)) return r.era;
  throw new Error(`unknown era for headers: ${headers.join(", ")}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/infrastructure/import/eraDetection.test.ts`
Expected: PASS (all seven tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/import/eraDetection.ts src/infrastructure/import/eraDetection.test.ts
git commit -m "feat(import): add era detection from header set"
```

---

### Task 6: Identity resolution (TDD)

**Files:**
- Create: `src/infrastructure/import/identityResolution.test.ts`
- Create: `src/infrastructure/import/identityResolution.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { resolveIdentities, type RawTuple } from "./identityResolution";

const t = (year: number, name: string, cvu?: string, expediente?: string): RawTuple => ({
  year, name, cvu, expediente,
});

describe("resolveIdentities", () => {
  it("groups same CVU across years into one identity", () => {
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2011, "PEREZ JUAN", "100", "55"),
    ]);
    expect(out.identities.length).toBe(1);
    expect(out.identities[0].cvu).toBe(100);
    expect(out.identities[0].firstYear).toBe(2010);
    expect(out.identities[0].lastYear).toBe(2011);
  });

  it("links pre-2003 expediente to a CVU when CVU appears later with same expediente", () => {
    const out = resolveIdentities([
      t(1990, "PEREZ JUAN", undefined, "55"),
      t(2010, "PEREZ JUAN", "100", "55"),
    ]);
    expect(out.identities.length).toBe(1);
    expect(out.identities[0].cvu).toBe(100);
    expect(out.identities[0].expedientes).toEqual(["55"]);
    expect(out.identities[0].firstYear).toBe(1990);
  });

  it("creates a CVU-less identity when an expediente never appears with a CVU", () => {
    const out = resolveIdentities([
      t(1985, "GARCIA MARIA", undefined, "12"),
    ]);
    expect(out.identities.length).toBe(1);
    expect(out.identities[0].cvu).toBeNull();
    expect(out.identities[0].expedientes).toEqual(["12"]);
  });

  it("flags ambiguous when one CVU appears with multiple expedientes that ALSO appear with another CVU", () => {
    // CVU 100 appears with exp 55 and 56. CVU 200 also appears with exp 56.
    // So exp 56 collides — both CVUs flagged ambiguous.
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2010, "PEREZ JUAN", "100", "56"),
      t(2011, "OTRO USUARIO", "200", "56"),
    ]);
    const flagged = out.identities.filter((i) => i.ambiguous);
    expect(flagged.length).toBeGreaterThanOrEqual(2);
    for (const f of flagged) expect(f.ambiguityNote).toBeTruthy();
  });

  it("each output snapshot row gets a canonical_id linking to its identity", () => {
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2011, "PEREZ JUAN", "100", "55"),
    ]);
    const ids = new Set(out.snapshotMap.values());
    expect(ids.size).toBe(1);
    expect(out.snapshotMap.size).toBe(2);
  });

  it("uses the most recent year's name as canonical_name", () => {
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2020, "PEREZ JUAN CARLOS", "100", "55"),
    ]);
    expect(out.identities[0].canonicalName).toBe("PEREZ JUAN CARLOS");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/import/identityResolution.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import { normalizeName } from "./normalizeName";

export interface RawTuple {
  year: number;
  name: string;        // raw; we normalize internally
  cvu?: string;        // raw string from XLSX
  expediente?: string; // raw string from XLSX
}

export interface ResolvedIdentity {
  canonicalId: number;
  cvu: number | null;
  expedientes: string[];
  canonicalName: string;
  nameVariants: string[];
  ambiguous: boolean;
  ambiguityNote: string | null;
  firstYear: number;
  lastYear: number;
}

export interface ResolveResult {
  identities: ResolvedIdentity[];
  /** Map from a stable per-tuple key to the canonical_id assigned. */
  snapshotMap: Map<string, number>;
}

const tupleKey = (t: RawTuple, idx: number) =>
  `${idx}|${t.year}|${t.cvu ?? ""}|${t.expediente ?? ""}`;

export function resolveIdentities(tuples: RawTuple[]): ResolveResult {
  // Step 1: group by CVU. Each CVU becomes a tentative cluster.
  const clusterByCvu = new Map<string, { exps: Set<string>; tupleIdxs: number[] }>();
  // Track expediente → cvu(s) seen.
  const cvusByExp = new Map<string, Set<string>>();

  tuples.forEach((t, idx) => {
    if (t.cvu) {
      let c = clusterByCvu.get(t.cvu);
      if (!c) { c = { exps: new Set(), tupleIdxs: [] }; clusterByCvu.set(t.cvu, c); }
      if (t.expediente) c.exps.add(t.expediente);
      c.tupleIdxs.push(idx);
      if (t.expediente) {
        let s = cvusByExp.get(t.expediente);
        if (!s) { s = new Set(); cvusByExp.set(t.expediente, s); }
        s.add(t.cvu);
      }
    }
  });

  // Detect ambiguous CVUs: any CVU sharing an expediente with another CVU.
  const ambiguousCvus = new Set<string>();
  for (const [, cvus] of cvusByExp) {
    if (cvus.size > 1) for (const c of cvus) ambiguousCvus.add(c);
  }

  // Step 2: assign canonical_ids. CVU clusters first, then orphan-expediente clusters.
  let nextId = 1;
  const cvuToCanonical = new Map<string, number>();
  for (const cvu of clusterByCvu.keys()) {
    cvuToCanonical.set(cvu, nextId++);
  }
  const expToCanonical = new Map<string, number>();
  for (const [exp, cvus] of cvusByExp) {
    if (cvus.size === 1) {
      const cvu = Array.from(cvus)[0];
      const id = cvuToCanonical.get(cvu);
      if (id != null) expToCanonical.set(exp, id);
    } else {
      // ambiguous: pick the first cvu's canonical_id (deterministic by Set iteration).
      const cvu = Array.from(cvus).sort()[0];
      const id = cvuToCanonical.get(cvu);
      if (id != null) expToCanonical.set(exp, id);
    }
  }

  // Step 3: pre-2003 rows (no CVU) — link via expediente, else seed a new id.
  const snapshotMap = new Map<string, number>();
  tuples.forEach((t, idx) => {
    const key = tupleKey(t, idx);
    if (t.cvu) {
      const id = cvuToCanonical.get(t.cvu)!;
      snapshotMap.set(key, id);
    } else if (t.expediente && expToCanonical.has(t.expediente)) {
      snapshotMap.set(key, expToCanonical.get(t.expediente)!);
    } else if (t.expediente) {
      const id = nextId++;
      expToCanonical.set(t.expediente, id);
      snapshotMap.set(key, id);
    }
    // else: no cvu and no expediente — skipped (importer should have filtered earlier).
  });

  // Step 4: build ResolvedIdentity records.
  const acc = new Map<number, {
    cvu: string | null;
    expedientes: Set<string>;
    nameVariants: Set<string>;
    canonicalName: string;
    canonicalNameYear: number;
    firstYear: number;
    lastYear: number;
    ambiguous: boolean;
  }>();

  tuples.forEach((t, idx) => {
    const key = tupleKey(t, idx);
    const id = snapshotMap.get(key);
    if (id == null) return;
    let row = acc.get(id);
    if (!row) {
      row = {
        cvu: t.cvu ?? null,
        expedientes: new Set(),
        nameVariants: new Set(),
        canonicalName: t.name,
        canonicalNameYear: t.year,
        firstYear: t.year,
        lastYear: t.year,
        ambiguous: t.cvu != null && ambiguousCvus.has(t.cvu),
      };
      acc.set(id, row);
    }
    if (t.cvu && row.cvu == null) row.cvu = t.cvu;
    if (t.expediente) row.expedientes.add(t.expediente);
    const norm = normalizeName(t.name);
    if (norm) row.nameVariants.add(norm);
    if (t.year > row.canonicalNameYear) {
      row.canonicalName = t.name;
      row.canonicalNameYear = t.year;
    }
    if (t.year < row.firstYear) row.firstYear = t.year;
    if (t.year > row.lastYear) row.lastYear = t.year;
    if (t.cvu && ambiguousCvus.has(t.cvu)) row.ambiguous = true;
  });

  const identities: ResolvedIdentity[] = [];
  for (const [canonicalId, r] of acc) {
    let note: string | null = null;
    if (r.ambiguous && r.cvu) {
      const collidingExps = Array.from(r.expedientes).filter((e) => (cvusByExp.get(e)?.size ?? 0) > 1);
      if (collidingExps.length) {
        note = `CVU ${r.cvu} shares expediente(s) ${collidingExps.join(", ")} with other CVU(s)`;
      }
    }
    identities.push({
      canonicalId,
      cvu: r.cvu ? Number.parseInt(r.cvu, 10) : null,
      expedientes: Array.from(r.expedientes).sort(),
      canonicalName: r.canonicalName,
      nameVariants: Array.from(r.nameVariants).sort(),
      ambiguous: r.ambiguous,
      ambiguityNote: note,
      firstYear: r.firstYear,
      lastYear: r.lastYear,
    });
  }

  return { identities, snapshotMap };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/infrastructure/import/identityResolution.test.ts`
Expected: PASS (all six tests).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/import/identityResolution.ts src/infrastructure/import/identityResolution.test.ts
git commit -m "feat(import): add identity resolution with ambiguity detection"
```

---

### Task 7: Header maps for each era

**Files:**
- Create: `src/infrastructure/import/headerMaps.ts`

- [ ] **Step 1: Write the per-era header maps**

```ts
import type { Era } from "./eraDetection";

/**
 * For each era, the canonical key → list of source-header candidates
 * (in priority order). The first non-null value is used.
 *
 * Canonical keys correspond to ResearcherSnapshot fields.
 */
export interface HeaderMap {
  cvu: string[];
  expediente: string[];
  nombre: string[];
  nivel: string[];
  categoria: string[];
  area_conocimiento: string[];
  disciplina: string[];
  subdisciplina: string[];
  especialidad: string[];
  institucion: string[];
  dependencia: string[];
  entidad: string[];
  pais: string[];
  fecha_inicio_vigencia: string[];
  fecha_fin_vigencia: string[];
}

const EMPTY: HeaderMap = {
  cvu: [], expediente: [], nombre: [], nivel: [], categoria: [],
  area_conocimiento: [], disciplina: [], subdisciplina: [], especialidad: [],
  institucion: [], dependencia: [], entidad: [], pais: [],
  fecha_inicio_vigencia: [], fecha_fin_vigencia: [],
};

export const HEADER_MAPS: Record<Era, HeaderMap> = {
  early: {
    ...EMPTY,
    expediente: ["EXPEDIENTE"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR", "NOMBRE DE LA INVESTIGADORA O INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  mid90s: {
    ...EMPTY,
    expediente: ["EXPEDIENTE"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR", "NOMBRE DE LA INVESTIGADORA O INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    institucion: ["INSTITUCIÓN DE ADSCRIPCIÓN"],
    entidad: ["ENTIDAD FEDERATIVA"],
    pais: ["PAIS"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  "cvu-era": {
    ...EMPTY,
    cvu: ["CVU (a partir de 2003)", "CVU"],
    expediente: ["EXPEDIENTE"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O INVESTIGADOR", "NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    disciplina: ["DISCIPLINA (a partir de 1991)", "DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA (a partir de 1991)", "SUBDISCIPLINA"],
    especialidad: ["ESPECIALIDAD (a partir de 1991)", "ESPECIALIDAD"],
    institucion: ["INSTITUCIÓN DE ADSCRIPCIÓN (a partir de 1990)", "INSTITUCIÓN DE ADSCRIPCIÓN"],
    dependencia: ["DEPENDENCIA (a partir de 1991)", "DEPENDENCIA"],
    entidad: ["ENTIDAD FEDERATIVA ADSCRIPCIÓN\r\n(a partir de 1990)", "ENTIDAD FEDERATIVA"],
    pais: ["PAIS ADSCRIPCIÓN \r\n(a partir de 1990)", "PAIS"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  "cvu-only": {
    ...EMPTY,
    cvu: ["CVU"],
    nombre: ["NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    area_conocimiento: ["ÁREA DEL CONOCIMIENTO"],
    disciplina: ["DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA"],
    especialidad: ["ESPECIALIDAD"],
    institucion: ["INSTITUCIÓN DE ADSCRIPCIÓN"],
    dependencia: ["DEPENDENCIA"],
    entidad: ["ENTIDAD FEDERATIVA"],
    pais: ["PAIS"],
    fecha_inicio_vigencia: ["FECHA DE INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA DE FIN DE VIGENCIA"],
  },
  "2025": {
    ...EMPTY,
    cvu: ["CVU padrón corregido"],
    nombre: ["NOMBRE DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    categoria: ["CATEGORIA"],
    area_conocimiento: ["ÁREA DE CONOCIMIENTO"],
    disciplina: ["DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA"],
    institucion: ["INSTITUCIÓN DE ACREDITACIÓN"],
    dependencia: ["DEPENDENCIA DE ACREDITACIÓN"],
    entidad: ["ENTIDAD DE ACREDITACIÓN"],
    fecha_inicio_vigencia: ["FECHA INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA FIN DE VIGENCIA"],
  },
  "2026": {
    ...EMPTY,
    cvu: ["CVU"],
    nombre: ["NOMBRE DEL INVESTIGADOR"],
    nivel: ["NIVEL"],
    categoria: ["CATEGORIA"],
    area_conocimiento: ["AREA DE CONOCIMIENTO"],
    disciplina: ["DISCIPLINA"],
    subdisciplina: ["SUBDISCIPLINA"],
    especialidad: ["ESPECIALIDAD"],
    // 2026 collapse: prefer FINAL > COMISION > ACREDITACION.
    institucion: ["INSTITUCION FINAL", "INSTITUCION DE COMISION", "INSTITUCION DE ACREDITACION"],
    dependencia: ["DEPENDENCIA DE COMISION", "DEPENDENCIA DE ACREDITACION"],
    entidad: ["ENTIDAD FINAL", "UBICACION DE COMISION", "ENTIDAD DE ACREDITACION"],
    fecha_inicio_vigencia: ["FECHA INICIO DE VIGENCIA"],
    fecha_fin_vigencia: ["FECHA FIN DE VIGENCIA"],
  },
};

/** Pick the first non-null value for the given canonical key. */
export function pickField(
  row: Record<string, unknown>,
  candidates: string[],
): unknown {
  for (const c of candidates) {
    if (c in row) {
      const v = row[c];
      if (v !== null && v !== undefined && v !== "" && v !== "-") return v;
    }
  }
  return null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/import/headerMaps.ts
git commit -m "feat(import): add per-era header maps with FINAL/COMISION/ACREDITACION fallback"
```

---

### Task 8: Historical importer — read + map all files

**Files:**
- Create: `src/infrastructure/import/importHistorical.ts`

- [ ] **Step 1: Write the importer**

```ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { detectEra, type Era } from "./eraDetection";
import { HEADER_MAPS, pickField } from "./headerMaps";
import { resolveIdentities, type RawTuple } from "./identityResolution";
import { normalizeName } from "./normalizeName";

const HISTORIC_DIR_DEFAULT = "C:/Users/alber/Documents/Historico SNII";
const PADRON_2026_DEFAULT = "C:/Users/alber/Documents/Padron_enero_2026.xlsx";
const BATCH = 1000;

interface FileSpec { year: number; path: string; era: Era; }
type Row = Record<string, unknown>;

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "SIN INFORMACION" || s === "NO APLICA" || s === "-") return null;
  return s;
}

function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

function inferYearFromFilename(filename: string): number | null {
  const m = filename.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function readRows(path: string): { headers: string[]; rows: Row[] } {
  const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

async function main() {
  const historicDir = process.argv[2] ?? HISTORIC_DIR_DEFAULT;
  const padron2026 = process.argv[3] ?? PADRON_2026_DEFAULT;

  // Discover files.
  const files: FileSpec[] = [];
  for (const f of readdirSync(historicDir)) {
    if (!/^Investigadores_vigentes_\d{4}/.test(f)) continue;
    const year = inferYearFromFilename(f);
    if (year == null) continue;
    const path = join(historicDir, f);
    const { headers } = readRows(path);
    files.push({ year, path, era: detectEra(headers) });
  }
  // Add 2026 padron.
  if (padron2026) {
    const { headers } = readRows(padron2026);
    files.push({ year: 2026, path: padron2026, era: detectEra(headers) });
  }
  files.sort((a, b) => a.year - b.year);
  console.log(`Discovered ${files.length} files: ${files.map((f) => f.year).join(", ")}`);

  // Pass 1: read every row, build raw tuples + remember mapped fields per (idx).
  const tuples: RawTuple[] = [];
  type MappedRow = {
    year: number;
    sourceFile: string;
    nivel: string | null;
    categoria: string | null;
    area_conocimiento: string | null;
    disciplina: string | null;
    subdisciplina: string | null;
    especialidad: string | null;
    institucion: string | null;
    dependencia: string | null;
    entidad: string | null;
    pais: string | null;
    fecha_inicio_vigencia: string | null;
    fecha_fin_vigencia: string | null;
  };
  const mapped: MappedRow[] = [];

  for (const f of files) {
    const { rows } = readRows(f.path);
    const m = HEADER_MAPS[f.era];
    let kept = 0;
    for (const r of rows) {
      const cvu = clean(pickField(r, m.cvu));
      const expediente = clean(pickField(r, m.expediente));
      if (!cvu && !expediente) continue;
      const name = clean(pickField(r, m.nombre)) ?? "";
      tuples.push({ year: f.year, name, cvu: cvu ?? undefined, expediente: expediente ?? undefined });
      mapped.push({
        year: f.year,
        sourceFile: basename(f.path),
        nivel: clean(pickField(r, m.nivel)),
        categoria: clean(pickField(r, m.categoria)),
        area_conocimiento: clean(pickField(r, m.area_conocimiento)),
        disciplina: clean(pickField(r, m.disciplina)),
        subdisciplina: clean(pickField(r, m.subdisciplina)),
        especialidad: clean(pickField(r, m.especialidad)),
        institucion: clean(pickField(r, m.institucion)),
        dependencia: clean(pickField(r, m.dependencia)),
        entidad: clean(pickField(r, m.entidad)),
        pais: clean(pickField(r, m.pais)),
        fecha_inicio_vigencia: toDate(pickField(r, m.fecha_inicio_vigencia)),
        fecha_fin_vigencia: toDate(pickField(r, m.fecha_fin_vigencia)),
      });
      kept++;
    }
    console.log(`  ${f.year} (${f.era}): ${kept} rows`);
  }

  console.log(`\nTotal raw tuples: ${tuples.length}`);
  const { identities, snapshotMap } = resolveIdentities(tuples);
  console.log(`Resolved ${identities.length} identities, ${snapshotMap.size} snapshot mappings`);
  const ambiguous = identities.filter((i) => i.ambiguous).length;
  console.log(`Ambiguous: ${ambiguous}`);

  // Build final snapshot rows. Dedup on (canonical_id, year) — pick the last
  // mapped row for that pair (later files override earlier ones if a researcher
  // appears in two files for the same year).
  type SnapshotRow = MappedRow & { canonical_id: number };
  const snapByKey = new Map<string, SnapshotRow>();
  tuples.forEach((t, idx) => {
    const id = snapshotMap.get(`${idx}|${t.year}|${t.cvu ?? ""}|${t.expediente ?? ""}`);
    if (id == null) return;
    const m = mapped[idx];
    snapByKey.set(`${id}|${t.year}`, { ...m, canonical_id: id });
  });
  const snapshots = Array.from(snapByKey.values());
  console.log(`Final snapshots: ${snapshots.length}`);

  // Connect to Supabase.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supa = createClient(url, key, {
    db: { schema: "snii" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // TRUNCATE both tables (snapshots first because of FK).
  console.log("Truncating researcher_snapshots and researchers_v2…");
  {
    const { error } = await supa.rpc("truncate_v2_tables");
    if (error) {
      // Fallback: use raw delete if the RPC isn't defined.
      await supa.from("researcher_snapshots").delete().neq("year", -1);
      await supa.from("researchers_v2").delete().neq("canonical_id", -1);
    }
  }

  // Insert identities.
  for (let i = 0; i < identities.length; i += BATCH) {
    const batch = identities.slice(i, i + BATCH).map((id) => ({
      canonical_id: id.canonicalId,
      cvu: id.cvu,
      expedientes: id.expedientes,
      canonical_name: id.canonicalName || normalizeName(""),
      name_variants: id.nameVariants,
      ambiguous: id.ambiguous,
      ambiguity_note: id.ambiguityNote,
      first_year: id.firstYear,
      last_year: id.lastYear,
    }));
    const { error } = await supa.from("researchers_v2").insert(batch);
    if (error) { console.error(error); process.exit(1); }
    if ((i + batch.length) % 5000 === 0 || i + batch.length === identities.length) {
      console.log(`  identities ${i + batch.length}/${identities.length}`);
    }
  }

  // Insert snapshots.
  for (let i = 0; i < snapshots.length; i += BATCH) {
    const batch = snapshots.slice(i, i + BATCH).map((s) => ({
      canonical_id: s.canonical_id,
      year: s.year,
      nivel: s.nivel,
      categoria: s.categoria,
      area_conocimiento: s.area_conocimiento,
      disciplina: s.disciplina,
      subdisciplina: s.subdisciplina,
      especialidad: s.especialidad,
      institucion: s.institucion,
      dependencia: s.dependencia,
      entidad: s.entidad,
      pais: s.pais,
      fecha_inicio_vigencia: s.fecha_inicio_vigencia,
      fecha_fin_vigencia: s.fecha_fin_vigencia,
      source_file: s.sourceFile,
    }));
    const { error } = await supa.from("researcher_snapshots").insert(batch);
    if (error) { console.error(error); process.exit(1); }
    if ((i + batch.length) % 10000 === 0 || i + batch.length === snapshots.length) {
      console.log(`  snapshots ${i + batch.length}/${snapshots.length}`);
    }
  }

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the importer end-to-end**

Run: `npx tsx src/infrastructure/import/importHistorical.ts`
Expected: console output shows ~41 files discovered, ~600k tuples, ~33–35k identities, ~84 ambiguous, "Done." line at the end. Run-time < 60s.

- [ ] **Step 4: Verify counts in the database**

Open `psql` (local Supabase) and run:
```sql
SELECT COUNT(*) FROM snii.researchers_v2;          -- expect ~33–35k
SELECT COUNT(*) FROM snii.researcher_snapshots;    -- expect ~580k
SELECT COUNT(*) FROM snii.researchers_v2 WHERE ambiguous;  -- expect ~84
SELECT year, COUNT(*) FROM snii.researcher_snapshots GROUP BY year ORDER BY year;
```
Expected: yearly counts roughly match the per-file row counts logged by the importer.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/import/importHistorical.ts
git commit -m "feat(import): unified historical importer (1984-2026 via era detection)"
```

---

## Phase 2 — RPCs and read repositories

### Task 9: Migration `0006_historical_rpcs.sql`

**Files:**
- Create: `supabase/migrations/0006_historical_rpcs.sql`

- [ ] **Step 1: Write the RPCs**

```sql
-- Year-aware analysis RPCs over snii.researcher_snapshots.

CREATE OR REPLACE FUNCTION snii.snapshots_available_years()
RETURNS TABLE(year int)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT DISTINCT year FROM snii.researcher_snapshots ORDER BY year;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_counts_by_state(p_year int, p_area text DEFAULT NULL)
RETURNS TABLE(entidad text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT entidad::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year
    AND entidad IS NOT NULL
    AND (p_area IS NULL OR area_conocimiento = p_area)
  GROUP BY entidad
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_totals_per_year()
RETURNS TABLE(year int, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, COUNT(*)::bigint FROM snii.researcher_snapshots GROUP BY year ORDER BY year;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_levels_by_year()
RETURNS TABLE(year int, nivel text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, COALESCE(nivel, '—')::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  GROUP BY year, COALESCE(nivel, '—')
  ORDER BY year, 2;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_states_by_year()
RETURNS TABLE(year int, entidad text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, entidad::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE entidad IS NOT NULL
  GROUP BY year, entidad
  ORDER BY year, entidad;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_areas_by_year()
RETURNS TABLE(year int, area text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, area_conocimiento::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE area_conocimiento IS NOT NULL
  GROUP BY year, area_conocimiento
  ORDER BY year, area_conocimiento;
$$;

-- Top-N institutions per year, ranked by count.
CREATE OR REPLACE FUNCTION snii.snapshots_institutions_by_year(p_top_n int DEFAULT 15)
RETURNS TABLE(year int, institucion text, count bigint, rank int)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
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

-- Net flow: entrants if first_year = year, departures if last_year + 1 = year.
CREATE OR REPLACE FUNCTION snii.snapshots_net_flows_by_year()
RETURNS TABLE(year int, entrants bigint, departures bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  WITH years AS (SELECT DISTINCT year FROM snii.researcher_snapshots),
       e AS (
         SELECT first_year AS year, COUNT(*)::bigint AS entrants
         FROM snii.researchers_v2 GROUP BY first_year
       ),
       d AS (
         SELECT last_year + 1 AS year, COUNT(*)::bigint AS departures
         FROM snii.researchers_v2 GROUP BY last_year + 1
       )
  SELECT y.year, COALESCE(e.entrants, 0), COALESCE(d.departures, 0)
  FROM years y
  LEFT JOIN e USING (year)
  LEFT JOIN d USING (year)
  ORDER BY y.year;
$$;

-- Per-researcher timeline.
CREATE OR REPLACE FUNCTION snii.snapshots_timeline_for(p_canonical_id bigint)
RETURNS TABLE(
  year int, nivel text, categoria text,
  area_conocimiento text, disciplina text, subdisciplina text, especialidad text,
  institucion text, dependencia text, entidad text, pais text,
  fecha_inicio_vigencia date, fecha_fin_vigencia date, source_file text
)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT year, nivel, categoria, area_conocimiento, disciplina, subdisciplina,
         especialidad, institucion, dependencia, entidad, pais,
         fecha_inicio_vigencia, fecha_fin_vigencia, source_file
  FROM snii.researcher_snapshots
  WHERE canonical_id = p_canonical_id
  ORDER BY year;
$$;

-- Truncate helper used by the importer.
CREATE OR REPLACE FUNCTION snii.truncate_v2_tables() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
BEGIN
  TRUNCATE snii.researcher_snapshots, snii.researchers_v2 RESTART IDENTITY;
END;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_available_years()           TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_counts_by_state(int, text)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_totals_per_year()           TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_levels_by_year()            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_states_by_year()            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_areas_by_year()             TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_institutions_by_year(int)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_net_flows_by_year()         TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_timeline_for(bigint)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.truncate_v2_tables()                  TO service_role;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase migration up` (or the project's migration command).
Expected: success.

- [ ] **Step 3: Spot-check one RPC**

In `psql`:
```sql
SELECT * FROM snii.snapshots_totals_per_year() ORDER BY year LIMIT 5;
```
Expected: 5 rows starting with 1984.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_historical_rpcs.sql
git commit -m "feat(snii): historical RPCs for trends + per-researcher timeline"
```

---

### Task 10: `SupabaseSnapshotRepository` implementation

**Files:**
- Create: `src/infrastructure/repositories/SupabaseSnapshotRepository.ts`

- [ ] **Step 1: Write the implementation**

```ts
import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type {
  SnapshotRepository, YearTotal, YearLevelCount, YearStateCount,
  YearAreaCount, YearInstitutionCount, YearNetFlow, YearStateCountFiltered,
} from "@/domain/repositories/SnapshotRepository";
import type { ResearcherSnapshot } from "@/domain/entities/ResearcherSnapshot";
import { isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

const toNum = (v: unknown): number =>
  typeof v === "string" ? Number.parseInt(v, 10) : (v as number);

export class SupabaseSnapshotRepository implements SnapshotRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  async availableYears(): Promise<number[]> {
    const all = await this.fetchAllRpcRows<{ year: number }>("snapshots_available_years");
    return all.map((r) => toNum(r.year));
  }

  async countsByState(year: number, filters?: { area?: string }): Promise<YearStateCountFiltered[]> {
    const { data, error } = await this.client.rpc("snapshots_counts_by_state", {
      p_year: year,
      p_area: filters?.area ?? null,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ entidad: string; count: number | string }>).map((r) => ({
      entidad: r.entidad,
      count: toNum(r.count),
    }));
  }

  async totalsPerYear(): Promise<YearTotal[]> {
    const all = await this.fetchAllRpcRows<{ year: number; count: number | string }>("snapshots_totals_per_year");
    return all.map((r) => ({ year: toNum(r.year), count: toNum(r.count) }));
  }

  async levelsByYear(): Promise<YearLevelCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; nivel: string; count: number | string }>("snapshots_levels_by_year");
    return all.map((r) => ({ year: toNum(r.year), nivel: r.nivel, count: toNum(r.count) }));
  }

  async statesByYear(): Promise<YearStateCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; entidad: string; count: number | string }>("snapshots_states_by_year");
    return all.map((r) => ({ year: toNum(r.year), entidad: r.entidad, count: toNum(r.count) }));
  }

  async areasByYear(): Promise<YearAreaCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; area: string; count: number | string }>("snapshots_areas_by_year");
    return all.map((r) => ({ year: toNum(r.year), area: r.area, count: toNum(r.count) }));
  }

  async institutionsByYear(topN: number): Promise<YearInstitutionCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; institucion: string; count: number | string; rank: number | string }>(
      "snapshots_institutions_by_year", { p_top_n: topN }
    );
    return all.map((r) => ({
      year: toNum(r.year), institucion: r.institucion, count: toNum(r.count), rank: toNum(r.rank),
    }));
  }

  async netFlowsByYear(): Promise<YearNetFlow[]> {
    const all = await this.fetchAllRpcRows<{ year: number; entrants: number | string; departures: number | string }>("snapshots_net_flows_by_year");
    return all.map((r) => ({ year: toNum(r.year), entrants: toNum(r.entrants), departures: toNum(r.departures) }));
  }

  async timelineFor(canonicalId: number): Promise<ResearcherSnapshot[]> {
    const { data, error } = await this.client.rpc("snapshots_timeline_for", { p_canonical_id: canonicalId });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const rawNivel = r.nivel as string | null | undefined;
      return {
        canonicalId,
        year: toNum(r.year),
        nivel: isValidSniiLevel(rawNivel) ? rawNivel : null,
        categoria: (r.categoria as string | null) ?? null,
        areaConocimiento: (r.area_conocimiento as string | null) ?? null,
        disciplina: (r.disciplina as string | null) ?? null,
        subdisciplina: (r.subdisciplina as string | null) ?? null,
        especialidad: (r.especialidad as string | null) ?? null,
        institucion: (r.institucion as string | null) ?? null,
        dependencia: (r.dependencia as string | null) ?? null,
        entidad: (r.entidad as string | null) ?? null,
        pais: (r.pais as string | null) ?? null,
        fechaInicioVigencia: (r.fecha_inicio_vigencia as string | null) ?? null,
        fechaFinVigencia: (r.fecha_fin_vigencia as string | null) ?? null,
        sourceFile: (r.source_file as string) ?? "",
      };
    });
  }

  private async fetchAllRpcRows<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
    const pageSize = 1000;
    const out: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client.rpc(fn, args ?? {}).range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as T[];
      out.push(...page);
      if (page.length < pageSize) break;
    }
    return out;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/repositories/SupabaseSnapshotRepository.ts
git commit -m "feat(infra): add SupabaseSnapshotRepository"
```

---

### Task 11: `SupabaseIdentityRepository` implementation

**Files:**
- Create: `src/infrastructure/repositories/SupabaseIdentityRepository.ts`

- [ ] **Step 1: Write the implementation**

```ts
import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type { IdentityRepository } from "@/domain/repositories/IdentityRepository";
import type { ResearcherIdentity } from "@/domain/entities/ResearcherIdentity";

type Row = {
  canonical_id: number;
  cvu: number | null;
  expedientes: string[] | null;
  canonical_name: string;
  name_variants: string[] | null;
  ambiguous: boolean;
  ambiguity_note: string | null;
  first_year: number;
  last_year: number;
};

function mapRow(r: Row): ResearcherIdentity {
  return {
    canonicalId: r.canonical_id,
    cvu: r.cvu,
    expedientes: r.expedientes ?? [],
    canonicalName: r.canonical_name,
    nameVariants: r.name_variants ?? [],
    ambiguous: r.ambiguous,
    ambiguityNote: r.ambiguity_note,
    firstYear: r.first_year,
    lastYear: r.last_year,
  };
}

export class SupabaseIdentityRepository implements IdentityRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  async findByCanonicalId(id: number): Promise<ResearcherIdentity | null> {
    const { data, error } = await this.client
      .from("researchers_v2").select("*").eq("canonical_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as Row) : null;
  }

  async findByCvu(cvu: number): Promise<ResearcherIdentity | null> {
    const { data, error } = await this.client
      .from("researchers_v2").select("*").eq("cvu", cvu).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as Row) : null;
  }

  async search(
    query: string,
    opts: { year?: number; limit: number; offset: number },
  ): Promise<ResearcherIdentity[]> {
    let q = this.client.from("researchers_v2").select("*")
      .order("canonical_name").range(opts.offset, opts.offset + opts.limit - 1);
    if (query.trim()) {
      const tokens = query.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "")
        .toUpperCase().split(/\s+/).filter(Boolean);
      for (const t of tokens) q = q.ilike("canonical_name", `%${t}%`);
    }
    if (opts.year != null) {
      q = q.lte("first_year", opts.year).gte("last_year", opts.year);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(mapRow);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/repositories/SupabaseIdentityRepository.ts
git commit -m "feat(infra): add SupabaseIdentityRepository"
```

---

## Phase 3 — Use cases (TDD)

### Task 12: `GetTotalsPerYear` (TDD)

**Files:**
- Create: `src/application/use-cases/GetTotalsPerYear.test.ts`
- Create: `src/application/use-cases/GetTotalsPerYear.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { GetTotalsPerYear } from "./GetTotalsPerYear";
import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";

const makeRepo = (totals: { year: number; count: number }[]): SnapshotRepository =>
  ({
    availableYears: async () => [],
    countsByState: async () => [],
    totalsPerYear: async () => totals,
    levelsByYear: async () => [],
    statesByYear: async () => [],
    areasByYear: async () => [],
    institutionsByYear: async () => [],
    netFlowsByYear: async () => [],
    timelineFor: async () => [],
  } satisfies SnapshotRepository);

describe("GetTotalsPerYear", () => {
  it("delegates to the repository", async () => {
    const uc = new GetTotalsPerYear(makeRepo([{ year: 1984, count: 1396 }]));
    expect(await uc.execute()).toEqual([{ year: 1984, count: 1396 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/GetTotalsPerYear.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { SnapshotRepository, YearTotal } from "@/domain/repositories/SnapshotRepository";

export class GetTotalsPerYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearTotal[]> { return this.repo.totalsPerYear(); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/GetTotalsPerYear.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/GetTotalsPerYear.ts src/application/use-cases/GetTotalsPerYear.test.ts
git commit -m "feat(use-case): GetTotalsPerYear"
```

---

### Task 13: Remaining trends use cases (no separate tests — they are pure delegators)

**Files:**
- Create: `src/application/use-cases/GetLevelsByYear.ts`
- Create: `src/application/use-cases/GetStatesByYear.ts`
- Create: `src/application/use-cases/GetAreasByYear.ts`
- Create: `src/application/use-cases/GetInstitutionsByYear.ts`
- Create: `src/application/use-cases/GetNetFlowsByYear.ts`
- Create: `src/application/use-cases/GetAvailableYears.ts`

- [ ] **Step 1: Write all six**

`GetLevelsByYear.ts`:
```ts
import type { SnapshotRepository, YearLevelCount } from "@/domain/repositories/SnapshotRepository";
export class GetLevelsByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearLevelCount[]> { return this.repo.levelsByYear(); }
}
```

`GetStatesByYear.ts`:
```ts
import type { SnapshotRepository, YearStateCount } from "@/domain/repositories/SnapshotRepository";
export class GetStatesByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearStateCount[]> { return this.repo.statesByYear(); }
}
```

`GetAreasByYear.ts`:
```ts
import type { SnapshotRepository, YearAreaCount } from "@/domain/repositories/SnapshotRepository";
export class GetAreasByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearAreaCount[]> { return this.repo.areasByYear(); }
}
```

`GetInstitutionsByYear.ts`:
```ts
import type { SnapshotRepository, YearInstitutionCount } from "@/domain/repositories/SnapshotRepository";
export class GetInstitutionsByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(opts: { topN: number }): Promise<YearInstitutionCount[]> {
    return this.repo.institutionsByYear(opts.topN);
  }
}
```

`GetNetFlowsByYear.ts`:
```ts
import type { SnapshotRepository, YearNetFlow } from "@/domain/repositories/SnapshotRepository";
export class GetNetFlowsByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearNetFlow[]> { return this.repo.netFlowsByYear(); }
}
```

`GetAvailableYears.ts`:
```ts
import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";
export class GetAvailableYears {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<number[]> { return this.repo.availableYears(); }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/application/use-cases/GetLevelsByYear.ts src/application/use-cases/GetStatesByYear.ts \
        src/application/use-cases/GetAreasByYear.ts src/application/use-cases/GetInstitutionsByYear.ts \
        src/application/use-cases/GetNetFlowsByYear.ts src/application/use-cases/GetAvailableYears.ts
git commit -m "feat(use-case): trend use cases (levels/states/areas/institutions/netflows/years)"
```

---

### Task 14: `GetResearcherTimeline` (TDD)

**Files:**
- Create: `src/application/use-cases/GetResearcherTimeline.test.ts`
- Create: `src/application/use-cases/GetResearcherTimeline.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { GetResearcherTimeline } from "./GetResearcherTimeline";
import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";
import type { ResearcherSnapshot } from "@/domain/entities/ResearcherSnapshot";

const stub = (snaps: Partial<ResearcherSnapshot>[]): SnapshotRepository =>
  ({
    availableYears: async () => [],
    countsByState: async () => [],
    totalsPerYear: async () => [],
    levelsByYear: async () => [],
    statesByYear: async () => [],
    areasByYear: async () => [],
    institutionsByYear: async () => [],
    netFlowsByYear: async () => [],
    timelineFor: async () => snaps as ResearcherSnapshot[],
  } satisfies SnapshotRepository);

describe("GetResearcherTimeline", () => {
  it("returns snapshots ordered by year (repo guarantees this)", async () => {
    const uc = new GetResearcherTimeline(stub([
      { canonicalId: 1, year: 2010, nivel: "1" },
      { canonicalId: 1, year: 2011, nivel: "1" },
    ]));
    const out = await uc.execute(1);
    expect(out.map((s) => s.year)).toEqual([2010, 2011]);
  });

  it("returns empty array if researcher has no snapshots", async () => {
    const uc = new GetResearcherTimeline(stub([]));
    expect(await uc.execute(99)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/application/use-cases/GetResearcherTimeline.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";
import type { ResearcherSnapshot } from "@/domain/entities/ResearcherSnapshot";

export class GetResearcherTimeline {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(canonicalId: number): Promise<ResearcherSnapshot[]> {
    return this.repo.timelineFor(canonicalId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/application/use-cases/GetResearcherTimeline.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/GetResearcherTimeline.ts src/application/use-cases/GetResearcherTimeline.test.ts
git commit -m "feat(use-case): GetResearcherTimeline"
```

---

### Task 15: Wire new repos and use cases into the DI container

**Files:**
- Modify: `src/lib/container.ts`

- [ ] **Step 1: Read current container.ts**

(Already read above — current contents return `repo`, `searchResearchers`, `getResearcherByCvu`, `getStats`, `getCountsByState`, `getAnalysis`.)

- [ ] **Step 2: Replace with the new container**

Overwrite `src/lib/container.ts`:

```ts
import "server-only";
import { getReadClient } from "@/infrastructure/supabase/client";
import { SupabaseResearcherRepository } from "@/infrastructure/repositories/SupabaseResearcherRepository";
import { SupabaseSnapshotRepository } from "@/infrastructure/repositories/SupabaseSnapshotRepository";
import { SupabaseIdentityRepository } from "@/infrastructure/repositories/SupabaseIdentityRepository";
import { SearchResearchers } from "@/application/use-cases/SearchResearchers";
import { GetResearcherByCvu } from "@/application/use-cases/GetResearcherByCvu";
import { GetStats } from "@/application/use-cases/GetStats";
import { GetCountsByState } from "@/application/use-cases/GetCountsByState";
import { GetAnalysis } from "@/application/use-cases/GetAnalysis";
import { GetTotalsPerYear } from "@/application/use-cases/GetTotalsPerYear";
import { GetLevelsByYear } from "@/application/use-cases/GetLevelsByYear";
import { GetStatesByYear } from "@/application/use-cases/GetStatesByYear";
import { GetAreasByYear } from "@/application/use-cases/GetAreasByYear";
import { GetInstitutionsByYear } from "@/application/use-cases/GetInstitutionsByYear";
import { GetNetFlowsByYear } from "@/application/use-cases/GetNetFlowsByYear";
import { GetResearcherTimeline } from "@/application/use-cases/GetResearcherTimeline";
import { GetAvailableYears } from "@/application/use-cases/GetAvailableYears";

function build() {
  const client = getReadClient();
  const repo = new SupabaseResearcherRepository(client);
  const snapshotRepo = new SupabaseSnapshotRepository(client);
  const identityRepo = new SupabaseIdentityRepository(client);
  return {
    repo, snapshotRepo, identityRepo,
    searchResearchers: new SearchResearchers(repo),
    getResearcherByCvu: new GetResearcherByCvu(repo),
    getStats: new GetStats(repo),
    getCountsByState: new GetCountsByState(repo),
    getAnalysis: new GetAnalysis(repo),
    getTotalsPerYear: new GetTotalsPerYear(snapshotRepo),
    getLevelsByYear: new GetLevelsByYear(snapshotRepo),
    getStatesByYear: new GetStatesByYear(snapshotRepo),
    getAreasByYear: new GetAreasByYear(snapshotRepo),
    getInstitutionsByYear: new GetInstitutionsByYear(snapshotRepo),
    getNetFlowsByYear: new GetNetFlowsByYear(snapshotRepo),
    getResearcherTimeline: new GetResearcherTimeline(snapshotRepo),
    getAvailableYears: new GetAvailableYears(snapshotRepo),
  };
}

let instance: ReturnType<typeof build> | null = null;
export function container() {
  if (!instance) instance = build();
  return instance;
}
```

- [ ] **Step 3: Type-check + run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/container.ts
git commit -m "feat(di): wire snapshot/identity repos and trend use cases"
```

---

## Phase 4 — UI: trends page (`/historic`)

### Task 16: i18n strings for the historic page and slider

**Files:**
- Modify: `src/presentation/i18n/messages.ts`

- [ ] **Step 1: Add new sections to both `es` and `en` blocks**

Open `src/presentation/i18n/messages.ts`. Inside the existing `es:` object, add a new `slider:` section, a new `historic:` section, and extend `researcher:` with timeline/ambiguous keys. Do the same for `en:`.

```ts
// inside es:
slider: {
  label: "Año",
  play: "Reproducir",
  pause: "Pausar",
  speedLabel: "Velocidad",
  preDataNote: "Sin datos por estado antes de 1990. Consulta la sección Histórico.",
  missingYearTooltip: (y: number) => `${y}: datos no disponibles`,
},
historic: {
  title: "Histórico SNII 1984–2026",
  subtitle: "Crecimiento del Sistema Nacional de Investigadoras e Investigadores",
  caveat: "Antes de 1990 no se publicó adscripción por entidad ni institución.",
  totals: { title: "Total de investigadores por año", subtitle: "1984–2026" },
  levels: { title: "Distribución por nivel", subtitle: "Composición por categoría", abs: "Cantidad", pct: "Porcentaje" },
  netFlow: { title: "Altas y bajas por año", subtitle: "Entradas (verde) vs salidas (rojo)" },
  states: { title: "Crecimiento por entidad", subtitle: "Mini gráfica por estado, ordenadas por total 2026" },
  areas: { title: "Áreas del conocimiento a través del tiempo", subtitle: "La taxonomía cambió en 2008 — etiquetas tal como se publicaron" },
  institutions: { title: "Top 15 instituciones a través del tiempo", subtitle: "Ranking por año" },
  noStateData: "Sin datos por estado para este año",
  noPriorData: "Sin datos previos",
},
// extend researcher:
timeline: {
  title: "Trayectoria",
  active: (first: number, last: number, n: number) => `Activo ${first}–${last} · ${n} años`,
  unknownLevel: "Sin nivel registrado",
  yearGap: (y: number) => `${y}: sin datos`,
  legend: "Nivel",
},
ambiguous:
  "Identidad ambigua: este expediente coincide con varios CVU. La trayectoria mostrada puede combinar registros de personas distintas.",
```

And the English equivalent inside `en:`:

```ts
slider: {
  label: "Year",
  play: "Play",
  pause: "Pause",
  speedLabel: "Speed",
  preDataNote: "No state-level data before 1990. See the Historic page.",
  missingYearTooltip: (y: number) => `${y}: data unavailable`,
},
historic: {
  title: "Historic SNII 1984–2026",
  subtitle: "Growth of the National System of Researchers",
  caveat: "Before 1990, state and institution were not published.",
  totals: { title: "Total researchers per year", subtitle: "1984–2026" },
  levels: { title: "Distribution by level", subtitle: "Composition by category", abs: "Count", pct: "Percent" },
  netFlow: { title: "Entrants and departures per year", subtitle: "Entrants (green) vs departures (red)" },
  states: { title: "Growth by state", subtitle: "Mini chart per state, ordered by 2026 total" },
  areas: { title: "Areas of knowledge over time", subtitle: "The taxonomy changed in 2008 — labels as published each year" },
  institutions: { title: "Top 15 institutions over time", subtitle: "Yearly ranking" },
  noStateData: "No state data for this year",
  noPriorData: "No prior data",
},
// extend researcher:
timeline: {
  title: "Career",
  active: (first: number, last: number, n: number) => `Active ${first}–${last} · ${n} years`,
  unknownLevel: "Level not recorded",
  yearGap: (y: number) => `${y}: no data`,
  legend: "Level",
},
ambiguous:
  "Ambiguous identity: this record matches multiple CVUs. The timeline shown may combine entries from different researchers.",
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/i18n/messages.ts
git commit -m "i18n(historic): add slider, historic, and timeline strings"
```

---

### Task 17: `TotalPerYearChart` component

**Files:**
- Create: `src/presentation/components/historic/TotalPerYearChart.tsx`

- [ ] **Step 1: Write the chart**

```tsx
"use client";
import { useMemo } from "react";
import { scaleLinear, scaleBand } from "d3-scale";
import { line as d3Line, curveMonotoneX } from "d3-shape";

interface Props {
  rows: { year: number; count: number }[];
  /** Years that exist in the *axis* but are missing in the data (rendered as a dashed segment). */
  missingYears: number[];
  width?: number;
  height?: number;
}

const M = { top: 16, right: 16, bottom: 28, left: 48 };

export function TotalPerYearChart({ rows, missingYears, width = 800, height = 280 }: Props) {
  const allYears = useMemo(() => {
    if (!rows.length) return [];
    const min = Math.min(...rows.map((r) => r.year));
    const max = Math.max(...rows.map((r) => r.year));
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [rows]);

  const lookup = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.year, r.count);
    return m;
  }, [rows]);

  const x = scaleLinear().domain([allYears[0] ?? 1984, allYears.at(-1) ?? 2026]).range([M.left, width - M.right]);
  const yMax = Math.max(1, ...rows.map((r) => r.count));
  const y = scaleLinear().domain([0, yMax]).nice().range([height - M.bottom, M.top]);

  // Build segments: split where a missingYear sits between two known points.
  const segments: Array<Array<{ year: number; count: number }>> = [];
  let cur: Array<{ year: number; count: number }> = [];
  for (const yr of allYears) {
    if (missingYears.includes(yr) || !lookup.has(yr)) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else {
      cur.push({ year: yr, count: lookup.get(yr)! });
    }
  }
  if (cur.length) segments.push(cur);

  const lineGen = d3Line<{ year: number; count: number }>()
    .x((d) => x(d.year))
    .y((d) => y(d.count))
    .curve(curveMonotoneX);

  const ticksY = y.ticks(5);
  const ticksX = [1984, 1990, 2000, 2010, 2020, 2026].filter((t) => t >= (allYears[0] ?? 0) && t <= (allYears.at(-1) ?? 0));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {ticksY.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.06} />
          <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
            {t.toLocaleString()}
          </text>
        </g>
      ))}
      {ticksX.map((t) => (
        <text key={t} x={x(t)} y={height - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
          {t}
        </text>
      ))}
      {segments.map((seg, i) => (
        <path key={`s${i}`} d={lineGen(seg) ?? ""} fill="none" stroke="currentColor" strokeWidth={1.5} />
      ))}
      {/* Dashed connectors across missing years */}
      {segments.length > 1 && segments.slice(0, -1).map((seg, i) => {
        const a = seg[seg.length - 1];
        const b = segments[i + 1][0];
        return (
          <line key={`g${i}`} x1={x(a.year)} y1={y(a.count)} x2={x(b.year)} y2={y(b.count)}
                stroke="currentColor" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.4} />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/historic/TotalPerYearChart.tsx
git commit -m "feat(historic): TotalPerYearChart with dashed gap for missing years"
```

---

### Task 18: `LevelsAreaChart` component

**Files:**
- Create: `src/presentation/components/historic/LevelsAreaChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { area as d3Area, stack as d3Stack, curveMonotoneX } from "d3-shape";
import { SNII_LEVELS, SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

interface Props {
  rows: { year: number; nivel: string; count: number }[];
  absLabel: string;
  pctLabel: string;
  locale: Locale;
  width?: number;
  height?: number;
}

const M = { top: 16, right: 120, bottom: 28, left: 48 };

export function LevelsAreaChart({ rows, absLabel, pctLabel, locale, width = 800, height = 320 }: Props) {
  const [mode, setMode] = useState<"abs" | "pct">("abs");

  const yearMap = useMemo(() => {
    const m = new Map<number, Record<SniiLevelCode, number>>();
    for (const r of rows) {
      if (!SNII_LEVELS.includes(r.nivel as SniiLevelCode)) continue;
      const e = m.get(r.year) ?? { C: 0, "1": 0, "2": 0, "3": 0, E: 0 };
      e[r.nivel as SniiLevelCode] = r.count;
      m.set(r.year, e);
    }
    return m;
  }, [rows]);

  const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
  const data = years.map((y) => ({ year: y, ...yearMap.get(y)! }));

  const stackGen = d3Stack<typeof data[number]>().keys(SNII_LEVELS as readonly SniiLevelCode[] as SniiLevelCode[]);
  let series = stackGen(data);

  if (mode === "pct") {
    series = series.map((s) =>
      Object.assign(s.map((d, i) => {
        const total = SNII_LEVELS.reduce((acc, k) => acc + (data[i] as Record<SniiLevelCode, number>)[k], 0);
        const norm = total > 0 ? (d[1] - d[0]) / total : 0;
        const baseTotal = SNII_LEVELS.slice(0, SNII_LEVELS.indexOf(s.key as SniiLevelCode))
          .reduce((acc, k) => acc + (data[i] as Record<SniiLevelCode, number>)[k], 0);
        const base = total > 0 ? baseTotal / total : 0;
        return [base, base + norm] as [number, number];
      }), { key: s.key, index: s.index })
    );
  }

  const yMax = mode === "pct" ? 1 : Math.max(1, ...series.flatMap((s) => s.map((d) => d[1])));
  const x = scaleLinear().domain([years[0] ?? 1984, years.at(-1) ?? 2026]).range([M.left, width - M.right]);
  const y = scaleLinear().domain([0, yMax]).range([height - M.bottom, M.top]);
  const areaGen = d3Area<typeof series[number][number]>()
    .x((d, i) => x(years[i]))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(curveMonotoneX);

  const ticksY = y.ticks(5);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <button onClick={() => setMode("abs")} className={`px-2 py-1 rounded ${mode === "abs" ? "bg-foreground text-background" : "bg-muted"}`}>{absLabel}</button>
        <button onClick={() => setMode("pct")} className={`px-2 py-1 rounded ${mode === "pct" ? "bg-foreground text-background" : "bg-muted"}`}>{pctLabel}</button>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.06} />
            <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {mode === "pct" ? `${Math.round(t * 100)}%` : t.toLocaleString()}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path key={s.key as string} d={areaGen(s) ?? ""} fill={SNII_LEVEL_COLORS[s.key as SniiLevelCode]} opacity={0.85} />
        ))}
        {/* legend */}
        {SNII_LEVELS.map((k, i) => (
          <g key={k} transform={`translate(${width - M.right + 8}, ${M.top + i * 18})`}>
            <rect width={10} height={10} fill={SNII_LEVEL_COLORS[k]} />
            <text x={14} y={9} fontSize={11} fill="currentColor">{SNII_LEVEL_LABELS[k][locale]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/historic/LevelsAreaChart.tsx
git commit -m "feat(historic): LevelsAreaChart with abs/pct toggle"
```

---

### Task 19: `NetFlowChart` component

**Files:**
- Create: `src/presentation/components/historic/NetFlowChart.tsx`

- [ ] **Step 1: Write the chart**

```tsx
"use client";
import { useMemo } from "react";
import { scaleBand, scaleLinear } from "d3-scale";

interface Props {
  rows: { year: number; entrants: number; departures: number }[];
  width?: number;
  height?: number;
}

const M = { top: 16, right: 16, bottom: 28, left: 56 };

export function NetFlowChart({ rows, width = 800, height = 280 }: Props) {
  const data = useMemo(() => [...rows].sort((a, b) => a.year - b.year), [rows]);
  const x = scaleBand<number>()
    .domain(data.map((d) => d.year))
    .range([M.left, width - M.right])
    .padding(0.15);
  const ymax = Math.max(1, ...data.map((d) => Math.max(d.entrants, d.departures)));
  const y = scaleLinear().domain([-ymax, ymax]).nice().range([height - M.bottom, M.top]);
  const ticksY = [y.invert(M.top), 0, y.invert(height - M.bottom)].map((t) => Math.round(t / 100) * 100);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.2} />
      {ticksY.map((t) => (
        <text key={t} x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
          {Math.abs(t).toLocaleString()}
        </text>
      ))}
      {data.map((d) => {
        const xb = x(d.year)!;
        return (
          <g key={d.year}>
            <rect x={xb} y={y(d.entrants)} width={x.bandwidth()} height={y(0) - y(d.entrants)} fill="#10b981">
              <title>{`${d.year} · +${d.entrants.toLocaleString()}`}</title>
            </rect>
            <rect x={xb} y={y(0)} width={x.bandwidth()} height={y(-d.departures) - y(0)} fill="#f43f5e">
              <title>{`${d.year} · -${d.departures.toLocaleString()}`}</title>
            </rect>
          </g>
        );
      })}
      {[1984, 1990, 2000, 2010, 2020, 2026].filter((t) => x(t) != null).map((t) => (
        <text key={t} x={(x(t) ?? 0) + x.bandwidth() / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
          {t}
        </text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/historic/NetFlowChart.tsx
git commit -m "feat(historic): NetFlowChart (entrants vs departures)"
```

---

### Task 20: `StateSmallMultiples` component

**Files:**
- Create: `src/presentation/components/historic/StateSmallMultiples.tsx`

- [ ] **Step 1: Write the component**

```tsx
import Link from "next/link";
import { scaleLinear } from "d3-scale";
import { line as d3Line, curveMonotoneX } from "d3-shape";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";

interface Props {
  rows: { year: number; entidad: string; count: number }[];
  latestYear: number;
  noPriorDataLabel: string;
}

export function StateSmallMultiples({ rows, latestYear, noPriorDataLabel }: Props) {
  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  // Group rows by entidad.
  const byState = new Map<string, { year: number; count: number }[]>();
  for (const r of rows) {
    if (!byState.has(r.entidad)) byState.set(r.entidad, []);
    byState.get(r.entidad)!.push({ year: r.year, count: r.count });
  }

  // Pick latest-year totals for sort.
  const totals = new Map<string, number>();
  for (const [s, list] of byState) {
    const latest = list.find((d) => d.year === latestYear)?.count ?? 0;
    totals.set(s, latest);
  }
  const sorted = Array.from(byState.keys()).sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));

  const allYears: number[] = (() => {
    let mn = Infinity, mx = -Infinity;
    for (const list of byState.values()) for (const d of list) { mn = Math.min(mn, d.year); mx = Math.max(mx, d.year); }
    return Array.from({ length: mx - mn + 1 }, (_, i) => mn + i);
  })();

  const allMax = Math.max(1, ...Array.from(byState.values()).flatMap((list) => list.map((d) => d.count)));
  const W = 200, H = 60, M = { top: 6, right: 6, bottom: 6, left: 6 };
  const x = scaleLinear().domain([allYears[0], allYears.at(-1)!]).range([M.left, W - M.right]);
  const y = scaleLinear().domain([0, allMax]).range([H - M.bottom, M.top]);
  const lineGen = d3Line<{ year: number; count: number }>().x((d) => x(d.year)).y((d) => y(d.count)).curve(curveMonotoneX);

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {sorted.map((entidad) => {
        const display = dbToDisplay[entidad] ?? entidad;
        const list = byState.get(entidad)!.sort((a, b) => a.year - b.year);
        const latest = list.find((d) => d.year === latestYear)?.count ?? 0;
        const params = new URLSearchParams({ entidad, year: String(latestYear) });
        return (
          <Link key={entidad} href={`/researchers?${params.toString()}`}
                className="group rounded-md border p-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs font-medium truncate">{display}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{latest.toLocaleString()}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
              {list.length === 0 ? (
                <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
                  {noPriorDataLabel}
                </text>
              ) : (
                <path d={lineGen(list) ?? ""} fill="none" stroke="currentColor" strokeWidth={1} />
              )}
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/historic/StateSmallMultiples.tsx
git commit -m "feat(historic): StateSmallMultiples sparkline grid"
```

---

### Task 21: `AreasAreaChart` component

**Files:**
- Create: `src/presentation/components/historic/AreasAreaChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useMemo } from "react";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import { area as d3Area, stack as d3Stack, curveMonotoneX } from "d3-shape";

interface Props {
  rows: { year: number; area: string; count: number }[];
  width?: number;
  height?: number;
}

const M = { top: 16, right: 220, bottom: 28, left: 48 };

export function AreasAreaChart({ rows, width = 900, height = 360 }: Props) {
  const { areas, data, years } = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.area);
    const areas = Array.from(set).sort();
    const yearMap = new Map<number, Record<string, number>>();
    for (const r of rows) {
      const e = yearMap.get(r.year) ?? Object.fromEntries(areas.map((a) => [a, 0]));
      e[r.area] = r.count;
      yearMap.set(r.year, e);
    }
    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
    const data = years.map((y) => ({ year: y, ...(yearMap.get(y) as Record<string, number>) }));
    return { areas, data, years };
  }, [rows]);

  const color = scaleOrdinal<string>().domain(areas).range(schemeTableau10 as readonly string[] as string[]);
  const stackGen = d3Stack<typeof data[number]>().keys(areas);
  const series = stackGen(data);
  const yMax = Math.max(1, ...series.flatMap((s) => s.map((d) => d[1])));
  const x = scaleLinear().domain([years[0] ?? 1984, years.at(-1) ?? 2026]).range([M.left, width - M.right]);
  const y = scaleLinear().domain([0, yMax]).range([height - M.bottom, M.top]);
  const areaGen = d3Area<typeof series[number][number]>()
    .x((_, i) => x(years[i]))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(curveMonotoneX);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {series.map((s) => (
        <path key={s.key} d={areaGen(s) ?? ""} fill={color(s.key)} opacity={0.85} />
      ))}
      {areas.map((a, i) => (
        <g key={a} transform={`translate(${width - M.right + 8}, ${M.top + i * 16})`}>
          <rect width={10} height={10} fill={color(a)} />
          <text x={14} y={9} fontSize={10} fill="currentColor">{a.length > 30 ? a.slice(0, 30) + "…" : a}</text>
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/historic/AreasAreaChart.tsx
git commit -m "feat(historic): AreasAreaChart (stacked, ordinal palette)"
```

---

### Task 22: `InstitutionBumpChart` component

**Files:**
- Create: `src/presentation/components/historic/InstitutionBumpChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useMemo, useState } from "react";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
import { line as d3Line, curveMonotoneX } from "d3-shape";

interface Props {
  rows: { year: number; institucion: string; count: number; rank: number }[];
  topN: number;
  width?: number;
  height?: number;
}

const M = { top: 16, right: 280, bottom: 28, left: 32 };

export function InstitutionBumpChart({ rows, topN, width = 1000, height = 420 }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const { byInst, years, names } = useMemo(() => {
    const byInst = new Map<string, { year: number; rank: number }[]>();
    for (const r of rows) {
      if (!byInst.has(r.institucion)) byInst.set(r.institucion, []);
      byInst.get(r.institucion)!.push({ year: r.year, rank: r.rank });
    }
    for (const list of byInst.values()) list.sort((a, b) => a.year - b.year);
    const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
    const names = Array.from(byInst.keys()).sort();
    return { byInst, years, names };
  }, [rows]);

  const color = scaleOrdinal<string>().domain(names).range(schemeTableau10 as readonly string[] as string[]);
  const x = scaleLinear().domain([years[0] ?? 1984, years.at(-1) ?? 2026]).range([M.left, width - M.right]);
  const y = scaleLinear().domain([1, topN]).range([M.top, height - M.bottom]);
  const lineGen = d3Line<{ year: number; rank: number }>().x((d) => x(d.year)).y((d) => y(d.rank)).curve(curveMonotoneX);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" onMouseLeave={() => setHover(null)}>
      {names.map((n) => {
        const list = byInst.get(n)!;
        const dim = hover && hover !== n ? 0.15 : 0.9;
        return (
          <path key={n} d={lineGen(list) ?? ""} fill="none" stroke={color(n)} strokeWidth={hover === n ? 2.5 : 1.5}
                opacity={dim} onMouseEnter={() => setHover(n)} pointerEvents="visibleStroke" />
        );
      })}
      {names.map((n, i) => (
        <g key={n} transform={`translate(${width - M.right + 8}, ${M.top + i * 14})`}
           onMouseEnter={() => setHover(n)}>
          <rect width={10} height={10} fill={color(n)} opacity={hover && hover !== n ? 0.3 : 0.9} />
          <text x={14} y={9} fontSize={10} fill="currentColor" opacity={hover && hover !== n ? 0.4 : 1}>
            {n.length > 36 ? n.slice(0, 36) + "…" : n}
          </text>
        </g>
      ))}
      {[1, 5, 10, topN].filter((r) => r <= topN).map((r) => (
        <text key={r} x={M.left - 4} y={y(r)} dy="0.32em" textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
          {r}
        </text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/historic/InstitutionBumpChart.tsx
git commit -m "feat(historic): InstitutionBumpChart with hover highlight"
```

---

### Task 23: `/historic` page + loading skeleton + nav link

**Files:**
- Create: `src/app/historic/page.tsx`
- Create: `src/app/historic/loading.tsx`
- Modify: `src/presentation/components/AppShell.tsx` (where the nav items are defined)

- [ ] **Step 1: Write the loading skeleton**

```tsx
export default function Loading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="h-8 w-72 bg-muted animate-pulse rounded" />
      <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 bg-muted animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the page**

```tsx
import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { container } from "@/lib/container";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { TotalPerYearChart } from "@/presentation/components/historic/TotalPerYearChart";
import { LevelsAreaChart } from "@/presentation/components/historic/LevelsAreaChart";
import { NetFlowChart } from "@/presentation/components/historic/NetFlowChart";
import { StateSmallMultiples } from "@/presentation/components/historic/StateSmallMultiples";
import { AreasAreaChart } from "@/presentation/components/historic/AreasAreaChart";
import { InstitutionBumpChart } from "@/presentation/components/historic/InstitutionBumpChart";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Histórico SNII · 1984–2026" };
}

const TOP_N = 15;

export default async function HistoricPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const c = container();
  const [years, totals, levels, netFlows, states, areas, institutions] = await Promise.all([
    c.getAvailableYears.execute(),
    c.getTotalsPerYear.execute(),
    c.getLevelsByYear.execute(),
    c.getNetFlowsByYear.execute(),
    c.getStatesByYear.execute(),
    c.getAreasByYear.execute(),
    c.getInstitutionsByYear.execute({ topN: TOP_N }),
  ]);

  const latestYear = years.at(-1) ?? 2026;
  const minYear = years[0] ?? 1984;
  const expectedYears = Array.from({ length: latestYear - minYear + 1 }, (_, i) => minYear + i);
  const presentYears = new Set(years);
  const missingYears = expectedYears.filter((y) => !presentYears.has(y));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t.historic.title}</h1>
        <p className="text-sm text-muted-foreground">{t.historic.subtitle}</p>
        <p className="text-xs text-muted-foreground">{t.historic.caveat}</p>
      </header>

      <ChartCard title={t.historic.totals.title} subtitle={t.historic.totals.subtitle}>
        <TotalPerYearChart rows={totals} missingYears={missingYears} />
      </ChartCard>

      <ChartCard title={t.historic.levels.title} subtitle={t.historic.levels.subtitle}>
        <LevelsAreaChart rows={levels} absLabel={t.historic.levels.abs} pctLabel={t.historic.levels.pct} locale={locale} />
      </ChartCard>

      <ChartCard title={t.historic.netFlow.title} subtitle={t.historic.netFlow.subtitle}>
        <NetFlowChart rows={netFlows} />
      </ChartCard>

      <ChartCard title={t.historic.states.title} subtitle={t.historic.states.subtitle}>
        <StateSmallMultiples rows={states} latestYear={latestYear} noPriorDataLabel={t.historic.noPriorData} />
      </ChartCard>

      <ChartCard title={t.historic.areas.title} subtitle={t.historic.areas.subtitle}>
        <AreasAreaChart rows={areas} />
      </ChartCard>

      <ChartCard title={t.historic.institutions.title} subtitle={t.historic.institutions.subtitle}>
        <InstitutionBumpChart rows={institutions} topN={TOP_N} />
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardHeader className="py-3 border-b">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Add the nav link**

Open `src/presentation/components/AppShell.tsx`. Find the array of nav items (search for the existing "researchers" / "stats" entries) and add an entry for `/historic`:

```ts
{
  href: "/historic",
  label: t.nav.historic,
  icon: <HistoricIcon />,
  match: (p) => p.startsWith("/historic"),
},
```

If `t.nav.historic` doesn't exist yet, add `historic: "Histórico"` (es) and `historic: "Historic"` (en) to the existing `nav:` blocks in `messages.ts` (small follow-up edit).

If `HistoricIcon` doesn't exist, use any existing icon import — e.g., the same icon component family the other items use, or a `lucide-react` clock/timeline icon. Check `src/presentation/components/icons.tsx` first; reuse what's there.

- [ ] **Step 4: Run dev server and visit `/historic`**

Run: `npm run dev` (in a background shell or separately).
Open: `http://localhost:3000/historic`
Expected: all six cards render with charts; numbers visually plausible (~1.4k in 1984 rising to ~48k in 2026).

- [ ] **Step 5: Commit**

```bash
git add src/app/historic/page.tsx src/app/historic/loading.tsx \
        src/presentation/components/AppShell.tsx src/presentation/i18n/messages.ts
git commit -m "feat(historic): /historic page with six trend charts and nav link"
```

---

## Phase 5 — UI: home-page year slider

### Task 24: `YearSlider` component

**Files:**
- Create: `src/presentation/components/YearSlider.tsx`

- [ ] **Step 1: Write the slider**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  availableYears: number[];
  value: number;
  labels: { label: string; play: string; pause: string; speedLabel: string };
}

const SPEEDS = [1, 2, 4] as const;

export function YearSlider({ availableYears, value, labels }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const [year, setYear] = useState(value);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<typeof SPEEDS[number]>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const min = availableYears[0] ?? 1984;
  const max = availableYears.at(-1) ?? 2026;
  const present = new Set(availableYears);

  useEffect(() => setYear(value), [value]);

  // Push URL update, debounced.
  function pushYear(y: number) {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      next.set("year", String(y));
      router.replace(`${path}?${next.toString()}`, { scroll: false });
    }, 300);
  }

  function commit(y: number) {
    setYear(y);
    pushYear(y);
  }

  // Play loop.
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    const period = 1500 / speed;
    intervalRef.current = setInterval(() => {
      setYear((cur) => {
        let next = cur + 1;
        while (next <= max && !present.has(next)) next++;
        if (next > max) {
          setPlaying(false);
          return cur;
        }
        pushYear(next);
        return next;
      });
    }, period);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, max]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="py-3">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{labels.label}</span>
          <span className="text-lg font-semibold tabular-nums">{year}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant={playing ? "default" : "outline"} onClick={() => setPlaying((p) => !p)}>
              {playing ? labels.pause : labels.play}
            </Button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{labels.speedLabel}</span>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                        className={`px-2 py-0.5 rounded ${speed === s ? "bg-foreground text-background" : "bg-muted"}`}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
        <Slider
          value={[year]}
          min={min} max={max} step={1}
          onValueChange={(v) => {
            const y = v[0];
            // snap to nearest present year if user lands on a missing one.
            let snap = y;
            if (!present.has(y)) {
              let down = y, up = y;
              while (down >= min && !present.has(down)) down--;
              while (up <= max && !present.has(up)) up++;
              snap = (y - down <= up - y) ? down : up;
            }
            commit(snap);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              let n = year - 1; while (n >= min && !present.has(n)) n--;
              if (n >= min) commit(n);
            } else if (e.key === "ArrowRight") {
              let n = year + 1; while (n <= max && !present.has(n)) n++;
              if (n <= max) commit(n);
            }
          }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          {[1984, 1990, 2000, 2010, 2020, 2026].filter((t) => t >= min && t <= max).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

If `@/components/ui/slider` does not exist, install it via shadcn first:
```bash
npx shadcn@latest add slider
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/YearSlider.tsx
git commit -m "feat(home): YearSlider with play/pause, speed, missing-year snap"
```

---

### Task 25: Wire the slider into the home page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/domain/repositories/ResearcherRepository.ts` (no-op if not strictly needed; we use `snapshotRepo` directly)

- [ ] **Step 1: Update `src/app/page.tsx` to use the snapshot repo and accept `year`**

Replace the existing data-fetching block. Concretely:

```tsx
import Link from "next/link";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { buildMexicoMap } from "@/lib/mexico/buildMap";
import { MexicoMap } from "@/presentation/components/MexicoMap";
import { MapLegend } from "@/presentation/components/MapLegend";
import { AreaPills } from "@/presentation/components/AreaPills";
import { YearSlider } from "@/presentation/components/YearSlider";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

const CARD_HEIGHT = "lg:h-[640px]";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = getMessages(locale);
  const { snapshotRepo, getAvailableYears } = container();

  const availableYears = await getAvailableYears.execute();
  const latest = availableYears.at(-1) ?? 2026;

  // Resolve year.
  const yearRaw = typeof sp.year === "string" ? Number.parseInt(sp.year, 10) : Number.NaN;
  const year = availableYears.includes(yearRaw) ? yearRaw : latest;

  const rawArea = typeof sp.area === "string" && sp.area.trim() ? sp.area : undefined;

  // Areas active in the selected year — we derive from areasByYear for honesty.
  const areasByYear = await snapshotRepo.areasByYear();
  const areasThisYear = Array.from(new Set(areasByYear.filter((r) => r.year === year).map((r) => r.area))).sort();
  const area = rawArea && areasThisYear.includes(rawArea) ? rawArea : undefined;

  const stateCounts = await snapshotRepo.countsByState(year, { area });
  const mapData = await buildMexicoMap();

  const counts: Record<string, number> = {};
  let total = 0, max = 0;
  for (const s of stateCounts) {
    counts[s.entidad] = s.count;
    total += s.count;
    if (s.count > max) max = s.count;
  }

  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }
  const linkFor = (entidad: string) => {
    const params = new URLSearchParams({ entidad, year: String(year) });
    if (area) params.set("area", area);
    return `/researchers?${params.toString()}`;
  };

  const noStateData = stateCounts.length === 0; // pre-1990 will be empty

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.map.title}</h1>
        <p className="text-sm text-muted-foreground">{t.map.subtitle}</p>
      </header>

      <YearSlider
        availableYears={availableYears}
        value={year}
        labels={{ label: t.slider.label, play: t.slider.play, pause: t.slider.pause, speedLabel: t.slider.speedLabel }}
      />

      <Card className="py-3">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{t.map.filterArea}</span>
            {area && (
              <Button variant="ghost" size="sm" nativeButton={false} className="h-7 px-2 text-xs"
                      render={<Link href={`/?year=${year}`}>{t.map.reset}</Link>} />
            )}
          </div>
          <AreaPills areas={areasThisYear} active={area} allLabel={t.map.allAreas} />
          {area && <Badge variant="secondary" className="self-start">{t.map.showingArea(area)}</Badge>}
        </CardContent>
      </Card>

      {noStateData ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t.slider.preDataNote}{" "}
            <Link href="/historic" className="underline">{t.historic.title}</Link>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 lg:grid-cols-[1fr_320px] ${CARD_HEIGHT}`}>
          <Card className="flex flex-col gap-0 py-0 overflow-hidden">
            <CardHeader className="py-3 border-b flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.map.total}</span>
                  <span className="text-xl font-semibold tabular-nums">
                    {total.toLocaleString(locale === "es" ? "es-MX" : "en-US")}
                  </span>
                  <span className="text-xs text-muted-foreground">· {stateCounts.length} {t.map.states}</span>
                </div>
              </div>
              <div className="hidden sm:block"><MapLegend max={max} label={t.map.legend} /></div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-3 sm:p-4">
              <MexicoMap width={mapData.width} height={mapData.height} shapes={mapData.shapes}
                         counts={counts} breakdowns={{}} area={area} />
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 py-0 overflow-hidden">
            <CardHeader className="py-3 border-b">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.map.topStates}</span>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full">
                <ol className="py-2">
                  {stateCounts.map((s, i) => {
                    const display = dbToDisplay[s.entidad] ?? s.entidad;
                    const pct = total > 0 ? (s.count / total) * 100 : 0;
                    const barPct = max > 0 ? (s.count / max) * 100 : 0;
                    return (
                      <li key={s.entidad}>
                        <Link href={linkFor(s.entidad)}
                              className="group block px-4 py-2 hover:bg-muted/60 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[10px] tabular-nums text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                              <span className="text-sm truncate">{display}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-medium tabular-nums">{s.count.toLocaleString()}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="ml-6 h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-foreground/70 group-hover:bg-foreground transition-colors" style={{ width: `${barPct}%` }} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

Note: the level-breakdown panel previously used `crossStateLevel()` for tooltip data. To keep tooltips working at v1 cost, we omit `breakdowns` (passing `{}`) — the tooltip will show only the count. If breakdowns matter, add a follow-up RPC `snapshots_state_level(year)` later.

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`
Open `http://localhost:3000/?year=2010`. Expected: map renders for 2010 with state counts.
Open `http://localhost:3000/?year=1984`. Expected: empty-state card with link to `/historic`.
Click play. Expected: year advances, map redraws.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(home): year slider and year-aware map"
```

---

## Phase 6 — UI: per-researcher career timeline

### Task 26: `CareerTimeline` component

**Files:**
- Create: `src/presentation/components/researcher/CareerTimeline.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { SNII_LEVELS, SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, type SniiLevelCode, isValidSniiLevel } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

interface Props {
  snapshots: { year: number; nivel: SniiLevelCode | null }[];
  globallyMissingYears: number[];
  locale: Locale;
  strings: {
    title: string;
    activeRange: (first: number, last: number, n: number) => string;
    legend: string;
    unknownLevel: string;
    yearGap: (y: number) => string;
  };
}

export function CareerTimeline({ snapshots, globallyMissingYears, locale, strings }: Props) {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort((a, b) => a.year - b.year);
  const first = sorted[0].year;
  const last = sorted.at(-1)!.year;
  const totalYears = last - first + 1;
  const lookup = new Map(sorted.map((s) => [s.year, s.nivel]));
  const cellW = Math.max(8, Math.min(20, 720 / totalYears));
  const H = 28;
  const W = cellW * totalYears;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{strings.title}</h3>
        <span className="text-xs text-muted-foreground">
          {strings.activeRange(first, last, sorted.length)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={strings.title}>
        {Array.from({ length: totalYears }, (_, i) => first + i).map((yr, i) => {
          const lvl = lookup.get(yr) ?? null;
          const globally = globallyMissingYears.includes(yr);
          const x = i * cellW;
          let fill = "transparent";
          let pattern: string | null = null;
          let title = "";
          if (globally) {
            pattern = "url(#hatch)";
            title = strings.yearGap(yr);
          } else if (lvl == null && lookup.has(yr)) {
            fill = "var(--muted-foreground)";
            title = `${yr} · ${strings.unknownLevel}`;
          } else if (lvl == null) {
            fill = "transparent";
            title = strings.yearGap(yr);
          } else if (isValidSniiLevel(lvl)) {
            fill = SNII_LEVEL_COLORS[lvl];
            title = `${yr} · ${SNII_LEVEL_LABELS[lvl][locale]}`;
          }
          return (
            <rect key={yr} x={x} y={0} width={cellW - 1} height={H - 10} fill={pattern ?? fill} stroke="currentColor" strokeOpacity={0.08}>
              <title>{title}</title>
            </rect>
          );
        })}
        {/* tick labels every 5 years */}
        {Array.from({ length: totalYears }, (_, i) => first + i)
          .filter((yr) => yr % 5 === 0)
          .map((yr) => (
            <text key={`t${yr}`} x={(yr - first) * cellW + cellW / 2} y={H - 1}
                  fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.55}>
              {yr}
            </text>
          ))}
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)">
            <line x1={0} x2={0} y1={0} y2={4} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
          </pattern>
        </defs>
      </svg>
      {/* legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-wider">{strings.legend}</span>
        {SNII_LEVELS.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SNII_LEVEL_COLORS[k] }} />
            {SNII_LEVEL_LABELS[k][locale]}
          </span>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/researcher/CareerTimeline.tsx
git commit -m "feat(researcher): CareerTimeline (yearly level strip)"
```

---

### Task 27: Rename `[cvu]` route to `[id]` and resolve via identity repo

**Files:**
- Move: `src/app/researchers/[cvu]/page.tsx` → `src/app/researchers/[id]/page.tsx`
- Move: `src/app/researchers/[cvu]/loading.tsx` → `src/app/researchers/[id]/loading.tsx`
- Move: `src/app/researchers/[cvu]/not-found.tsx` → `src/app/researchers/[id]/not-found.tsx`
- Modify: `src/app/researchers/page.tsx` (link helper)

- [ ] **Step 1: Move the route directory**

```bash
git mv src/app/researchers/[cvu] src/app/researchers/[id]
```

- [ ] **Step 2: Update the page to resolve `id` (CVU number or `c-<canonical_id>`)**

Edit `src/app/researchers/[id]/page.tsx` so the `params` type is `{ id: string }`. Replace the resolution block:

```ts
import { CareerTimeline } from "@/presentation/components/researcher/CareerTimeline";
import { AlertTriangle } from "lucide-react";

const GLOBALLY_MISSING_YEARS = [2021];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = container();
  const identity = await resolveIdentity(c, id);
  if (!identity) return { title: "Investigador no encontrado" };
  const latestSnap = (await c.getResearcherTimeline.execute(identity.canonicalId)).at(-1);
  const description = [latestSnap?.areaConocimiento, latestSnap?.institucion, latestSnap?.entidad].filter(Boolean).join(" · ");
  return {
    title: `${formatName(identity.canonicalName)} · SNII`,
    description: description || `Investigador SNII (CVU ${identity.cvu ?? "—"})`,
  };
}

async function resolveIdentity(c: ReturnType<typeof container>, id: string) {
  if (/^\d+$/.test(id)) return c.identityRepo.findByCvu(Number.parseInt(id, 10));
  const m = id.match(/^c-(\d+)$/);
  if (m) return c.identityRepo.findByCanonicalId(Number.parseInt(m[1], 10));
  return null;
}

export default async function ResearcherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getMessages(locale);
  const c = container();
  const identity = await resolveIdentity(c, id);
  if (!identity) notFound();

  const timeline = await c.getResearcherTimeline.execute(identity.canonicalId);
  const latest = timeline.at(-1);

  // Render top of page (existing hero etc.) using `latest` for current fields,
  // and `identity.canonicalName` for the displayed name. Insert the
  // CareerTimeline right under the hero card.
  // (keep the rest of the existing JSX, replacing references to `r` with derived values)
  // ...
}
```

For the rest of the JSX, replace the previous `r.*` field references as follows (do this throughout the file):

| Old | New |
|-----|-----|
| `r.cvu` | `identity.cvu ?? "—"` |
| `r.nombre` | `identity.canonicalName` |
| `r.nivel` | `latest?.nivel ?? null` |
| `r.categoria` | `latest?.categoria ?? null` |
| `r.fechaInicioVigencia` | `latest?.fechaInicioVigencia ?? null` |
| `r.fechaFinVigencia` | `latest?.fechaFinVigencia ?? null` |
| `r.areaConocimiento` | `latest?.areaConocimiento ?? null` |
| `r.disciplina` | `latest?.disciplina ?? null` |
| `r.subdisciplina` | `latest?.subdisciplina ?? null` |
| `r.especialidad` | `latest?.especialidad ?? null` |
| `r.institucionFinal` / `r.institucionAcreditacion` | `latest?.institucion ?? null` |
| `r.entidadFinal` / `r.entidadAcreditacion` | `latest?.entidad ?? null` |
| `r.dependenciaAcreditacion` | `latest?.dependencia ?? null` |
| `r.subdependenciaAcreditacion` / `r.departamentoAcreditacion` | (drop — not in v1 snapshot model) |
| `r.cpiS` | (drop — not in v1) |
| `r.notas` | (drop — not in v1) |

Below the hero card and above the InfoCards, insert:

```tsx
{identity.ambiguous && (
  <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
    <CardContent className="flex items-start gap-3 p-4 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-amber-900 dark:text-amber-100">{t.researcher.ambiguous}</p>
    </CardContent>
  </Card>
)}

<Card className="py-0">
  <CardContent className="p-4">
    <CareerTimeline
      snapshots={timeline.map((s) => ({ year: s.year, nivel: s.nivel }))}
      globallyMissingYears={GLOBALLY_MISSING_YEARS}
      locale={locale}
      strings={{
        title: t.researcher.timeline.title,
        activeRange: t.researcher.timeline.active,
        legend: t.researcher.timeline.legend,
        unknownLevel: t.researcher.timeline.unknownLevel,
        yearGap: t.researcher.timeline.yearGap,
      }}
    />
  </CardContent>
</Card>
```

- [ ] **Step 3: Update list-page link to use `c-<id>` for cvu-less identities**

Open `src/app/researchers/page.tsx`. Find the row link (search for `/researchers/${r.cvu}` or similar). The current code links by `cvu`; for compatibility, leave numeric CVU links as-is — they will continue to resolve via `findByCvu`. The new branch is only needed once the list starts surfacing cvu-less identities (v2). For v1 we keep numeric links and only ensure nothing breaks. Confirm by reading the row-render block; if there is a `${r.cvu}` literal in a Link href, leave it alone.

- [ ] **Step 4: Type-check + dev sanity**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`
Visit a known CVU page (e.g., `/researchers/2`) — should render with timeline, ambiguity banner only if `identity.ambiguous`.

- [ ] **Step 5: Commit**

```bash
git add src/app/researchers/[id]/page.tsx src/app/researchers/[id]/loading.tsx src/app/researchers/[id]/not-found.tsx \
        src/app/researchers/page.tsx
git commit -m "feat(researcher): rename [cvu] → [id], add timeline + ambiguity banner"
```

---

## Phase 7 — Cutover and cleanup

### Task 28: Migration `0007_historical_swap.sql`

**Files:**
- Create: `supabase/migrations/0007_historical_swap.sql`

- [ ] **Step 1: Write the swap**

```sql
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
```

- [ ] **Step 2: Pre-flight check**

Before applying, manually verify in `psql`:
```sql
SELECT COUNT(*) FROM snii.researchers_v2;            -- > 0
SELECT COUNT(*) FROM snii.researcher_snapshots;      -- > 0
```
Verify the dev server pages all work (home `/`, `/historic`, `/researchers/<known cvu>`).

- [ ] **Step 3: Apply the migration**

Run: `npx supabase migration up`
Expected: success.

- [ ] **Step 4: Restart the dev server and re-verify all pages**

Stop and restart `npm run dev`. Verify:
- `/` (slider, map at latest year, click through to a state)
- `/historic` (six charts)
- `/researchers` (list)
- `/researchers/<some-cvu>` (timeline + details)
- `/stats` (the existing page — note: it reads from `snii.researchers` via the *legacy* repo; after the swap, `snii.researchers` is now the v2 schema, and the legacy repo's queries reference fields like `entidad_final` that no longer exist. Expect it to break. Fix in Task 29.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0007_historical_swap.sql
git commit -m "chore(snii): swap researchers_v2 → researchers (drop legacy table + RPCs)"
```

---

### Task 29: Migrate legacy code paths off `snii.researchers` (old shape)

After the swap, the *table* `snii.researchers` exists but has the v2 columns (canonical_id, cvu, expedientes, …). The legacy `SupabaseResearcherRepository` and use cases (`GetStats`, `GetCountsByState`, `GetAnalysis`, `SearchResearchers`, `GetResearcherByCvu`) and the `/researchers` list and `/stats` pages still expect the old columns. We migrate them in two halves: list/stats now reads "latest year of researcher_snapshots".

**Files:**
- Modify: `src/infrastructure/repositories/SupabaseResearcherRepository.ts` (rewrite to read from `researcher_snapshots` joined with `researchers`)
- Modify: `src/app/researchers/page.tsx` (year filter)
- Modify: `src/app/stats/page.tsx` (read from snapshots at latest year)
- Modify: `src/domain/repositories/ResearcherRepository.ts` (add optional `year` to filtered methods)

- [ ] **Step 1: Add year-aware RPCs for facets**

Append to `supabase/migrations/0006_historical_rpcs.sql` is **not** allowed (migrations are immutable). Instead create:

`supabase/migrations/0008_legacy_yearly_rpcs.sql`:

```sql
-- Year-aware analogs of the legacy facet/cross-tab RPCs, used by /researchers, /stats.

CREATE OR REPLACE FUNCTION snii.snapshots_counts_by_column(p_column text, p_year int)
RETURNS TABLE(value text, count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
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
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_cross_state_level(p_year int)
RETURNS TABLE(entidad text, c bigint, n1 bigint, n2 bigint, n3 bigint, e bigint, total bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION snii.snapshots_area_discipline_breakdown(p_year int)
RETURNS TABLE(area text, discipline text, subdiscipline text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT area_conocimiento::text, COALESCE(disciplina, '—')::text,
         COALESCE(subdisciplina, '—')::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND area_conocimiento IS NOT NULL
  GROUP BY 1, 2, 3 ORDER BY 1, 2, 4 DESC;
$$;

CREATE OR REPLACE FUNCTION snii.snapshots_counts_by_institution(p_year int)
RETURNS TABLE(institucion text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = snii, pg_temp AS $$
  SELECT institucion::text, COUNT(*)::bigint
  FROM snii.researcher_snapshots
  WHERE year = p_year AND institucion IS NOT NULL
  GROUP BY institucion ORDER BY 2 DESC;
$$;

GRANT EXECUTE ON FUNCTION snii.snapshots_counts_by_column(text, int)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_cross_state_level(int)             TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_area_discipline_breakdown(int)     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION snii.snapshots_counts_by_institution(int)         TO anon, authenticated, service_role;
```

Run: `npx supabase migration up`
Expected: success.

- [ ] **Step 2: Rewrite the legacy `SupabaseResearcherRepository` to read snapshots at a given year**

Replace `src/infrastructure/repositories/SupabaseResearcherRepository.ts` to query `researcher_snapshots` joined with `researchers` (the new v2-shaped table after rename). The `Researcher` entity stays for backwards compat with the existing `/researchers` list and detail-fallback metadata, but its fields now come from the snapshot row + identity row.

```ts
import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type { Researcher } from "@/domain/entities/Researcher";
import type {
  AreaDisciplineRow, FacetCounts, InstitutionCount, ResearcherRepository,
  SearchOptions, SearchResult, StateCount, StateLevelRow,
} from "@/domain/repositories/ResearcherRepository";
import { isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

const toNum = (v: unknown): number =>
  typeof v === "string" ? Number.parseInt(v, 10) : (v as number);

interface SnapshotJoinRow {
  canonical_id: number;
  year: number;
  nivel: string | null;
  categoria: string | null;
  area_conocimiento: string | null;
  disciplina: string | null;
  subdisciplina: string | null;
  especialidad: string | null;
  institucion: string | null;
  dependencia: string | null;
  entidad: string | null;
  pais: string | null;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  researchers: { cvu: number | null; canonical_name: string } | null;
}

function mapSnapshotRow(r: SnapshotJoinRow): Researcher {
  return {
    cvu: r.researchers?.cvu ?? r.canonical_id, // fallback to canonical_id when cvu is null
    nombre: r.researchers?.canonical_name ?? "",
    nivel: isValidSniiLevel(r.nivel) ? r.nivel : null,
    categoria: r.categoria,
    fechaInicioVigencia: r.fecha_inicio_vigencia,
    fechaFinVigencia: r.fecha_fin_vigencia,
    areaConocimiento: r.area_conocimiento,
    disciplina: r.disciplina,
    subdisciplina: r.subdisciplina,
    especialidad: r.especialidad,
    cpiS: null,
    institucionAcreditacion: r.institucion,
    dependenciaAcreditacion: r.dependencia,
    subdependenciaAcreditacion: null,
    departamentoAcreditacion: null,
    entidadAcreditacion: r.entidad,
    posdocInvestPorMexico: null,
    institucionComision: null,
    dependenciaComision: null,
    ubicacionComision: null,
    institucionFinal: r.institucion,
    entidadFinal: r.entidad,
    notas: null,
  };
}

export class SupabaseResearcherRepository implements ResearcherRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  /** Default year used when a caller doesn't provide one. Lazy-cached. */
  private latestYear: number | null = null;
  private async resolveYear(year?: number): Promise<number> {
    if (year != null) return year;
    if (this.latestYear != null) return this.latestYear;
    const { data, error } = await this.client.from("researcher_snapshots").select("year").order("year", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    this.latestYear = (data?.year as number | undefined) ?? new Date().getFullYear();
    return this.latestYear;
  }

  async search(opts: SearchOptions): Promise<SearchResult> {
    const year = await this.resolveYear(opts.year);
    let q = this.client.from("researcher_snapshots")
      .select("*, researchers!inner(cvu, canonical_name)", { count: "exact" })
      .eq("year", year)
      .order("canonical_name", { ascending: true, foreignTable: "researchers" })
      .range(opts.offset, opts.offset + opts.limit - 1);
    if (opts.query?.trim()) {
      const tokens = opts.query.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().split(/\s+/).filter(Boolean);
      for (const t of tokens) q = q.ilike("researchers.canonical_name", `%${t}%`);
    }
    if (opts.nivel) q = q.eq("nivel", opts.nivel);
    if (opts.area) q = q.eq("area_conocimiento", opts.area);
    if (opts.entidad) q = q.eq("entidad", opts.entidad);
    if (opts.institucion) q = q.eq("institucion", opts.institucion);
    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    return { items: (data ?? []).map((r) => mapSnapshotRow(r as SnapshotJoinRow)), total: count ?? 0 };
  }

  async findByCvu(cvu: number): Promise<Researcher | null> {
    const year = await this.resolveYear();
    const { data, error } = await this.client.from("researcher_snapshots")
      .select("*, researchers!inner(cvu, canonical_name)")
      .eq("year", year).eq("researchers.cvu", cvu).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSnapshotRow(data as SnapshotJoinRow) : null;
  }

  async facets(year?: number): Promise<FacetCounts> {
    const yr = await this.resolveYear(year);
    const { count: total } = await this.client.from("researcher_snapshots")
      .select("*", { count: "exact", head: true }).eq("year", yr);
    const [byNivel, byArea, byEntidad] = await Promise.all([
      this.groupCountByYear("nivel", yr),
      this.groupCountByYear("area_conocimiento", yr),
      this.groupCountByYear("entidad", yr),
    ]);
    return { byNivel, byArea, byEntidad, total: total ?? 0 };
  }

  async distinctValues(column: "area_conocimiento" | "entidad_final", year?: number): Promise<string[]> {
    const yr = await this.resolveYear(year);
    const dbCol = column === "entidad_final" ? "entidad" : column;
    const facet = await this.groupCountByYear(dbCol, yr);
    return facet.map((f) => f.value);
  }

  async countsByState(filters?: { area?: string; year?: number }): Promise<StateCount[]> {
    const yr = await this.resolveYear(filters?.year);
    const { data, error } = await this.client.rpc("snapshots_counts_by_state", { p_year: yr, p_area: filters?.area ?? null });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ entidad: string; count: number | string }>).map((r) => ({ entidad: r.entidad, count: toNum(r.count) }));
  }

  async crossStateLevel(year?: number): Promise<StateLevelRow[]> {
    const yr = await this.resolveYear(year);
    const { data, error } = await this.client.rpc("snapshots_cross_state_level", { p_year: yr });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, string | number>>).map((r) => ({
      entidad: String(r.entidad), c: toNum(r.c), n1: toNum(r.n1), n2: toNum(r.n2),
      n3: toNum(r.n3), e: toNum(r.e), total: toNum(r.total),
    }));
  }

  async areaDisciplineBreakdown(year?: number): Promise<AreaDisciplineRow[]> {
    const yr = await this.resolveYear(year);
    const all = await this.fetchAllRpcRows<Record<string, string | number>>("snapshots_area_discipline_breakdown", { p_year: yr });
    return all.map((r) => ({
      area: String(r.area), discipline: String(r.discipline),
      subdiscipline: String(r.subdiscipline), count: toNum(r.count),
    }));
  }

  async countsByInstitution(year?: number): Promise<InstitutionCount[]> {
    const yr = await this.resolveYear(year);
    const all = await this.fetchAllRpcRows<Record<string, string | number>>("snapshots_counts_by_institution", { p_year: yr });
    return all.map((r) => ({ institucion: String(r.institucion), count: toNum(r.count) }));
  }

  private async groupCountByYear(column: string, year: number): Promise<Array<{ value: string; count: number }>> {
    const { data, error } = await this.client.rpc("snapshots_counts_by_column", { p_column: column, p_year: year });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ value: string; count: number | string }>).map((r) => ({ value: r.value, count: toNum(r.count) }));
  }

  private async fetchAllRpcRows<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
    const pageSize = 1000;
    const out: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client.rpc(fn, args ?? {}).range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as T[];
      out.push(...page);
      if (page.length < pageSize) break;
    }
    return out;
  }
}
```

- [ ] **Step 3: Update the repository interface to allow `year`**

Edit `src/domain/repositories/ResearcherRepository.ts`:
- `SearchOptions extends SearchFilters & { year?: number; limit: number; offset: number }`.
- `facets(year?: number): Promise<FacetCounts>`
- `distinctValues(column: "area_conocimiento" | "entidad_final", year?: number): Promise<string[]>`
- `countsByState(filters?: { area?: string; year?: number }): Promise<StateCount[]>`
- `crossStateLevel(year?: number): Promise<StateLevelRow[]>`
- `areaDisciplineBreakdown(year?: number): Promise<AreaDisciplineRow[]>`
- `countsByInstitution(year?: number): Promise<InstitutionCount[]>`

- [ ] **Step 4: Update `GetCountsByState`, `GetAnalysis`, `GetStats`, `SearchResearchers` to thread `year` through**

`GetCountsByState.ts`:
```ts
import type { ResearcherRepository, StateCount } from "@/domain/repositories/ResearcherRepository";

export class GetCountsByState {
  constructor(private readonly repo: ResearcherRepository) {}
  execute(filters?: { area?: string; year?: number }): Promise<StateCount[]> {
    return this.repo.countsByState(filters);
  }
}
```

`GetAnalysis.ts`:
```ts
import type { AreaDisciplineRow, InstitutionCount, ResearcherRepository, StateLevelRow } from "@/domain/repositories/ResearcherRepository";
export class GetAnalysis {
  constructor(private readonly repo: ResearcherRepository) {}
  crossStateLevel(year?: number): Promise<StateLevelRow[]> { return this.repo.crossStateLevel(year); }
  areaDisciplineBreakdown(year?: number): Promise<AreaDisciplineRow[]> { return this.repo.areaDisciplineBreakdown(year); }
  countsByInstitution(year?: number): Promise<InstitutionCount[]> { return this.repo.countsByInstitution(year); }
}
```

`GetStats.ts` — read its current implementation, add an optional `{ year?: number }` to `execute`, thread it through to `repo.facets(year)`.

`SearchResearchers.ts` — pass `year` through if the route supplies it.

- [ ] **Step 5: Update `/stats` page to pass current year**

Edit `src/app/stats/page.tsx`:
- Read `availableYears` from `container().getAvailableYears.execute()`.
- Either (a) accept `?year=` and pass to all use cases, or (b) hardcode latest. Pick (a) for symmetry with `/`.

The minimal change: add at the top:
```ts
const availableYears = await container().getAvailableYears.execute();
const latest = availableYears.at(-1) ?? new Date().getFullYear();
const sp = await searchParams; // requires changing the page signature
const yearRaw = typeof sp.year === "string" ? Number.parseInt(sp.year, 10) : Number.NaN;
const year = availableYears.includes(yearRaw) ? yearRaw : latest;
```
Then thread `year` into all three: `getStats.execute({ year })`, `getAnalysis.crossStateLevel(year)`, `getAnalysis.areaDisciplineBreakdown(year)`, `getAnalysis.countsByInstitution(year)`.

- [ ] **Step 6: Update `/researchers` list page to pass `year` through `SearchResearchers`**

Edit `src/app/researchers/page.tsx`:
- Read `availableYears` similarly.
- Read `?year=` from `sp`. Default to latest.
- Pass `year` through `searchResearchers.execute({...filters, year, limit, offset})` (signature is on `SearchResearchers` use case — extend if not present).
- Pass `year` to `repo.distinctValues(...)` calls.

- [ ] **Step 7: Type-check + run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 8: Manual sanity in the browser**

`/`, `/historic`, `/researchers`, `/researchers?year=2010`, `/researchers/<known-cvu>`, `/stats`, `/stats?year=2010`. All should render.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/0008_legacy_yearly_rpcs.sql \
        src/infrastructure/repositories/SupabaseResearcherRepository.ts \
        src/domain/repositories/ResearcherRepository.ts \
        src/application/use-cases/GetCountsByState.ts \
        src/application/use-cases/GetAnalysis.ts \
        src/application/use-cases/GetStats.ts \
        src/application/use-cases/SearchResearchers.ts \
        src/app/researchers/page.tsx \
        src/app/stats/page.tsx
git commit -m "refactor(legacy): year-aware ResearcherRepository over snapshot table"
```

---

### Task 30: Delete the old `importPadron.ts`

**Files:**
- Delete: `src/infrastructure/import/importPadron.ts`

- [ ] **Step 1: Delete and commit**

```bash
git rm src/infrastructure/import/importPadron.ts
git commit -m "chore(import): remove legacy importPadron.ts (replaced by importHistorical)"
```

---

## Phase 8 — Final verification

### Task 31: Full QA pass

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all passing.

- [ ] **Step 2: Build production bundle**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 3: Manual QA checklist**

In `npm run dev`:

- [ ] `/` opens at the latest year.
- [ ] Slider plays 1984 → 2026 without errors. 2021 is skipped.
- [ ] `/?year=1984` shows the empty-state card with the link to `/historic`.
- [ ] `/?year=2010&area=II.- BIOLOGÍA Y QUÍMICA` shows a filtered map.
- [ ] `/historic` renders all six charts within ~1s on a warm cache.
- [ ] Pick a state in `StateSmallMultiples` → routes to `/researchers?entidad=…&year=…`.
- [ ] `/researchers` lists at the latest year.
- [ ] `/researchers/<a CVU active 2003–2026>` shows a timeline spanning many years.
- [ ] `/researchers/c-<an early-only canonical_id>` (find one with `psql`: `SELECT canonical_id FROM snii.researchers WHERE cvu IS NULL LIMIT 1;`) renders a pre-2003 timeline.
- [ ] `/researchers/<a known-ambiguous CVU>` (e.g. one of the 84 from `WHERE ambiguous`) shows the amber warning banner.
- [ ] `/stats` and `/stats?year=2010` both render.

- [ ] **Step 4: Sanity-check numbers**

In `psql`:
```sql
SELECT COUNT(*) FROM snii.researcher_snapshots WHERE year = 2010;
```
Compare to the `TotalPerYearChart` value at 2010 — they should match exactly.

- [ ] **Step 5: Done — commit any incidental fixes**

If the QA pass surfaces small issues, fix and commit them as `fix(...)` commits before declaring complete.

---

## Performance budgets to verify (manual stopwatch in browser dev-tools Network tab)

- Importer end-to-end: < 60 s.
- `/historic` first SSR render: < 800 ms.
- Slider year change: < 200 ms server response.

If any blow these budgets, add appropriate indexes or batched fetches at that point — do **not** pre-optimize earlier.

---

## Self-review notes (kept inline for reference)

- **Spec coverage check:**
  - §3 data model → Tasks 1, 9 ✓
  - §4 importer → Tasks 4–8 ✓
  - §5 domain/application → Tasks 2, 3, 12–15 ✓
  - §6 home A1 → Tasks 24, 25 ✓
  - §7 historic B → Tasks 16–23 ✓
  - §8 timeline C1 → Tasks 26, 27 ✓
  - §9 migration & rollout → Tasks 28, 29, 30 ✓
  - §9 testing → Tasks 4, 5, 6, 12, 14 (unit); Task 31 (manual QA). Integration tests for `SupabaseSnapshotRepository` are intentionally deferred — the spec listed them but the project has no live test-DB harness yet, and Task 31 covers the same surface manually. If you want them later, add a small fixture-loader and a `*.test.ts` next to the repo.
- **Placeholder scan:** no "TBD/TODO/implement later" remain. Each step has either complete code or an exact command + expected output.
- **Type consistency:** `canonicalId` (camel) in TS / `canonical_id` (snake) in SQL is the only stylistic split — matches the project's existing convention. `ResearcherSnapshot.nivel: SniiLevelCode | null`, used consistently in repos and components. `YearTotal/YearLevelCount/...` types defined in `SnapshotRepository.ts` and re-imported throughout.
