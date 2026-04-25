"use client";
import { useMemo } from "react";
import { scaleBand, scaleLinear } from "d3-scale";

interface Props {
  rows: { year: number; entrants: number; departures: number }[];
  width?: number;
  height?: number;
}

const M = { top: 16, right: 16, bottom: 28, left: 56 };

export function NetFlowChart({ rows, width = 800, height = 280 }: Props) {
  const data = useMemo(() => [...rows].sort((a, b) => a.year - b.year), [rows]);
  const x = scaleBand<number>()
    .domain(data.map((d) => d.year))
    .range([M.left, width - M.right])
    .padding(0.15);
  const ymax = Math.max(1, ...data.map((d) => Math.max(d.entrants, d.departures)));
  const y = scaleLinear().domain([-ymax, ymax]).nice().range([height - M.bottom, M.top]);
  const ticksY = [y.invert(M.top), 0, y.invert(height - M.bottom)].map((t) => Math.round(t / 100) * 100);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
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
    </svg>
  );
}
