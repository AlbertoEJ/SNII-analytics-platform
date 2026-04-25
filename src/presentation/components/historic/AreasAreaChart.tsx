"use client";
import { useMemo, useState } from "react";
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
  const [hov, setHov] = useState<{ year: number; px: number } | null>(null);

  const { areas, data, years, yearMap } = useMemo(() => {
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
    return { areas, data, years, yearMap };
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

  const ticksY = y.ticks(5);
  const ticksX = [1984, 1990, 2000, 2010, 2020, 2026].filter((t) => t >= (years[0] ?? 0) && t <= (years.at(-1) ?? 0));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * width;
    const raw = Math.round(x.invert(vbX));
    const snapped = years.reduce((best, yr) =>
      Math.abs(yr - raw) < Math.abs(best - raw) ? yr : best, years[0] ?? raw);
    setHov({ year: snapped, px: x(snapped) });
  }

  const hovData = hov ? yearMap.get(hov.year) : null;

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
        {series.map((s) => (
          <path key={s.key} d={areaGen(s) ?? ""} fill={color(s.key)} opacity={0.85} />
        ))}
        {areas.map((a, i) => (
          <g key={a} transform={`translate(${width - M.right + 8}, ${M.top + i * 16})`}>
            <rect width={10} height={10} fill={color(a)} />
            <text x={14} y={9} fontSize={10} fill="currentColor">{a.length > 30 ? a.slice(0, 30) + "…" : a}</text>
          </g>
        ))}
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
      {hov && hovData && (() => {
        const pctX = (hov.px / width) * 100;
        return (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
            style={{ left: `${pctX}%`, top: "0%" }}
          >
            <div className="font-bold">{hov.year}</div>
            {areas.filter((a) => (hovData[a] ?? 0) > 0).map((a) => (
              <div key={a} className="flex items-center gap-1">
                <span style={{ display: "inline-block", width: 8, height: 8, background: color(a), borderRadius: 2 }} />
                <span>{a}: {hovData[a].toLocaleString()}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
