# Stats page redesign — design spec

**Date:** 2026-04-24
**Scope:** `src/app/stats/page.tsx` and its presentation components.
**Status:** design approved by user, pending written review before implementation planning.

## Problem

The current stats page has two usability problems:

1. **Navigation is nested.** Four top-level tabs (`Overview / Distribution / Disciplines / Concentration`), and the Overview tab has its own three sub-tabs (`Level / Area / State`). Users do not know where a given stat lives.
2. **Some charts are hard to read.** Specifically: the state × level heatmap table in the Distribution tab, the color treatment of the ranked lists in "Por Área" and "Por Entidad", and the HHI-based concentration view.

Audience is mixed — casual visitors (journalists, students) and researchers/academics. Casual visitors need plain-language takeaways; researchers still expect detail and precision.

## Goals

- Flatten the navigation: no tabs inside tabs.
- Give the page a clear entry point that states the headline numbers in plain language.
- Replace or redesign the chart types users flagged as unreadable.
- Preserve the charts that work (level donut, discipline treemap, ranked bar lists).
- Keep the clean-architecture separation (domain / application / infrastructure / presentation).
- Keep bilingual ES/EN support and the current hourly revalidation.

## Non-goals

- No changes to the underlying data model or Postgres schema.
- No new data sources; reuse the existing `getStats` and `getAnalysis.*` use cases.
- No interactive filtering/drill-down beyond what exists today. Those can come later.
- No trend / time-series analysis (source data is a single snapshot).

## Page structure

```
┌─────────────────────────────────────────────────────────┐
│  Estadísticas SNII                        (header)      │
│  subtítulo corto                                        │
├─────────────────────────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                │
│  │ Total │ │ Top   │ │ Top   │ │ Top   │  headline     │
│  │       │ │ Estado│ │ Instit│ │ Área  │  cards (4)    │
│  └───────┘ └───────┘ └───────┘ └───────┘                │
├─────────────────────────────────────────────────────────┤
│  [ ¿Cuántos? ]  [ ¿Dónde? ]  [ ¿En qué? ]  3 tabs      │
├─────────────────────────────────────────────────────────┤
│                 (active tab content)                    │
└─────────────────────────────────────────────────────────┘
```

- Header unchanged (title + subtitle from `t.stats.title` / `t.stats.subtitle`).
- Four **headline cards** replace the single "Total" card. Each card is a value + a one-line plain-language caption. The three "Top ..." cards are clickable: clicking jumps to the relevant tab with that entity scrolled into view.
- Three **question-framed tabs**, flat. No sub-tabs anywhere in the page.

### Headline cards

| Card | Value | Caption (ES) |
| --- | --- | --- |
| Total | `stats.total` | "Investigadoras e investigadores en el SNII." |
| Top Estado | Top state name + share | "1 de cada N investigadores está en {estado}." |
| Top Institución | Top institution name + share | "{institución} concentra el X% del total." |
| Top Área | Top área name + share | "{área} es la más numerosa, con X% del total." |

EN versions use the same structure via i18n keys under `t.stats.headline.*`.

The three "Top …" cards are interactive: clicking activates the corresponding tab (`¿Dónde?`, `¿En qué?` for institution, `¿En qué?` for área) and scrolls the matching row in that tab's ranked list into view. The Total card is not interactive. Keyboard focus order follows reading order; each interactive card is an `<a>` (or `<button>` with router navigation, whichever the existing codebase prefers) with an `aria-label` equal to the caption.

## Tab 1 — `¿Cuántos?` (scale + level)

Content, top to bottom:

1. **Level donut** (reuse current `LevelDonut`, SNII level colors).
2. **Resumen** card — 3–4 plain-language bullets derived from the same data:
   - total count
   - share at top tier (`III + Emérito`)
   - share of candidatos/as
   - number of distinct levels
3. **Ranked level bar list** — one row per SNII level, bar colored with the level's canonical color (from `SNII_LEVEL_COLORS`). Each row shows absolute count and share. This is the category-coded variant of the shared `IntensityBarList` component.

## Tab 2 — `¿Dónde?` (geography)

Content, top to bottom:

1. **Concentration line** — one short sentence: "Las 5 entidades con más investigadores concentran el X% del total." Derived from a new `topNShare` helper in `application/`.
2. **State ranking** — `IntensityBarList` in single-hue intensity mode. One neutral blue hue; darker shade for higher counts. Rows show count and share.
3. **State × level small multiples** — replaces the current `StateLevelHeatmap` table. One small card per state, each card contains a 100%-stacked horizontal bar split into SNII levels, using the same level colors as the donut. Grid layout (4 cards/row on desktop, 2 on tablet, 1 on mobile). Sorted by total count descending. Header of each card: state display name + total count.

## Tab 3 — `¿En qué?` (areas + disciplines + institutions)

Content, top to bottom:

1. **Áreas del conocimiento** — `IntensityBarList` in single-hue intensity mode, using a dedicated área palette (single hue, shaded by rank).
2. **Disciplinas treemap** — reuse `DisciplineTreemap`. Block colors are pulled from the same área palette so the two sections link visually.
3. **Instituciones** — plain-language concentration line ("Las 5 instituciones con más investigadores concentran el X% del total."), followed by an `IntensityBarList` in single-hue intensity mode (distinct institution hue). Scrollable, top 50.

