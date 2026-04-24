"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from "d3-hierarchy";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AreaDisciplineRow } from "@/domain/repositories/ResearcherRepository";

const SHORT_NAMES: Record<string, string> = {
  I: "Físico-mat.",
  II: "Biología y química",
  III: "Medicina",
  IV: "Conducta y educación",
  V: "Humanidades",
  VI: "C. Sociales",
  VII: "Agropecuarias",
  VIII: "Ingenierías",
  IX: "Interdisc.",
};

// Distinct, accessible colors for the 9 SNII areas.
const AREA_COLORS: Record<string, string> = {
  I: "#3b82f6",
  II: "#10b981",
  III: "#ef4444",
  IV: "#f59e0b",
  V: "#8b5cf6",
  VI: "#06b6d4",
  VII: "#84cc16",
  VIII: "#f97316",
  IX: "#64748b",
};

interface Datum {
  name: string; // full label
  short: string; // short label (for pill / breadcrumb)
  color: string;
  link?: string;
  children?: Datum[];
  value?: number;
}

interface Props {
  rows: AreaDisciplineRow[];
  title: string;
  subtitle: string;
  width?: number;
  height?: number;
}

function shortArea(area: string): string {
  const m = area.match(/^([IVXLCDM]+)\.\s*(.+)$/);
  if (!m) return area;
  return SHORT_NAMES[m[1]] ? `${m[1]} · ${SHORT_NAMES[m[1]]}` : m[1];
}

function areaColor(area: string): string {
  const m = area.match(/^([IVXLCDM]+)\./);
  return m ? AREA_COLORS[m[1]] ?? "#71717a" : "#71717a";
}

function buildHierarchy(rows: AreaDisciplineRow[]): Datum {
  const areas = new Map<string, Map<string, number>>();
  for (const r of rows) {
    let disc = areas.get(r.area);
    if (!disc) {
      disc = new Map();
      areas.set(r.area, disc);
    }
    disc.set(r.discipline, (disc.get(r.discipline) ?? 0) + r.count);
  }
  const sortedAreas = [...areas.keys()].sort((a, b) => romanValue(a) - romanValue(b));
  return {
    name: "root",
    short: "root",
    color: "#000",
    children: sortedAreas.map((area) => {
      const disciplines = areas.get(area)!;
      const sorted = [...disciplines.entries()].sort((a, b) => b[1] - a[1]);
      return {
        name: area,
        short: shortArea(area),
        color: areaColor(area),
        children: sorted.map(([disc, count]) => ({
          name: disc,
          short: disc,
          color: areaColor(area),
          link: `/researchers?area=${encodeURIComponent(area)}`,
          value: count,
        })),
      } satisfies Datum;
    }),
  };
}

function romanValue(area: string): number {
  const m = area.match(/^([IVXLCDM]+)\./);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0,
    prev = 0;
  for (const ch of m[1]) {
    const v = map[ch] ?? 0;
    total += v > prev ? v - 2 * prev : v;
    prev = v;
  }
  return total;
}

export function DisciplineTreemap({
  rows,
  title,
  subtitle,
  width = 1000,
  height = 560,
}: Props) {
  const fullTree = useMemo(() => buildHierarchy(rows), [rows]);
  const [focus, setFocus] = useState<string | null>(null); // area name when zoomed in

  const datum = useMemo<Datum>(() => {
    if (!focus) {
      // Top level: show areas as leaves (sized by total)
      return {
        name: "root",
        short: "root",
        color: "#000",
        children: fullTree.children!.map((area) => ({
          name: area.name,
          short: area.short,
          color: area.color,
          value: (area.children ?? []).reduce((s, c) => s + (c.value ?? 0), 0),
        })),
      };
    }
    const area = fullTree.children!.find((a) => a.name === focus);
    if (!area) return fullTree;
    return area;
  }, [fullTree, focus]);

  const layout = useMemo(() => {
    const root = hierarchy<Datum>(datum)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return treemap<Datum>()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(treemapSquarify)(root);
  }, [datum, width, height]);

  const total = layout.value ?? 0;
  const leaves = layout.leaves();

  return (
    <Card className="py-0 overflow-hidden">
      <CardHeader className="py-3 border-b flex-row items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {focus && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setFocus(null)}
          >
            ← Volver
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground min-h-[20px]">
          <span className="font-medium text-foreground">Áreas</span>
          {focus && (
            <>
              <span>›</span>
              <span className="font-medium text-foreground truncate">{focus}</span>
            </>
          )}
          <span className="ml-auto tabular-nums">
            {total.toLocaleString()} investigadores
          </span>
        </div>

        <div className="w-full overflow-hidden rounded-lg">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto block"
          >
            {leaves.map((node) => (
              <TreemapCell
                key={`${node.data.name}-${node.x0}-${node.y0}`}
                node={node}
                onAreaClick={!focus ? (name) => setFocus(name) : undefined}
                total={total}
              />
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function TreemapCell({
  node,
  onAreaClick,
  total,
}: {
  node: HierarchyRectangularNode<Datum>;
  onAreaClick?: (name: string) => void;
  total: number;
}) {
  const w = node.x1 - node.x0;
  const h = node.y1 - node.y0;
  const value = node.value ?? 0;
  const pct = total > 0 ? (value / total) * 100 : 0;
  const fontSize = Math.min(14, Math.max(10, Math.sqrt(w * h) / 12));
  const showLabel = w > 60 && h > 28;
  const showValue = w > 70 && h > 44;

  const content = (
    <g>
      <rect
        x={node.x0}
        y={node.y0}
        width={w}
        height={h}
        fill={node.data.color}
        rx={6}
        ry={6}
        opacity={onAreaClick ? 0.95 : 0.85}
        className="transition-opacity hover:opacity-100"
      />
      {showLabel && (
        <text
          x={node.x0 + 8}
          y={node.y0 + fontSize + 4}
          fill="white"
          fontSize={fontSize}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          <tspan>{truncate(node.data.short ?? node.data.name, Math.floor(w / (fontSize * 0.55)))}</tspan>
        </text>
      )}
      {showValue && (
        <text
          x={node.x0 + 8}
          y={node.y0 + fontSize * 2 + 10}
          fill="white"
          fontSize={Math.max(9, fontSize - 2)}
          opacity={0.85}
          style={{ pointerEvents: "none" }}
        >
          {value.toLocaleString()} · {pct.toFixed(1)}%
        </text>
      )}
      <title>{`${node.data.name}: ${value.toLocaleString()} (${pct.toFixed(1)}%)`}</title>
    </g>
  );

  if (onAreaClick) {
    return (
      <g
        onClick={() => onAreaClick(node.data.name)}
        style={{ cursor: "pointer" }}
        role="button"
        aria-label={node.data.name}
      >
        {content}
      </g>
    );
  }
  if (node.data.link) {
    return (
      <Link href={node.data.link} aria-label={node.data.name}>
        {content}
      </Link>
    );
  }
  return content;
}

function truncate(s: string, max: number): string {
  if (max <= 1) return "";
  return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;
}
