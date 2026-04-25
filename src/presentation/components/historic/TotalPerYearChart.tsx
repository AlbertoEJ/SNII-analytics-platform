"use client";
import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
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
  const [hov, setHov] = useState<{ year: number; px: number; py: number } | null>(null);

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

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * width;
    const raw = Math.round(x.invert(vbX));
    const snapped = allYears.reduce((best, yr) =>
      Math.abs(yr - raw) < Math.abs(best - raw) ? yr : best, allYears[0] ?? raw);
    const px = x(snapped);
    const count = lookup.get(snapped);
    const py = count != null ? y(count) : M.top;
    setHov({ year: snapped, px, py });
  }

  const isMissing = hov ? (missingYears.includes(hov.year) || !lookup.has(hov.year)) : false;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHov(null)}
      >
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
        {/* Hover crosshair */}
        {hov && (
          <line
            x1={hov.px} x2={hov.px}
            y1={M.top} y2={height - M.bottom}
            stroke="currentColor" strokeOpacity={0.25} strokeDasharray="2 3"
          />
        )}
        {/* Invisible capture rect */}
        <rect
          x={M.left} y={M.top}
          width={width - M.left - M.right}
          height={height - M.top - M.bottom}
          fill="transparent"
          pointerEvents="all"
        />
      </svg>
      {/* Tooltip */}
      {hov && (() => {
        const pctX = (hov.px / width) * 100;
        const pctY = (hov.py / height) * 100;
        return (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
            style={{ left: `${pctX}%`, top: `${pctY}%` }}
          >
            <div className="font-bold">{hov.year}</div>
            {isMissing ? (
              <div className="text-muted-foreground">sin datos</div>
            ) : (
              <div>{(lookup.get(hov.year) ?? 0).toLocaleString("es-MX")} investigadores</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
