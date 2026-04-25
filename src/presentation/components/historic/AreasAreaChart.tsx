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
