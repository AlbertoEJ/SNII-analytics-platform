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
