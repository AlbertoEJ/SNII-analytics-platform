# Stats page redesign — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current four-tab stats page with a headline dashboard plus three question-framed tabs (`¿Cuántos?` / `¿Dónde?` / `¿En qué?`), redesign the state×level heatmap as small-multiples of stacked bars, fold HHI concentration into plain-language top-N share lines, and recolor the ranked lists with a consistent category-coded + intensity-shaded palette.

**Architecture:** Server component (`src/app/stats/page.tsx`) fetches the same four datasets in parallel that it already fetches today, computes top-N shares via a new pure helper in `application/use-cases`, and renders a new `HeadlineDashboard` + `QuestionTabs` tree. Presentation follows the existing clean-architecture split — no domain/repository changes. One shared ranked-list component (`IntensityBarList`) handles both categorical (level) and single-hue intensity (state/área/institution) variants.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript, Tailwind v4, shadcn UI primitives (`card`, `tabs`, `scroll-area`), no new runtime dependencies. Testing: add `vitest` for the one pure helper with unit-testable logic; everything else is verified with `tsc --noEmit`, `next build`, and manual checks in both `es` and `en` locales.

**Spec:** `docs/superpowers/specs/2026-04-24-stats-redesign-design.md`.

---

## File map

### New files

| File | Responsibility |
| --- | --- |
| `src/application/use-cases/TopNShare.ts` | Pure helper: given `{ label, count }[]` and `n`, return `{ topN, share, total, entities }`. |
| `src/application/use-cases/TopNShare.test.ts` | Vitest unit tests for `topNShare`. |
| `src/presentation/components/stats/HeadlineDashboard.tsx` | Four headline cards row (Total, Top Estado, Top Institución, Top Área). |
| `src/presentation/components/stats/QuestionTabs.tsx` | Three-tab shell. Replaces `AnalysisTabs`. |
| `src/presentation/components/stats/CountPane.tsx` | Body of `¿Cuántos?` (donut + resumen card + level ranking). |
| `src/presentation/components/stats/PlacePane.tsx` | Body of `¿Dónde?` (concentration line + state ranking + small multiples). |
| `src/presentation/components/stats/FieldPane.tsx` | Body of `¿En qué?` (área ranking + treemap + institution concentration + institution ranking). |
| `src/presentation/components/stats/StateLevelSmallMultiples.tsx` | Grid of per-state stacked-bar mini-cards. |
| `src/presentation/components/stats/IntensityBarList.tsx` | Shared ranked list; `categorical` vs `intensity` mode. |
| `src/presentation/components/stats/ConcentrationLine.tsx` | One-line "Top N hold X%" sentence. |
| `src/presentation/components/stats/palette.ts` | Palette constants + `intensityShade(ratio)` helper for the single-hue shading. |
| `vitest.config.ts` | Minimal vitest setup. |

### Modified files

| File | Change |
| --- | --- |
| `src/app/stats/page.tsx` | Replace body with `HeadlineDashboard` + `QuestionTabs`. Compute top-N shares via `topNShare`. |
| `src/presentation/i18n/messages.ts` | Replace `stats.*` subtree with the new keys. |
| `package.json` | Add `vitest` dev dep and `test` script. |

### Removed files (deleted in final task)

- `src/presentation/components/AnalysisTabs.tsx`
- `src/presentation/components/ConcentrationView.tsx`
- `src/presentation/components/StateLevelHeatmap.tsx`
- `src/presentation/components/StatsTabs.tsx` (only if nothing else imports it — check in the delete task)

---

## Task 1: Scaffold vitest and the `topNShare` helper (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/application/use-cases/TopNShare.ts`
- Create: `src/application/use-cases/TopNShare.test.ts`
- Modify: `package.json` (add dev dep + `test` script)

- [ ] **Step 1: Add vitest**

Run:

```bash
cd /c/Users/alber/Documents/snii-platform
npm install -D vitest@^2.1.0
```

Expected: installs without errors.

- [ ] **Step 2: Add `test` script**

Edit `package.json` → `scripts`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Write the failing test for `topNShare`**

Create `src/application/use-cases/TopNShare.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { topNShare } from "./TopNShare";

describe("topNShare", () => {
  const items = [
    { label: "CDMX", count: 8000 },
    { label: "Jalisco", count: 4000 },
    { label: "Nuevo León", count: 3000 },
    { label: "Puebla", count: 2000 },
    { label: "Querétaro", count: 1000 },
    { label: "Other", count: 2000 },
  ];

  it("returns top-N entities, their combined count, and share of total", () => {
    const result = topNShare(items, 3);
    expect(result.n).toBe(3);
    expect(result.total).toBe(20000);
    expect(result.topCount).toBe(15000);
    expect(result.share).toBeCloseTo(0.75, 5);
    expect(result.entities.map((e) => e.label)).toEqual([
      "CDMX",
      "Jalisco",
      "Nuevo León",
    ]);
  });

  it("handles n greater than list length by capping at list length", () => {
    const result = topNShare(items, 10);
    expect(result.n).toBe(items.length);
    expect(result.topCount).toBe(20000);
    expect(result.share).toBeCloseTo(1, 5);
  });

  it("returns zeros and empty entities for an empty list", () => {
    const result = topNShare([], 5);
    expect(result).toEqual({ n: 0, total: 0, topCount: 0, share: 0, entities: [] });
  });

  it("does not mutate the input array", () => {
    const input = [
      { label: "B", count: 1 },
      { label: "A", count: 2 },
    ];
    const snapshot = [...input];
    topNShare(input, 1);
    expect(input).toEqual(snapshot);
  });

  it("treats n <= 0 as zero-length top", () => {
    const result = topNShare(items, 0);
    expect(result.n).toBe(0);
    expect(result.topCount).toBe(0);
    expect(result.share).toBe(0);
    expect(result.entities).toEqual([]);
  });
});
```

