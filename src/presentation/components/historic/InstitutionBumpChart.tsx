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

const M = { top: 16, right: 440, bottom: 28, left: 32 };

export function InstitutionBumpChart({ rows, topN, width = 1100, height = 420 }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [hovYear, setHovYear] = useState<{ year: number; px: number } | null>(null);

  const { byInst, years, names, countLookup } = useMemo(() => {
    const byInst = new Map<string, { year: number; rank: number }[]>();
    // countLookup: inst -> year -> { rank, count }
    const countLookup = new Map<string, Map<number, { rank: number; count: number }>>();
    for (const r of rows) {
      if (!byInst.has(r.institucion)) byInst.set(r.institucion, []);
      byInst.get(r.institucion)!.push({ year: r.year, rank: r.rank });
      if (!countLookup.has(r.institucion)) countLookup.set(r.institucion, new Map());
      countLookup.get(r.institucion)!.set(r.year, { rank: r.rank, count: r.count });
    }
    for (const list of byInst.values()) list.sort((a, b) => a.year - b.year);
    const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
    // Order legend by best-ever rank (lowest = top), tiebreak by years-in-top.
    // Institutions with a stronger or longer presence appear first.
    const names = Array.from(byInst.keys()).sort((a, b) => {
      const la = byInst.get(a)!;
      const lb = byInst.get(b)!;
      const bestA = Math.min(...la.map((d) => d.rank));
      const bestB = Math.min(...lb.map((d) => d.rank));
      if (bestA !== bestB) return bestA - bestB;
      if (la.length !== lb.length) return lb.length - la.length;
      return a.localeCompare(b);
    });
    return { byInst, years, names, countLookup };
  }, [rows]);

  const color = scaleOrdinal<string>().domain(names).range(schemeTableau10 as readonly string[] as string[]);
  const x = scaleLinear().domain([years[0] ?? 1984, years.at(-1) ?? 2026]).range([M.left, width - M.right]);
  const y = scaleLinear().domain([1, topN]).range([M.top, height - M.bottom]);
  const lineGen = d3Line<{ year: number; rank: number }>().x((d) => x(d.year)).y((d) => y(d.rank)).curve(curveMonotoneX);

  const ticksX = [1984, 1990, 2000, 2010, 2020, 2026].filter((t) => t >= (years[0] ?? 0) && t <= (years.at(-1) ?? 0));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!hover) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * width;
    const raw = Math.round(x.invert(vbX));
    const snapped = years.reduce((best, yr) =>
      Math.abs(yr - raw) < Math.abs(best - raw) ? yr : best, years[0] ?? raw);
    setHovYear({ year: snapped, px: x(snapped) });
  }

  function handleMouseLeave() {
    setHover(null);
    setHovYear(null);
  }

  // Data at hovered year for the hovered institution
  const hovEntry = hover && hovYear ? countLookup.get(hover)?.get(hovYear.year) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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
              {n}
              <title>{n}</title>
            </text>
          </g>
        ))}
        {Array.from(new Set([1, 5, 10, topN])).filter((r) => r <= topN).map((r) => (
          <text key={r} x={M.left - 4} y={y(r)} dy="0.32em" textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
            {r}
          </text>
        ))}
        {ticksX.map((t) => (
          <text key={t} x={x(t)} y={height - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
            {t}
          </text>
        ))}
        {/* Hover crosshair — only when institution is hovered */}
        {hover && hovYear && (
          <line
            x1={hovYear.px} x2={hovYear.px}
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
          onMouseEnter={() => { /* keep hover active when over chart area */ }}
        />
      </svg>
      {/* Tooltip */}
      {hover && hovYear && hovEntry && (() => {
        const pctX = (hovYear.px / width) * 100;
        return (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
            style={{ left: `${pctX}%`, top: "0%" }}
          >
            <div className="font-bold">{hovYear.year}</div>
            <div>#{hovEntry.rank} · {hovEntry.count.toLocaleString()}</div>
          </div>
        );
      })()}
    </div>
  );
}
