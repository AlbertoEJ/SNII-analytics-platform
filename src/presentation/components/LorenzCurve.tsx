"use client";
import { useMemo } from "react";

interface Item {
  label: string;
  count: number;
}

interface Props {
  items: Item[];
  width?: number;
  height?: number;
  label?: string;
  axisX?: string;
  axisY?: string;
}

/**
 * Lorenz curve visualizing inequality. The closer the curve hugs the diagonal,
 * the more equal the distribution. The Gini coefficient is 2× the area between
 * the diagonal and the curve.
 */
export function LorenzCurve({
  items,
  width = 220,
  height = 160,
  label,
  axisX = "% acumulado de entidades",
  axisY = "% acumulado del padrón",
}: Props) {
  const { points, gini, dPath, areaPath } = useMemo(() => {
    if (items.length === 0) {
      return { points: [], gini: 0, dPath: "", areaPath: "" };
    }
    const sorted = [...items].sort((a, b) => a.count - b.count);
    const total = sorted.reduce((s, i) => s + i.count, 0);
    const n = sorted.length;
    let cum = 0;
    const pts: Array<[number, number]> = [[0, 0]];
    for (let i = 0; i < n; i++) {
      cum += sorted[i].count;
      pts.push([(i + 1) / n, total > 0 ? cum / total : 0]);
    }
    // Gini via trapezoidal area under curve
    let area = 0;
    for (let i = 1; i < pts.length; i++) {
      area += ((pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1])) / 2;
    }
    const giniValue = 1 - 2 * area;

    const dPath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${(p[0] * width).toFixed(2)} ${(height - p[1] * height).toFixed(2)}`)
      .join(" ");
    const areaPath =
      `${dPath} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`;
    return { points: pts, gini: giniValue, dPath, areaPath };
  }, [items, width, height]);

  if (points.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label ?? "Curva de Lorenz"}
        </span>
        <span className="text-xs">
          Gini ={" "}
          <span className="tabular-nums font-semibold">{gini.toFixed(3)}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`${label ?? "Lorenz"} (Gini ${gini.toFixed(3)})`}
      >
        {/* Frame */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          className="stroke-border"
          strokeWidth={1}
        />
        {/* Equality diagonal */}
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={0}
          className="stroke-muted-foreground"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.5}
        />
        {/* Filled area under curve */}
        <path d={areaPath} className="fill-foreground" opacity={0.08} />
        {/* Curve */}
        <path
          d={dPath}
          fill="none"
          className="stroke-foreground"
          strokeWidth={1.75}
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>{axisX}</span>
        <span className="text-right">{axisY}</span>
      </div>
    </div>
  );
}