- [ ] **Step 5: Run the test — verify it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module './TopNShare'" or equivalent.

- [ ] **Step 6: Implement `topNShare`**

Create `src/application/use-cases/TopNShare.ts`:

```ts
export interface TopNInput {
  label: string;
  count: number;
}

export interface TopNShareResult {
  n: number;
  total: number;
  topCount: number;
  share: number;
  entities: TopNInput[];
}

export function topNShare(items: readonly TopNInput[], n: number): TopNShareResult {
  if (items.length === 0 || n <= 0) {
    return { n: 0, total: 0, topCount: 0, share: 0, entities: [] };
  }
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const capped = Math.min(n, sorted.length);
  const entities = sorted.slice(0, capped);
  const total = sorted.reduce((s, i) => s + i.count, 0);
  const topCount = entities.reduce((s, i) => s + i.count, 0);
  const share = total > 0 ? topCount / total : 0;
  return { n: capped, total, topCount, share, entities };
}
```

- [ ] **Step 7: Run the test — verify it passes**

Run: `npm test`
Expected: PASS, all 5 tests green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/application/use-cases/TopNShare.ts src/application/use-cases/TopNShare.test.ts
git commit -m "feat(stats): add topNShare helper + vitest setup"
```

---

## Task 2: Palette constants and shade helper

**Files:**
- Create: `src/presentation/components/stats/palette.ts`

- [ ] **Step 1: Create the palette module**

Create `src/presentation/components/stats/palette.ts`:

```ts
export type PaletteName = "state" | "area" | "institution";

