"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { scaleQuantize } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import type { StateShape } from "@/lib/mexico/types";

interface Props {
  width: number;
  height: number;
  shapes: StateShape[];
  counts: Record<string, number>;
  hint: string;
  area?: string;
}

const STEPS = 7;

export function MexicoMap({ width, height, shapes, counts, hint, area }: Props) {
  const router = useRouter();
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    name: string;
    count: number;
  } | null>(null);

  const colorFor = useMemo(() => {
    const max = Math.max(...Object.values(counts), 1);
    const range = Array.from({ length: STEPS }, (_, i) =>
      interpolateBlues(0.15 + (0.85 * i) / (STEPS - 1)),
    );
    const scale = scaleQuantize<string>().domain([0, max]).range(range);
    return (n: number) => (n > 0 ? scale(n) : "#f4f4f5");
  }, [counts]);

  const open = (dbName: string) => {
    const params = new URLSearchParams({ entidad: dbName });
    if (area) params.set("area", area);
    router.push(`/researchers?${params.toString()}`);
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Mapa de México por número de investigadores"
        className="w-full h-auto block"
      >
        <g>
          {shapes.map((s) => {
            const n = counts[s.dbName] ?? 0;
            return (
              <path
                key={s.code}
                d={s.path}
                fill={colorFor(n)}
                stroke="#52525b"
                strokeWidth={0.5}
                className="cursor-pointer transition-[stroke-width] hover:stroke-zinc-900 dark:hover:stroke-white"
                style={{ transformOrigin: "center" }}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement!).getBoundingClientRect();
                  setHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    name: s.displayName,
                    count: n,
                  });
                }}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement!).getBoundingClientRect();
                  setHover((h) =>
                    h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h,
                  );
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => open(s.dbName)}
              >
                <title>{`${s.displayName}: ${n.toLocaleString()}`}</title>
              </path>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 px-2 py-1 rounded bg-zinc-900 text-white text-xs shadow-lg whitespace-nowrap"
          style={{
            left: hover.x + 12,
            top: hover.y + 12,
          }}
        >
          <div className="font-medium">{hover.name}</div>
          <div className="tabular-nums opacity-80">{hover.count.toLocaleString()}</div>
        </div>
      )}

      <p className="mt-2 text-center text-xs text-zinc-500">{hint}</p>
    </div>
  );
}
