"use client";
import { useState } from "react";
import Link from "next/link";
import { scaleLinear } from "d3-scale";
import { line as d3Line, curveMonotoneX } from "d3-shape";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";

interface Props {
  rows: { year: number; entidad: string; count: number }[];
  latestYear: number;
  noPriorDataLabel: string;
}

const W = 200, H = 60, MC = { top: 6, right: 6, bottom: 6, left: 6 };

interface CardProps {
  entidad: string;
  display: string;
  list: { year: number; count: number }[];
  latestYear: number;
  allYears: number[];
  allMax: number;
  noPriorDataLabel: string;
  href: string;
}

function SparkCard({ entidad, display, list, latestYear, allYears, allMax, noPriorDataLabel, href }: CardProps) {
  const [hov, setHov] = useState<{ year: number; px: number } | null>(null);

  const x = scaleLinear().domain([allYears[0], allYears.at(-1)!]).range([MC.left, W - MC.right]);
  const y = scaleLinear().domain([0, allMax]).range([H - MC.bottom, MC.top]);
  const lineGen = d3Line<{ year: number; count: number }>().x((d) => x(d.year)).y((d) => y(d.count)).curve(curveMonotoneX);

  const lookup = new Map(list.map((d) => [d.year, d.count]));
  const latestCount = lookup.get(latestYear) ?? 0;
  const displayCount = hov ? (lookup.get(hov.year) ?? 0) : latestCount;
  const displayYear = hov ? hov.year : latestYear;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * W;
    const raw = Math.round(x.invert(vbX));
    const snapped = allYears.reduce((best, yr) =>
      Math.abs(yr - raw) < Math.abs(best - raw) ? yr : best, allYears[0] ?? raw);
    setHov({ year: snapped, px: x(snapped) });
  }

  return (
    <Link key={entidad} href={href}
          className="group rounded-md border p-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-medium truncate">{display}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {hov ? `${displayYear}: ` : ""}{displayCount.toLocaleString()}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHov(null)}
      >
        {list.length === 0 ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
            {noPriorDataLabel}
          </text>
        ) : (
          <path d={lineGen(list) ?? ""} fill="none" stroke="currentColor" strokeWidth={1} />
        )}
        {/* Hover crosshair */}
        {hov && (
          <line
            x1={hov.px} x2={hov.px}
            y1={MC.top} y2={H - MC.bottom}
            stroke="currentColor" strokeOpacity={0.25} strokeDasharray="2 3"
          />
        )}
        {/* Invisible capture rect */}
        <rect
          x={MC.left} y={MC.top}
          width={W - MC.left - MC.right}
          height={H - MC.top - MC.bottom}
          fill="transparent"
          pointerEvents="all"
        />
      </svg>
    </Link>
  );
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

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {sorted.map((entidad) => {
        const display = dbToDisplay[entidad] ?? entidad;
        const list = byState.get(entidad)!.sort((a, b) => a.year - b.year);
        const params = new URLSearchParams({ entidad, year: String(latestYear) });
        return (
          <SparkCard
            key={entidad}
            entidad={entidad}
            display={display}
            list={list}
            latestYear={latestYear}
            allYears={allYears}
            allMax={allMax}
            noPriorDataLabel={noPriorDataLabel}
            href={`/researchers?${params.toString()}`}
          />
        );
      })}
    </div>
  );
}