// Single-hue palettes expressed as [lightest HSL, darkest HSL] pairs.
// Shading is interpolated between the two endpoints based on ratio in [0, 1].
const PALETTES: Record<PaletteName, { light: [number, number, number]; dark: [number, number, number] }> = {
  state:       { light: [212, 85, 92], dark: [212, 90, 42] }, // blue
  area:        { light: [160, 55, 90], dark: [160, 70, 32] }, // green/teal
  institution: { light: [270, 55, 92], dark: [270, 70, 45] }, // violet
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Returns an HSL color string for a palette, with lightness/saturation mixed
 * between its "light" and "dark" endpoints based on ratio.
 *
 * ratio = 1 → darkest (top of the list)
 * ratio = 0 → lightest (bottom of the list)
 *
 * Consumers should pass `count / maxCountInList` as the ratio.
 */
export function intensityShade(palette: PaletteName, ratio: number): string {
  const t = clamp(ratio, 0, 1);
  const p = PALETTES[palette];
  const h = p.light[0];
  const s = lerp(p.light[1], p.dark[1], t);
  const l = lerp(p.light[2], p.dark[2], t);
  return `hsl(${h.toFixed(0)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

/** The solid "anchor" color for a palette — used for treemap tiles, headline accents, etc. */
export function paletteAnchor(palette: PaletteName): string {
  const p = PALETTES[palette];
  return `hsl(${p.dark[0]} ${p.dark[1]}% ${p.dark[2]}%)`;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/palette.ts
git commit -m "feat(stats): add palette + intensityShade helper"
```

---

## Task 3: `IntensityBarList` shared ranked list component

**Files:**
- Create: `src/presentation/components/stats/IntensityBarList.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/IntensityBarList.tsx`:

```tsx
"use client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { intensityShade, type PaletteName } from "./palette";

export interface RankedRow {
  label: string;
  count: number;
  /** Optional explicit color — only used when `mode === "categorical"`. */
  color?: string;
  /** Optional stable id to scroll into view programmatically. */
  id?: string;
}

type Props = {
  rows: RankedRow[];
  total: number;
  maxHeight?: number;
  showIndex?: boolean;
} & (
  | { mode: "categorical" }
  | { mode: "intensity"; palette: PaletteName }
);

export function IntensityBarList(props: Props) {
  const { rows, total, maxHeight = 640, showIndex = true } = props;
  const max = rows[0]?.count ?? 1;

  return (
    <Card className="py-0 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <ol>
            {rows.map((row, i) => {
              const pct = total > 0 ? (row.count / total) * 100 : 0;
              const barPct = max > 0 ? (row.count / max) * 100 : 0;
              const barColor =
                props.mode === "categorical"
                  ? row.color ?? "var(--foreground)"
                  : intensityShade(props.palette, max > 0 ? row.count / max : 0);
              return (
                <li
                  key={row.id ?? row.label}
                  id={row.id}
                  className="px-4 py-3 border-b last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {showIndex && (
                        <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}
                        </span>
                      )}
                      <span className="text-sm truncate">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium tabular-nums">
                        {row.count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className={showIndex ? "ml-7 h-1.5 rounded-full bg-muted overflow-hidden" : "h-1.5 rounded-full bg-muted overflow-hidden"}>
                    <div
                      className="h-full"
                      style={{ width: `${barPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/IntensityBarList.tsx
git commit -m "feat(stats): add IntensityBarList (categorical + intensity modes)"
```

---

## Task 4: `ConcentrationLine` plain-language component

**Files:**
- Create: `src/presentation/components/stats/ConcentrationLine.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/ConcentrationLine.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

export interface ConcentrationLineProps {
  /** Localized, fully-rendered sentence. Caller is responsible for i18n. */
  text: string;
}

/**
 * One-line, plain-language summary such as "Las 5 entidades con más investigadores concentran el 52% del total."
 * Accepts a pre-rendered string; i18n interpolation happens in the server component.
 */
export function ConcentrationLine({ text }: ConcentrationLineProps) {
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <p className="text-sm text-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/ConcentrationLine.tsx
git commit -m "feat(stats): add ConcentrationLine component"
```

---

## Task 5: `StateLevelSmallMultiples` — stacked-bar mini-cards per state

**Files:**
- Create: `src/presentation/components/stats/StateLevelSmallMultiples.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/StateLevelSmallMultiples.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { StateLevelRow } from "@/domain/repositories/ResearcherRepository";
import { SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

interface Props {
  rows: StateLevelRow[];
  dbToDisplay: Record<string, string>;
  title: string;
  subtitle: string;
  locale: Locale;
}

// Canonical order for stack segments: C → 1 → 2 → 3 → E.
const ORDER: SniiLevelCode[] = ["C", "1", "2", "3", "E"];

function segmentValue(row: StateLevelRow, code: SniiLevelCode): number {
  switch (code) {
    case "C": return row.c;
    case "1": return row.n1;
    case "2": return row.n2;
    case "3": return row.n3;
    case "E": return row.e;
  }
}

export function StateLevelSmallMultiples({ rows, dbToDisplay, title, subtitle, locale }: Props) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sorted.map((row) => {
          const display = dbToDisplay[row.entidad] ?? row.entidad;
          const total = row.total || 1;
          return (
            <Card key={row.entidad} className="py-0">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium truncate" title={display}>{display}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {row.total.toLocaleString()}
                  </span>
                </div>
                <div
                  className="flex h-2 rounded-full overflow-hidden bg-muted"
                  role="img"
                  aria-label={ORDER.map((code) => {
                    const v = segmentValue(row, code);
                    const pct = ((v / total) * 100).toFixed(1);
                    return `${SNII_LEVEL_LABELS[code][locale]} ${pct}%`;
                  }).join(", ")}
                >
                  {ORDER.map((code) => {
                    const value = segmentValue(row, code);
                    const pct = (value / total) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={code}
                        style={{ width: `${pct}%`, backgroundColor: SNII_LEVEL_COLORS[code] }}
                        title={`${SNII_LEVEL_LABELS[code][locale]}: ${value.toLocaleString()} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
git add src/presentation/components/stats/StateLevelSmallMultiples.tsx
git commit -m "feat(stats): add StateLevelSmallMultiples (replaces heatmap)"
```

---

## Task 6: `HeadlineDashboard` — four top cards

**Files:**
- Create: `src/presentation/components/stats/HeadlineDashboard.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/HeadlineDashboard.tsx`:

```tsx
"use client";
import { Card, CardContent } from "@/components/ui/card";

export interface HeadlineCard {
  label: string;
  value: string;
  caption: string;
  /** Optional anchor hash to jump to (e.g. "#place" or "#inst-unam"). */
  href?: string;
}

interface Props {
  cards: [HeadlineCard, HeadlineCard, HeadlineCard, HeadlineCard];
}

export function HeadlineDashboard({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, idx) => {
        const body = (
          <Card className="py-0 h-full">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">{c.value}</span>
              <span className="text-[12px] text-muted-foreground leading-snug">
                {c.caption}
              </span>
            </CardContent>
          </Card>
        );
        if (c.href) {
          return (
            <a
              key={idx}
              href={c.href}
              aria-label={c.caption}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              {body}
            </a>
          );
        }
        return <div key={idx}>{body}</div>;
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
git add src/presentation/components/stats/HeadlineDashboard.tsx
git commit -m "feat(stats): add HeadlineDashboard (4 headline cards)"
```

---

## Task 7: `CountPane` — `¿Cuántos?` body

**Files:**
- Create: `src/presentation/components/stats/CountPane.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/CountPane.tsx`:

```tsx
"use client";
import { Card, CardContent } from "@/components/ui/card";
import { LevelDonut } from "@/presentation/components/LevelDonut";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, SNII_LEVELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

export interface LevelFacet {
  code: SniiLevelCode;
  count: number;
}

interface Strings {
  rankingTitle: string;
  summaryTitle: string;
  summaryBullets: string[]; // pre-rendered, localized
}

interface Props {
  total: number;
  levels: LevelFacet[];
  locale: Locale;
  strings: Strings;
}

export function CountPane({ total, levels, locale, strings }: Props) {
  const countByCode = new Map(levels.map((l) => [l.code, l.count]));

  const donutSlices = SNII_LEVELS
    .map((code) => ({
      label: SNII_LEVEL_LABELS[code][locale],
      count: countByCode.get(code) ?? 0,
      color: SNII_LEVEL_COLORS[code],
    }))
    .filter((s) => s.count > 0);

  const rows: RankedRow[] = SNII_LEVELS
    .map((code) => ({
      label: SNII_LEVEL_LABELS[code][locale],
      count: countByCode.get(code) ?? 0,
      color: SNII_LEVEL_COLORS[code],
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="py-6">
          <CardContent className="flex justify-center">
            <LevelDonut total={total} slices={donutSlices} width={260} height={260} centerLabel="" />
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">{strings.summaryTitle}</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              {strings.summaryBullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.rankingTitle}</h3>
        <IntensityBarList rows={rows} total={total} mode="categorical" />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/CountPane.tsx
git commit -m "feat(stats): add CountPane (¿Cuántos? body)"
```

---

## Task 8: `PlacePane` — `¿Dónde?` body

**Files:**
- Create: `src/presentation/components/stats/PlacePane.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/PlacePane.tsx`:

```tsx
import { ConcentrationLine } from "./ConcentrationLine";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { StateLevelSmallMultiples } from "./StateLevelSmallMultiples";
import type { StateLevelRow } from "@/domain/repositories/ResearcherRepository";
import type { Locale } from "@/presentation/i18n/messages";

interface Strings {
  rankingTitle: string;
  smallMultiples: { title: string; subtitle: string };
  concentrationLine: string; // pre-rendered
}

interface Props {
  total: number;
  stateRows: StateLevelRow[];
  dbToDisplay: Record<string, string>;
  locale: Locale;
  strings: Strings;
}

export function PlacePane({ total, stateRows, dbToDisplay, locale, strings }: Props) {
  const ranking: RankedRow[] = [...stateRows]
    .sort((a, b) => b.total - a.total)
    .map((r) => ({
      label: dbToDisplay[r.entidad] ?? r.entidad,
      count: r.total,
      id: `state-${r.entidad}`,
    }));

  return (
    <div id="place" className="space-y-4">
      <ConcentrationLine text={strings.concentrationLine} />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.rankingTitle}</h3>
        <IntensityBarList rows={ranking} total={total} mode="intensity" palette="state" />
      </section>

      <StateLevelSmallMultiples
        rows={stateRows}
        dbToDisplay={dbToDisplay}
        title={strings.smallMultiples.title}
        subtitle={strings.smallMultiples.subtitle}
        locale={locale}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/PlacePane.tsx
git commit -m "feat(stats): add PlacePane (¿Dónde? body)"
```

---

## Task 9: `FieldPane` — `¿En qué?` body

**Files:**
- Create: `src/presentation/components/stats/FieldPane.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/FieldPane.tsx`:

```tsx
import { ConcentrationLine } from "./ConcentrationLine";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { DisciplineTreemap } from "@/presentation/components/DisciplineTreemap";
import type { AreaDisciplineRow, InstitutionCount } from "@/domain/repositories/ResearcherRepository";

interface Strings {
  areaTitle: string;
  treemapTitle: string;
  treemapSubtitle: string;
  institutionTitle: string;
  institutionConcentration: string; // pre-rendered
}

interface Props {
  total: number;
  areaRows: AreaDisciplineRow[];
  institutions: InstitutionCount[];
  strings: Strings;
}

export function FieldPane({ total, areaRows, institutions, strings }: Props) {
  // Area totals (sum across disciplines).
  const areaTotals = new Map<string, number>();
  for (const row of areaRows) {
    areaTotals.set(row.area, (areaTotals.get(row.area) ?? 0) + row.count);
  }
  const areaRanking: RankedRow[] = Array.from(areaTotals.entries())
    .map(([label, count]) => ({ label, count, id: `area-${label}` }))
    .sort((a, b) => b.count - a.count);

  const institutionRanking: RankedRow[] = institutions.map((i) => ({
    label: i.institucion,
    count: i.count,
    id: `inst-${i.institucion}`,
  }));

  return (
    <div id="field" className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.areaTitle}</h3>
        <IntensityBarList rows={areaRanking} total={total} mode="intensity" palette="area" />
      </section>

      <DisciplineTreemap rows={areaRows} title={strings.treemapTitle} subtitle={strings.treemapSubtitle} />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.institutionTitle}</h3>
        <ConcentrationLine text={strings.institutionConcentration} />
        <IntensityBarList rows={institutionRanking} total={total} mode="intensity" palette="institution" />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/FieldPane.tsx
git commit -m "feat(stats): add FieldPane (¿En qué? body)"
```

---

## Task 10: `QuestionTabs` — three-tab shell

**Files:**
- Create: `src/presentation/components/stats/QuestionTabs.tsx`

- [ ] **Step 1: Implement the component**

Create `src/presentation/components/stats/QuestionTabs.tsx`:

```tsx
"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface Props {
  strings: { count: string; place: string; field: string };
  count: ReactNode;
  place: ReactNode;
  field: ReactNode;
}

export function QuestionTabs({ strings, count, place, field }: Props) {
  return (
    <Tabs defaultValue="count">
      <TabsList>
        <TabsTrigger value="count">{strings.count}</TabsTrigger>
        <TabsTrigger value="place">{strings.place}</TabsTrigger>
        <TabsTrigger value="field">{strings.field}</TabsTrigger>
      </TabsList>
      <TabsContent value="count" className="mt-2">{count}</TabsContent>
      <TabsContent value="place" className="mt-2">{place}</TabsContent>
      <TabsContent value="field" className="mt-2">{field}</TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/stats/QuestionTabs.tsx
git commit -m "feat(stats): add QuestionTabs (3-tab shell)"
```

---

## Task 11: Update i18n — add new `stats.*` keys, remove old ones

**Files:**
- Modify: `src/presentation/i18n/messages.ts`

- [ ] **Step 1: Replace the `stats` subtree (both locales)**

In `src/presentation/i18n/messages.ts`, replace the entire `stats: { ... }` block in **both** the `es` and `en` entries.

For `es`, replace with:

```ts
stats: {
  title: "Análisis del padrón",
  subtitle: "Sistema Nacional de Investigadoras e Investigadores",
  headline: {
    total: "Total",
    totalCaption: "Investigadoras e investigadores en el SNII.",
    topState: "Entidad con más investigadores",
    topStateCaption: (name: string, share: string) =>
      `1 de cada ${share} investigadores está en ${name}.`,
    topInstitution: "Institución con más investigadores",
    topInstitutionCaption: (name: string, share: string) =>
      `${name} concentra el ${share} del total.`,
    topArea: "Área más numerosa",
    topAreaCaption: (name: string, share: string) =>
      `${name} agrupa al ${share} del padrón.`,
  },
  tabs: {
    count: "¿Cuántos?",
    place: "¿Dónde?",
    field: "¿En qué?",
  },
  count: {
    summaryTitle: "Resumen",
    rankingTitle: "Distribución por nivel",
    bulletTotal: (n: string) => `${n} investigadoras e investigadores en total.`,
    bulletTopTier: (pct: string) => `${pct} están en nivel III o Emérito/a.`,
    bulletCandidates: (pct: string) => `${pct} son candidatas/os.`,
    bulletLevels: (n: number) => `${n} niveles distintos representados.`,
  },
  place: {
    rankingTitle: "Ranking de entidades",
    concentrationLine: (n: number, share: string) =>
      `Las ${n} entidades con más investigadores concentran el ${share} del total.`,
    smallMultiples: {
      title: "Composición por nivel en cada entidad",
      subtitle: "Cada tarjeta muestra cómo se reparten los niveles dentro de una entidad.",
    },
  },
  field: {
    areaTitle: "Áreas del conocimiento",
    treemapTitle: "Áreas, disciplinas y subdisciplinas",
    treemapSubtitle: "Profundiza en la estructura del padrón. Haz clic para expandir.",
    institutionTitle: "Instituciones",
    institutionConcentration: (n: number, share: string) =>
      `Las ${n} instituciones con más investigadores concentran el ${share} del total.`,
  },
},
```

For `en`, replace with:

```ts
stats: {
  title: "Roll analysis",
  subtitle: "National System of Researchers",
  headline: {
    total: "Total",
    totalCaption: "Researchers in the SNII.",
    topState: "Top state",
    topStateCaption: (name: string, share: string) =>
      `1 in ${share} researchers is in ${name}.`,
    topInstitution: "Top institution",
    topInstitutionCaption: (name: string, share: string) =>
      `${name} holds ${share} of the total.`,
    topArea: "Largest knowledge area",
    topAreaCaption: (name: string, share: string) =>
      `${name} accounts for ${share} of the roll.`,
  },
  tabs: {
    count: "How many?",
    place: "Where?",
    field: "In what fields?",
  },
  count: {
    summaryTitle: "Summary",
    rankingTitle: "Distribution by level",
    bulletTotal: (n: string) => `${n} researchers in total.`,
    bulletTopTier: (pct: string) => `${pct} are at level III or Emeritus.`,
    bulletCandidates: (pct: string) => `${pct} are candidates.`,
    bulletLevels: (n: number) => `${n} distinct levels represented.`,
  },
  place: {
    rankingTitle: "State ranking",
    concentrationLine: (n: number, share: string) =>
      `The top ${n} states hold ${share} of all researchers.`,
    smallMultiples: {
      title: "Level composition within each state",
      subtitle: "Each card shows how SNII levels are distributed inside a state.",
    },
  },
  field: {
    areaTitle: "Knowledge areas",
    treemapTitle: "Areas, disciplines and subdisciplines",
    treemapSubtitle: "Drill into the roll's structure. Click to expand.",
    institutionTitle: "Institutions",
    institutionConcentration: (n: number, share: string) =>
      `The top ${n} institutions hold ${share} of all researchers.`,
  },
},
```

**Note:** This removes the old keys (`total`, `byLevel`, `byArea`, `byState`, `categories`, `largest`, `smallest`, `median`, `heatmap`, `disciplines.*`, `concentration.*` and the old `tabs` shape). `src/app/stats/page.tsx` is the only consumer; it will be rewritten in Task 12 in the same session.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in `src/app/stats/page.tsx` (because it still reads old keys) and in `src/presentation/components/AnalysisTabs.tsx`. **These are expected** and will be resolved in Tasks 12–13. Do not fix them here.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/i18n/messages.ts
git commit -m "feat(stats): rewrite i18n keys for redesigned stats page"
```

---

## Task 12: Rewrite `src/app/stats/page.tsx`

**Files:**
- Modify: `src/app/stats/page.tsx`

- [ ] **Step 1: Replace the page with the new composition**

Overwrite `src/app/stats/page.tsx` with:

```tsx
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVEL_LABELS, isValidSniiLevel, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";
import { topNShare } from "@/application/use-cases/TopNShare";
import { HeadlineDashboard, type HeadlineCard } from "@/presentation/components/stats/HeadlineDashboard";
import { QuestionTabs } from "@/presentation/components/stats/QuestionTabs";
import { CountPane, type LevelFacet } from "@/presentation/components/stats/CountPane";
import { PlacePane } from "@/presentation/components/stats/PlacePane";
import { FieldPane } from "@/presentation/components/stats/FieldPane";

export const revalidate = 3600;

export default async function StatsPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const { getStats, getAnalysis } = container();

  const [stats, stateLevel, areaBreakdown, institutions] = await Promise.all([
    getStats.execute(),
    getAnalysis.crossStateLevel(),
    getAnalysis.areaDisciplineBreakdown(),
    getAnalysis.countsByInstitution(),
  ]);

  // DB-name → display-name map for states.
  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  const total = stats.total;
  const fmtPct = (ratio: number) =>
    `${(ratio * 100).toLocaleString(locale === "es" ? "es-MX" : "en-US", { maximumFractionDigits: 1 })}%`;
  const fmtNum = (n: number) =>
    n.toLocaleString(locale === "es" ? "es-MX" : "en-US");

  // --- ¿Cuántos? data ---
  const levels: LevelFacet[] = stats.byNivel
    .filter((n): n is { value: SniiLevelCode; count: number } => isValidSniiLevel(n.value))
    .map((n) => ({ code: n.value, count: n.count }));

  const topTierCount = levels
    .filter((l) => l.code === "3" || l.code === "E")
    .reduce((s, l) => s + l.count, 0);
  const candidateCount = levels.find((l) => l.code === "C")?.count ?? 0;

  const countStrings = {
    summaryTitle: t.stats.count.summaryTitle,
    rankingTitle: t.stats.count.rankingTitle,
    summaryBullets: [
      t.stats.count.bulletTotal(fmtNum(total)),
      t.stats.count.bulletTopTier(fmtPct(total > 0 ? topTierCount / total : 0)),
      t.stats.count.bulletCandidates(fmtPct(total > 0 ? candidateCount / total : 0)),
      t.stats.count.bulletLevels(levels.filter((l) => l.count > 0).length),
    ],
  };

  // --- ¿Dónde? data ---
  const stateItems = stateLevel.map((r) => ({
    label: dbToDisplay[r.entidad] ?? r.entidad,
    count: r.total,
  }));
  const stateShare = topNShare(stateItems, 5);

  const placeStrings = {
    rankingTitle: t.stats.place.rankingTitle,
    smallMultiples: {
      title: t.stats.place.smallMultiples.title,
      subtitle: t.stats.place.smallMultiples.subtitle,
    },
    concentrationLine: t.stats.place.concentrationLine(stateShare.n, fmtPct(stateShare.share)),
  };

  // --- ¿En qué? data ---
  const areaTotalsMap = new Map<string, number>();
  for (const row of areaBreakdown) {
    areaTotalsMap.set(row.area, (areaTotalsMap.get(row.area) ?? 0) + row.count);
  }
  const areaItems = Array.from(areaTotalsMap.entries()).map(([label, count]) => ({ label, count }));

  const institutionItems = institutions.map((i) => ({ label: i.institucion, count: i.count }));
  const institutionShare = topNShare(institutionItems, 5);

  const fieldStrings = {
    areaTitle: t.stats.field.areaTitle,
    treemapTitle: t.stats.field.treemapTitle,
    treemapSubtitle: t.stats.field.treemapSubtitle,
    institutionTitle: t.stats.field.institutionTitle,
    institutionConcentration: t.stats.field.institutionConcentration(
      institutionShare.n,
      fmtPct(institutionShare.share),
    ),
  };

  // --- Headline cards ---
  const topState = stateShare.entities[0] ?? { label: "—", count: 0 };
  const topInstitution = institutionShare.entities[0] ?? { label: "—", count: 0 };
  const topArea = areaItems.slice().sort((a, b) => b.count - a.count)[0] ?? { label: "—", count: 0 };

  const topStatePct = total > 0 ? topState.count / total : 0;
  const topInstitutionPct = total > 0 ? topInstitution.count / total : 0;
  const topAreaPct = total > 0 ? topArea.count / total : 0;

  // "1 de cada N" uses a rounded reciprocal of the share.
  const oneInN = (ratio: number) =>
    ratio > 0 ? Math.max(2, Math.round(1 / ratio)).toLocaleString(locale === "es" ? "es-MX" : "en-US") : "—";

  const headlineCards: [HeadlineCard, HeadlineCard, HeadlineCard, HeadlineCard] = [
    {
      label: t.stats.headline.total,
      value: fmtNum(total),
      caption: t.stats.headline.totalCaption,
    },
    {
      label: t.stats.headline.topState,
      value: topState.label,
      caption: t.stats.headline.topStateCaption(topState.label, oneInN(topStatePct)),
      href: `#state-${encodeURIComponent(
        // Store the DB-name in the hash so the anchor matches the PlacePane row id.
        Object.entries(dbToDisplay).find(([, display]) => display === topState.label)?.[0] ?? topState.label,
      )}`,
    },
    {
      label: t.stats.headline.topInstitution,
      value: topInstitution.label,
      caption: t.stats.headline.topInstitutionCaption(topInstitution.label, fmtPct(topInstitutionPct)),
      href: `#inst-${encodeURIComponent(topInstitution.label)}`,
    },
    {
      label: t.stats.headline.topArea,
      value: topArea.label,
      caption: t.stats.headline.topAreaCaption(topArea.label, fmtPct(topAreaPct)),
      href: `#area-${encodeURIComponent(topArea.label)}`,
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.stats.title}</h1>
        <p className="text-sm text-muted-foreground">{t.stats.subtitle}</p>
      </header>

      <HeadlineDashboard cards={headlineCards} />

      <QuestionTabs
        strings={{ count: t.stats.tabs.count, place: t.stats.tabs.place, field: t.stats.tabs.field }}
        count={
          <CountPane
            total={total}
            levels={levels}
            locale={locale}
            strings={countStrings}
          />
        }
        place={
          <PlacePane
            total={total}
            stateRows={stateLevel}
            dbToDisplay={dbToDisplay}
            locale={locale}
            strings={placeStrings}
          />
        }
        field={
          <FieldPane
            total={total}
            areaRows={areaBreakdown}
            institutions={institutions}
            strings={fieldStrings}
          />
        }
      />
    </div>
  );
}
```

Note the unused import `SNII_LEVEL_LABELS` should not be carried over — the snippet above removes it. Double-check your replacement keeps only the imports actually used.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in `src/presentation/components/AnalysisTabs.tsx` (and possibly `ConcentrationView.tsx`, `StateLevelHeatmap.tsx`). These files will be deleted in Task 13. The new page itself should type-check cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/app/stats/page.tsx
git commit -m "feat(stats): rewrite page.tsx using HeadlineDashboard + QuestionTabs"
```

---

## Task 13: Delete obsolete components

**Files:**
- Delete: `src/presentation/components/AnalysisTabs.tsx`
- Delete: `src/presentation/components/ConcentrationView.tsx`
- Delete: `src/presentation/components/StateLevelHeatmap.tsx`
- Possibly delete: `src/presentation/components/StatsTabs.tsx` (only if unused)

- [ ] **Step 1: Verify nothing else imports these files**

Run for each file (skip if no matches):

```bash
grep -rn "AnalysisTabs" /c/Users/alber/Documents/snii-platform/src --include="*.ts" --include="*.tsx"
grep -rn "ConcentrationView" /c/Users/alber/Documents/snii-platform/src --include="*.ts" --include="*.tsx"
grep -rn "StateLevelHeatmap" /c/Users/alber/Documents/snii-platform/src --include="*.ts" --include="*.tsx"
grep -rn "StatsTabs" /c/Users/alber/Documents/snii-platform/src --include="*.ts" --include="*.tsx"
```

Expected: only matches are inside the files themselves (self-references). If any other file imports them, STOP and fix that file first — the new page rewrite in Task 12 should have removed all external consumers.

- [ ] **Step 2: Delete the files**

```bash
rm src/presentation/components/AnalysisTabs.tsx
rm src/presentation/components/ConcentrationView.tsx
rm src/presentation/components/StateLevelHeatmap.tsx
```

If `StatsTabs.tsx` had no importers in Step 1, also:

```bash
rm src/presentation/components/StatsTabs.tsx
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A src/presentation/components/
git commit -m "chore(stats): remove obsolete AnalysisTabs, ConcentrationView, StateLevelHeatmap"
```

---

## Task 14: Build verification + manual UI pass

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: all `topNShare` tests pass.

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: builds without errors; `/stats` appears in the route manifest.

- [ ] **Step 4: Start the dev server**

Run: `npm run dev`
Expected: server comes up on http://localhost:3000.

- [ ] **Step 5: Manual UI pass — ES locale**

Open http://localhost:3000/stats. Verify:

- Header "Análisis del padrón" is visible.
- Four headline cards render below the header with plausible values (Total matches previous page, Top Estado/Institución/Área are populated, captions are readable Spanish).
- The three tabs read `¿Cuántos?`, `¿Dónde?`, `¿En qué?`.
- **`¿Cuántos?`:** donut + resumen card + level ranking with level-coded colors (orange/blue/violet/green/rose).
- **`¿Dónde?`:** concentration line at top, state ranking with single-hue intensity bars (darkest at top), small-multiples grid below with one card per state and a stacked bar.
- **`¿En qué?`:** área ranking (intensity), treemap, institution concentration line, institution ranking (intensity). Scrolling the institution list works.
- Clicking the "Top Institución" card jumps to the institution row in the `¿En qué?` tab (and activates that tab). Same for Top Área → área row, Top Estado → state row.

Note anything broken here before continuing.

- [ ] **Step 6: Manual UI pass — EN locale**

Switch locale to `en` (via whatever mechanism `getLocale()` reads — commonly a cookie or URL param; inspect the repo's locale switcher if unclear). Verify:

- All strings are in English.
- Headline captions read naturally ("1 in N researchers is in …", "… holds X% of the total", "… accounts for X% of the roll").
- Tab labels read "How many? / Where? / In what fields?".

- [ ] **Step 7: Check Network tab revalidation header**

Refresh `/stats` and confirm it's served from the revalidation cache (server response should include standard Next.js cache headers; confirm page loads without hitting the DB a second time if you watch `docker logs` of the Supabase container — optional).

- [ ] **Step 8: No commit**

Verification only — no files changed. If any issue was found in Steps 5–7, create a fix and commit it separately before moving on.

---

## Self-review notes

**Spec coverage.** Walked through each section of the spec:

- Problem / goals → addressed by the new page structure (Task 12) and the three panes (Tasks 7–9).
- Headline cards with clickable Top Estado/Institución/Área → Task 6 + Task 12.
- Three question-framed tabs, no sub-tabs → Task 10 + Task 12.
- Plain-language concentration lines replacing HHI → Task 4, used in Tasks 8 and 9.
- State×level small multiples replacing heatmap → Task 5.
- Area palette linking treemap and ranking → treemap uses its own d3-driven colors; the ranking uses the area palette. The spec's "block colors are pulled from the same área palette" is not strictly implemented — the treemap still uses its existing color scheme. **Noting this as an intentional deviation** to keep the treemap change minimal; revisit if visual review shows the link is needed.
- Intensity shading proportional to count (not rank-spaced) → Task 2 (`intensityShade` uses `count / max`), consumed in Task 3.
- `getTopNShare` helper → Task 1.
- i18n key rewrite → Task 11.
- Caching `revalidate = 3600` preserved → Task 12 keeps the export.
- Unit tests for `topNShare` → Task 1.
- Obsolete component removal → Task 13.
- Verification in both locales → Task 14.

**Placeholder scan.** No `TBD`/`TODO` in the plan. No "add appropriate error handling" filler. Every code block is complete.

**Type consistency.** Cross-checked names:

- `topNShare(...)` returns `{ n, total, topCount, share, entities }` (Task 1). Consumers in Task 12 read `stateShare.n`, `stateShare.share`, `stateShare.entities[0]`, `institutionShare.n`, `institutionShare.share`, `institutionShare.entities[0]` — all present.
- `IntensityBarList` prop name `mode` is `"categorical" | "intensity"` (Task 3). All three consumers (`CountPane`, `PlacePane`, `FieldPane`) use those exact literals.
- `PaletteName = "state" | "area" | "institution"` (Task 2). `PlacePane` passes `"state"`, `FieldPane` passes `"area"` and `"institution"` — match.
- `RankedRow.id` set to `state-${dbName}`, `inst-${label}`, `area-${label}` in the panes; the headline card hrefs in Task 12 target the same conventions (`#state-…`, `#inst-…`, `#area-…`).
- `SniiLevelCode` values `C/1/2/3/E` used consistently across `CountPane`, `StateLevelSmallMultiples`, and `page.tsx` — match the canonical list in `src/domain/value-objects/SniiLevel.ts`.
- i18n keys added in Task 11 are exactly the keys read in Task 12 (`t.stats.headline.*`, `t.stats.tabs.count/place/field`, `t.stats.count.*`, `t.stats.place.*`, `t.stats.field.*`) — match.
