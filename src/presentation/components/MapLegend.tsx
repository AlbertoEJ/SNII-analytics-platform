"use client";
import { useMemo } from "react";
import { interpolateBlues } from "d3-scale-chromatic";

const STEPS = 7;

export function MapLegend({ max, label }: { max: number; label: string }) {
  const stops = useMemo(
    () =>
      Array.from({ length: STEPS }, (_, i) =>
        interpolateBlues(0.15 + (0.85 * i) / (STEPS - 1)),
      ),
    [],
  );

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="tabular-nums">0</span>
      <div className="flex h-2 w-32 rounded-full overflow-hidden">
        {stops.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
      <span className="tabular-nums">{max.toLocaleString()}</span>
    </div>
  );
}
