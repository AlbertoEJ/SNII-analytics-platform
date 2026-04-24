"use client";
import { useMemo, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { StateLevelHeatmap } from "./StateLevelHeatmap";
import { DisciplineTree } from "./DisciplineTree";
import { DisciplineTreemap } from "./DisciplineTreemap";
import { ConcentrationView } from "./ConcentrationView";
import { LevelDonut } from "./LevelDonut";
import { Button } from "@/components/ui/button";
import type {
  AreaDisciplineRow,
  InstitutionCount,
  StateLevelRow,
} from "@/domain/repositories/ResearcherRepository";
import { SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, SNII_LEVELS } from "@/domain/value-objects/SniiLevel";

export interface FacetItem {
  label: string;
  count: number;
}

interface OverviewStrings {
  largest: string;
  smallest: string;
  median: string;
  categories: string;
}

interface ConcentrationStrings {
  title: string;
  subtitle: string;
  hhi: string;
  hhiHint: string;
  topShareTop3: string;
  topShareTop5: string;
  topShareHintTop3: string;
  dominance: string;
  dominanceHint: string;
  byState: string;
  byInstitution: string;
  interpretation: string;
  // Pre-resolved interpretation templates with {entity}, {share}, {hhi} placeholders.
  verticeTemplate: string;
  moderateTemplate: string;
  dispersedTemplate: string;
  topShort: string; // e.g. "Top-5"
}

interface HeatmapStrings {
  title: string;
  subtitle: string;
  state: string;
}

interface DisciplineStrings {
  title: string;
  subtitle: string;
  researchers: string;
}

interface Props {
  total: number;
  overview: {
    nivel: FacetItem[];
    area: FacetItem[];
    entidad: FacetItem[];
  };
  stateLevel: StateLevelRow[];
  areaBreakdown: AreaDisciplineRow[];
  institutions: InstitutionCount[];
  dbToDisplay: Record<string, string>;
  strings: {
    tabs: {
      overview: string;
      distribution: string;
      disciplines: string;
      concentration: string;
    };
    byLevel: string;
    byArea: string;
    byState: string;
    overview: OverviewStrings;
    heatmap: HeatmapStrings;
    disciplines: DisciplineStrings;
    concentration: ConcentrationStrings;
  };
}

export function AnalysisTabs({
  total,
  overview,
  stateLevel,
  areaBreakdown,
  institutions,
  dbToDisplay,
  strings,
}: Props) {
  // For the heatmap rows we want the display name for each state.
  const heatmapRows = useMemo(
    () =>
      stateLevel.map((r) => ({
        ...r,
        // entidad stays as DB name; component looks up display via dbToDisplay
      })),
    [stateLevel],
  );

  // For concentration: states (with display names) and institutions.
  const stateItems = useMemo(
    () =>
      stateLevel.map((r) => ({
        label: dbToDisplay[r.entidad] ?? r.entidad,
        count: r.total,
      })),
    [stateLevel, dbToDisplay],
  );
  const institutionItems = useMemo(
    () => institutions.map((i) => ({ label: i.institucion, count: i.count })),
    [institutions],
  );

  const overviewTabs = [
    { id: "nivel", label: strings.byLevel, items: overview.nivel },
    { id: "area", label: strings.byArea, items: overview.area },
    { id: "entidad", label: strings.byState, items: overview.entidad },
  ];

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">{strings.tabs.overview}</TabsTrigger>
        <TabsTrigger value="distribution">{strings.tabs.distribution}</TabsTrigger>
        <TabsTrigger value="disciplines">{strings.tabs.disciplines}</TabsTrigger>
        <TabsTrigger value="concentration">{strings.tabs.concentration}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-2">
        <OverviewPane total={total} tabs={overviewTabs} strings={strings.overview} />
      </TabsContent>

      <TabsContent value="distribution" className="mt-2">
        <StateLevelHeatmap
          rows={heatmapRows}
          dbToDisplay={dbToDisplay}
          title={strings.heatmap.title}
          subtitle={strings.heatmap.subtitle}
          stateLabel={strings.heatmap.state}
        />
      </TabsContent>

      <TabsContent value="disciplines" className="mt-2">
        <DisciplinesPane
          rows={areaBreakdown}
          title={strings.disciplines.title}
          subtitle={strings.disciplines.subtitle}
          researchersLabel={strings.disciplines.researchers}
        />
      </TabsContent>

      <TabsContent value="concentration" className="mt-2">
        <ConcentrationView
          strings={strings.concentration}
          states={stateItems}
          institutions={institutionItems}
        />
      </TabsContent>
    </Tabs>
  );
}

