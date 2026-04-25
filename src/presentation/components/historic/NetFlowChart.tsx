"use client";
import { useMemo, useState } from "react";
import { scaleBand, scaleLinear } from "d3-scale";

interface Props {
  rows: { year: number; entrants: number; departures: number }[];
  width?: number;
  height?: number;
}

const M = { top: 16, right: 16, bottom: 28, left: 56 };

export function NetFlowChart({ rows, width = 800, height = 280 }: Props) {
  const [hov, setHov] = useState<{ year: number; px: number } | null>(null);

  const data = useMemo(() => [...rows].sort((a, b) => a.year - b.year), [rows]);
  const x = scaleBand<number>()
    .domain(data.map((d) => d.year))
    .range([M.left, width - M.right])
    .padding(0.15);
  const ymax = Math.max(1, ...data.map((d) => Math.max(d.entrants, d.departures)));
  const y = scaleLinear().domain([-ymax, ymax]).nice().range([height - M.bottom, M.top]);
  const ticksY = [y.invert(M.top), 0, y.invert(height - M.bottom)].map((t) => Math.round(t / 100) * 100);

  const lookup = useMemo(() => {
    const m = new Map<number, { entrants: number; departures: number }>();
    for (const d of data) m.set(d.year, { entrants: d.entrants, departures: d.departures });
    return m;
  }, [data]);

  const years = data.map((d) => d.year);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * width;
    // snap to nearest band year
    const snapped = years.reduce((best, yr) => {
      const cx = (x(yr) ?? 0) + x.bandwidth() / 2;
      const bcx = (x(best) ?? 0) + x.bandwidth() / 2;
      return Math.abs(cx - vbX) < Math.abs(bcx - vbX) ? yr : best;
    }, years[0] ?? 0);
    const px = (x(snapped) ?? 0) + x.bandwidth() / 2;
    setHov({ year: snapped, px });
  }

  const hovData = hov ? lookup.get(hov.year) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHov(null)}
      >
        <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.2} />
        {ticksY.map((t) => (
          <text key={t} x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
            {Math.abs(t).toLocaleString()}
          </text>
        ))}
        {data.map((d) => {
          const xb = x(d.year)!;
          return (
            <g key={d.year}>
              <rect x={xb} y={y(d.entrants)} width={x.bandwidth()} height={y(0) - y(d.entrants)} fill="#10b981">
                <title>{`${d.year} · +${d.entrants.toLocaleString()}`}</title>
              </rect>
              <rect x={xb} y={y(0)} width={x.bandwidth()} height={y(-d.departures) - y(0)} fill="#f43f5e">
                <title>{`${d.year} · -${d.departures.toLocaleString()}`}</title>
              </rect>
            </g>
          );
        })}
        {[1984, 1990, 2000, 2010, 2020, 2026].filter((t) => x(t) != null).map((t) => (
          <text key={t} x={(x(t) ?? 0) + x.bandwidth() / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
            {t}
          </text>
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
            <div style={{ color: "#10b981" }}>↑ +{hovData.entrants.toLocaleString()}</div>
            <div style={{ color: "#f43f5e" }}>↓ −{hovData.departures.toLocaleString()}</div>
          </div>
        );
      })()}
    </div>
  );
}
