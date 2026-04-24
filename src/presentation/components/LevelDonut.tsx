"use client";
import { useMemo } from "react";
import { arc, pie } from "d3-shape";

interface Slice {
  label: string;
  count: number;
  color: string;
}

interface Props {
  total: number;
  slices: Slice[];
  width?: number;
  height?: number;
  centerLabel?: string;
  ariaLabel?: string;
  locale?: string;
}

export function LevelDonut({
  total,
  slices,
  width = 220,
  height = 220,
  centerLabel,
  ariaLabel,
  locale,
}: Props) {
  const radius = Math.min(width, height) / 2;
  const inner = radius * 0.6;

  const arcs = useMemo(() => {
    const generator = pie<Slice>()
      .value((d) => d.count)
      .sort(null);
    const a = arc<ReturnType<typeof generator>[number]>()
      .innerRadius(inner)
      .outerRadius(radius)
      .padAngle(0.01)
      .cornerRadius(3);
    return generator(slices).map((p) => ({
      slice: p.data,
      d: a(p) ?? "",
    }));
  }, [slices, inner, radius]);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
        className="block"
        style={{ width, height }}
        role="img"
        aria-label={ariaLabel}
      >
        <g>
          {arcs.map(({ slice, d }) => (
            <path key={slice.label} d={d} fill={slice.color}>
              <title>{`${slice.label}: ${slice.count.toLocaleString(locale)} (${((slice.count / total) * 100).toFixed(1)}%)`}</title>
            </path>
          ))}
        </g>
        {centerLabel && (
          <g>
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={-6}
              fontSize="22"
              fontWeight={600}
              fill="currentColor"
              className="tabular-nums"
            >
              {total.toLocaleString(locale)}
            </text>
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={14}
              fontSize="10"
              fill="currentColor"
              className="text-muted-foreground uppercase tracking-wider"
              opacity={0.6}
            >
              {centerLabel}
            </text>
          </g>
        )}
      </svg>
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="tabular-nums font-medium">
              {((s.count / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