The current `Concentration` tab is removed entirely — its two contributions (state concentration, institution concentration) become the plain-language lines inside tabs 2 and 3.

## Color system

Consistent across the page:

- **SNII level colors** — unchanged, from `SNII_LEVEL_COLORS`. Used in: level donut, level ranked bars, state×level small multiples.
- **Área palette** — a single hue with intensity shading by rank. Used in: área ranked bars, treemap blocks.
- **State palette** — a different single hue, intensity shading by rank. Used in: state ranked bars.
- **Institution palette** — a third single hue, intensity shading by rank. Used in: institution ranked bars.

Each non-level palette is one hue with intensity scaling — no rainbows, no semantic color mixing within a single list.

"Intensity shading" is computed from each row's count relative to the max count in the list (same normalization the existing `Panel` uses for bar width). The row's bar fill uses a lightness ramp between a light and dark shade of the palette's hue, mapped linearly from `count / max`. This means the top row is always fully saturated and the bottom row is lightest — proportional to value, not evenly spaced by rank position.

## Component architecture

Follows the existing clean-architecture layout.

### Domain / repository

No changes.

### Application

Add one new helper in `src/application/use-cases/`:

- `getTopNShare(items, n)` → `{ topN, share, entities }` where `share` is `sum(top N) / total`. Used for headline cards and the two concentration lines. Pure function, unit-testable.

### Presentation — new components

| Component | Purpose |
| --- | --- |
| `HeadlineDashboard.tsx` | Four headline cards row. Accepts pre-computed totals, top entities, and i18n strings. |
| `QuestionTabs.tsx` | Three-tab shell (`¿Cuántos?` / `¿Dónde?` / `¿En qué?`). Replaces `AnalysisTabs.tsx`. |
| `CountPane.tsx` | Body of `¿Cuántos?`. Composes level donut + resumen card + level ranking. |
| `PlacePane.tsx` | Body of `¿Dónde?`. Composes concentration line + state ranking + state×level small multiples. |
| `FieldPane.tsx` | Body of `¿En qué?`. Composes área ranking + treemap + concentration line + institution ranking. |
| `StateLevelSmallMultiples.tsx` | Grid of stacked-bar mini-cards, one per state. Replaces `StateLevelHeatmap.tsx`. |
| `IntensityBarList.tsx` | Shared ranked list. Two modes: `categorical` (colors passed per row, used for level) and `intensity` (single hue, shade derived from rank within the list). Replaces the ad-hoc `Panel` in `AnalysisTabs`. |
| `ConcentrationLine.tsx` | One-line plain-language "Top N hold X%" sentence. Accepts pre-computed share + entity count + i18n template. |

### Presentation — removed

- `AnalysisTabs.tsx` — replaced by `QuestionTabs.tsx` and the three pane components.
- `ConcentrationView.tsx` — replaced by two `ConcentrationLine` instances.
- `StateLevelHeatmap.tsx` — replaced by `StateLevelSmallMultiples.tsx`.
- The inner `OverviewPane` / `DonutPane` / `Panel` / `SummaryCard` helpers inside `AnalysisTabs` — superseded by `CountPane` and `IntensityBarList`.

### `src/app/stats/page.tsx`

Shape after redesign: the server component still fetches the same four things in parallel (`getStats`, `crossStateLevel`, `areaDisciplineBreakdown`, `countsByInstitution`), computes the top-N shares via the new helper, builds the i18n strings bundle, then renders `<HeadlineDashboard>` + `<QuestionTabs>`. No data fetching moves into client components.

## i18n

New keys under `t.stats.*`:

- `headline.totalCaption`, `headline.topStateCaption`, `headline.topInstitutionCaption`, `headline.topAreaCaption`
- `tabs.count`, `tabs.place`, `tabs.field`
- `count.summary.*` (bullet templates for the resumen card)
- `place.concentrationTemplate`, `place.smallMultiples.*`
- `field.concentrationTemplate`
- Shared: `concentration.topNTemplate` (e.g. "Las {n} {entities} con más ... concentran el {share} del total.")

Removed keys: `tabs.overview`, `tabs.distribution`, `tabs.disciplines`, `tabs.concentration`, `heatmap.*`, `byLevel`, `byArea`, `byState`, `overview.largest`, `overview.smallest`, `overview.median`, `overview.categories`, and the full `concentration.*` subtree (`hhi`, `hhiHint`, `topShareTop3`, `topShareTop5`, `topShareHintTop3`, `dominance`, `dominanceHint`, `byState`, `byInstitution`, `interpretation`, `verticeTemplate`, `moderateTemplate`, `dispersedTemplate`, `topShort`).

## Caching and data flow

- Page remains `export const revalidate = 3600;`.
- All data still fetched on the server in `page.tsx`. Client components receive plain props only.
- `getTopNShare` runs server-side as part of the page render; results are serialized to the headline cards and concentration lines.

## Testing

- Unit test `getTopNShare` with representative inputs (empty list, n > list length, tied counts).
- Snapshot-level visual check of each new presentation component in isolation (props fixtures).
- Manual pass through the three tabs in both `es` and `en` locales, verifying headline captions, concentration lines, and that the state×level small multiples render all 32 states with consistent stacked-bar ordering.

## Migration notes

- Single PR.
- Remove old components and i18n keys in the same change — no need to keep a compat shim, nothing else in the app consumes them.
- No database migrations, no environment changes.
