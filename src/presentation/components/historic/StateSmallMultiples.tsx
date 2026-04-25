import Link from "next/link";
import { scaleLinear } from "d3-scale";
import { line as d3Line, curveMonotoneX } from "d3-shape";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";

interface Props {
  rows: { year: number; entidad: string; count: number }[];
  latestYear: number;
  noPriorDataLabel: string;
}

export function StateSmallMultiples({ rows, latestYear, noPriorDataLabel }: Props) {
  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  // Group rows by entidad.
  const byState = new Map<string, { year: number; count: number }[]>();
  for (const r of rows) {
    if (!byState.has(r.entidad)) byState.set(r.entidad, []);
    byState.get(r.entidad)!.push({ year: r.year, count: r.count });
  }

  // Pick latest-year totals for sort.
  const totals = new Map<string, number>();
  for (const [s, list] of byState) {
    const latest = list.find((d) => d.year === latestYear)?.count ?? 0;
    totals.set(s, latest);
  }
  const sorted = Array.from(byState.keys()).sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));

  const allYears: number[] = (() => {
    let mn = Infinity, mx = -Infinity;
    for (const list of byState.values()) for (const d of list) { mn = Math.min(mn, d.year); mx = Math.max(mx, d.year); }
    return Array.from({ length: mx - mn + 1 }, (_, i) => mn + i);
  })();

  const allMax = Math.max(1, ...Array.from(byState.values()).flatMap((list) => list.map((d) => d.count)));
  const W = 200, H = 60, M = { top: 6, right: 6, bottom: 6, left: 6 };
  const x = scaleLinear().domain([allYears[0], allYears.at(-1)!]).range([M.left, W - M.right]);
  const y = scaleLinear().domain([0, allMax]).range([H - M.bottom, M.top]);
  const lineGen = d3Line<{ year: number; count: number }>().x((d) => x(d.year)).y((d) => y(d.count)).curve(curveMonotoneX);

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {sorted.map((entidad) => {
        const display = dbToDisplay[entidad] ?? entidad;
        const list = byState.get(entidad)!.sort((a, b) => a.year - b.year);
        const latest = list.find((d) => d.year === latestYear)?.count ?? 0;
        const params = new URLSearchParams({ entidad, year: String(latestYear) });
        return (
          <Link key={entidad} href={`/researchers?${params.toString()}`}
                className="group rounded-md border p-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs font-medium truncate">{display}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{latest.toLocaleString()}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
              {list.length === 0 ? (
                <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
                  {noPriorDataLabel}
                </text>
              ) : (
                <path d={lineGen(list) ?? ""} fill="none" stroke="currentColor" strokeWidth={1} />
              )}
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
