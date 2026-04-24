"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { scaleQuantize } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import type { StateShape } from "@/lib/mexico/types";
import { SNII_LEVELS, SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";

export interface StateLevelBreakdown {
  c: number;
  n1: number;
  n2: number;
  n3: number;
  e: number;
}

interface Props {
  width: number;
  height: number;
  shapes: StateShape[];
  counts: Record<string, number>;
  /** Optional per-state level breakdown for mini-bars in the tooltip. */
  breakdowns?: Record<string, StateLevelBreakdown>;
  area?: string;
}

const STEPS = 7;

export function MexicoMap({ width, height, shapes, counts, breakdowns, area }: Props) {
  const router = useRouter();
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    name: string;
    count: number;
    dbName: string;
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
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mapa de México por número de investigadores"
        className="w-full h-full max-h-full block"
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
                    dbName: s.dbName,
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
          className="pointer-events-none absolute z-10 rounded-lg bg-popover text-popover-foreground text-xs shadow-lg ring-1 ring-border min-w-[180px]"
          style={{
            left: Math.min(hover.x + 12, width - 200),
            top: hover.y + 12,
          }}
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="font-medium">{hover.name}</div>
            <div className="text-muted-foreground tabular-nums mt-0.5">
              {hover.count.toLocaleString()}
            </div>
          </div>
          {breakdowns?.[hover.dbName] && (
            <MiniLevels breakdown={breakdowns[hover.dbName]} />
          )}
        </div>
      )}

    </div>
  );
}

function MiniLevels({ breakdown }: { breakdown: StateLevelBreakdown }) {
  const entries: Array<{ code: SniiLevelCode; count: number }> = SNII_LEVELS.map((code) => ({
    code,
    count:
      code === "C"
        ? breakdown.c
        : code === "1"
          ? breakdown.n1
          : code === "2"
            ? breakdown.n2
            : code === "3"
              ? breakdown.n3
              : breakdown.e,
  }));
  const max = Math.max(...entries.map((e) => e.count), 1);
  return (
    <ul className="px-3 py-2 space-y-1">
      {entries.map(({ code, count }) => (
        <li key={code} className="flex items-center gap-2">
          <span className="w-6 text-[10px] text-muted-foreground">
            {SNII_LEVEL_LABELS[code].es.replace("Nivel ", "N").replace("Candidato/a", "C").replace("Emérito/a", "E")}
          </span>
          <div className="relative flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(count / max) * 100}%`,
                background: SNII_LEVEL_COLORS[code],
              }}
            />
          </div>
          <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">
            {count.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
