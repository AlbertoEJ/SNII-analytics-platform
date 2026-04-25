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
    ) as typeof series;
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