function DisciplinesPane({
  rows,
  title,
  subtitle,
  researchersLabel,
}: {
  rows: AreaDisciplineRow[];
  title: string;
  subtitle: string;
  researchersLabel: string;
}) {
  const [view, setView] = useState<"map" | "tree">("map");
  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1">
        <Button
          variant={view === "map" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setView("map")}
        >
          Treemap
        </Button>
        <Button
          variant={view === "tree" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setView("tree")}
        >
          Árbol
        </Button>
      </div>
      {view === "map" ? (
        <DisciplineTreemap rows={rows} title={title} subtitle={subtitle} />
      ) : (
        <DisciplineTree
          rows={rows}
          title={title}
          subtitle={subtitle}
          researchersLabel={researchersLabel}
        />
      )}
    </div>
  );
}

function OverviewPane({
  total,
  tabs,
  strings,
}: {
  total: number;
  tabs: Array<{ id: string; label: string; items: FacetItem[] }>;
  strings: OverviewStrings;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const showDonut = current.id === "nivel";

  // Build donut slices in canonical level order, matching colors.
  const donutSlices = useMemo(() => {
    if (!showDonut) return [];
    return SNII_LEVELS.map((code) => {
      const label = SNII_LEVEL_LABELS[code].es;
      const found = current.items.find((i) => i.label === SNII_LEVEL_LABELS[code].es);
      return {
        label,
        count: found?.count ?? 0,
        color: SNII_LEVEL_COLORS[code],
      };
    }).filter((s) => s.count > 0);
  }, [current, showDonut]);

  return (
    <div className="space-y-4">
      <Tabs value={active} onValueChange={(v) => setActive(String(v))}>
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {showDonut ? (
        <DonutPane total={total} items={current.items} slices={donutSlices} strings={strings} />
      ) : (
        <Panel total={total} items={current.items} strings={strings} />
      )}
    </div>
  );
}

function DonutPane({
  total,
  items,
  slices,
  strings,
}: {
  total: number;
  items: FacetItem[];
  slices: Array<{ label: string; count: number; color: string }>;
  strings: OverviewStrings;
}) {
  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const counts = items.map((i) => i.count);
    const sorted = [...counts].sort((a, b) => a - b);
    return {
      n: items.length,
      largest: { label: items[0].label, count: items[0].count },
      smallest: {
        label: items[items.length - 1].label,
        count: items[items.length - 1].count,
      },
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }, [items]);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label={strings.categories} value={summary.n.toLocaleString()} />
          <SummaryCard
            label={strings.largest}
            value={summary.largest.count.toLocaleString()}
            sub={summary.largest.label}
          />
          <SummaryCard label={strings.median} value={summary.median.toLocaleString()} />
          <SummaryCard
            label={strings.smallest}
            value={summary.smallest.count.toLocaleString()}
            sub={summary.smallest.label}
          />
        </div>
      )}
      <Card className="py-6">
        <CardContent className="flex justify-center">
          <LevelDonut
            total={total}
            slices={slices}
            width={300}
            height={300}
            centerLabel={strings.categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Panel({
  total,
  items,
  strings,
}: {
  total: number;
  items: FacetItem[];
  strings: OverviewStrings;
}) {
  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const counts = items.map((i) => i.count);
    const sorted = [...counts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return {
      largest: { label: items[0].label, count: items[0].count },
      smallest: {
        label: items[items.length - 1].label,
        count: items[items.length - 1].count,
      },
      median,
      n: items.length,
    };
  }, [items]);

  const max = items[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label={strings.categories} value={summary.n.toLocaleString()} />
          <SummaryCard
            label={strings.largest}
            value={summary.largest.count.toLocaleString()}
            sub={summary.largest.label}
          />
          <SummaryCard label={strings.median} value={summary.median.toLocaleString()} />
          <SummaryCard
            label={strings.smallest}
            value={summary.smallest.count.toLocaleString()}
            sub={summary.smallest.label}
          />
        </div>
      )}

      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <ol>
              {items.map((it, i) => {
                const pct = total > 0 ? (it.count / total) * 100 : 0;
                const barPct = max > 0 ? (it.count / max) * 100 : 0;
                return (
                  <li key={it.label} className="px-4 py-3 border-b last:border-b-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm truncate">{it.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium tabular-nums">
                          {it.count.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="ml-7 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground/70"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums mt-0.5">{value}</div>
        {sub && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={sub}>
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
