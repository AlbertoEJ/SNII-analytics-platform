"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MexicoMap } from "@/presentation/components/MexicoMap";
import { MapLegend } from "@/presentation/components/MapLegend";
import { AreaPills } from "@/presentation/components/AreaPills";
import type { BuiltMap } from "@/lib/mexico/types";
import type { Locale } from "@/presentation/i18n/messages";

interface Strings {
  total: string;
  states: string;
  legend: string;
  filterArea: string;
  allAreas: string;
  reset: string;
  /** Localized prefix for the active-area badge, e.g. "Mostrando:" / "Showing:". */
  showingAreaPrefix: string;
  yearLabel: string;
  play: string;
  pause: string;
  speedLabel: string;
  topStates: string;
  preDataNote: string;
  historicTitle: string;
}

interface Props {
  /** State counts by (year, entidad) — totals per state per year, no area filter. */
  totalsByYearState: { year: number; entidad: string; count: number }[];
  /** State counts by (year, entidad, area) — used when an area filter is active. */
  byYearStateArea: { year: number; entidad: string; area: string; count: number }[];
  /** Areas active per year (year → sorted area list). */
  areasByYear: { year: number; area: string }[];
  mapData: BuiltMap;
  dbToDisplay: Record<string, string>;
  initialYear: number;
  initialArea?: string;
  locale: Locale;
  strings: Strings;
}

const SPEEDS = [1, 2, 4] as const;

export function MapDashboard({
  totalsByYearState,
  byYearStateArea,
  areasByYear,
  mapData,
  dbToDisplay,
  initialYear,
  initialArea,
  locale,
  strings,
}: Props) {
  // Year list derived from the totals — same as availableYears >= 1990.
  const years = useMemo(() => {
    return Array.from(new Set(totalsByYearState.map((r) => r.year))).sort((a, b) => a - b);
  }, [totalsByYearState]);
  const minYear = years[0] ?? 1990;
  const maxYear = years.at(-1) ?? 2026;
  const yearSet = useMemo(() => new Set(years), [years]);

  // Map<year, Map<area, count>> — used to get the area list per year.
  const areasByYearMap = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const r of areasByYear) {
      if (!m.has(r.year)) m.set(r.year, []);
      m.get(r.year)!.push(r.area);
    }
    for (const list of m.values()) list.sort();
    return m;
  }, [areasByYear]);

  // Map<year, Map<entidad, count>> — for the unfiltered case.
  const totalsLookup = useMemo(() => {
    const m = new Map<number, Map<string, number>>();
    for (const r of totalsByYearState) {
      if (!m.has(r.year)) m.set(r.year, new Map());
      m.get(r.year)!.set(r.entidad, r.count);
    }
    return m;
  }, [totalsByYearState]);

  // Map<year, Map<area, Map<entidad, count>>> — for the area-filter case.
  const byAreaLookup = useMemo(() => {
    const m = new Map<number, Map<string, Map<string, number>>>();
    for (const r of byYearStateArea) {
      if (!m.has(r.year)) m.set(r.year, new Map());
      const yMap = m.get(r.year)!;
      if (!yMap.has(r.area)) yMap.set(r.area, new Map());
      yMap.get(r.area)!.set(r.entidad, r.count);
    }
    return m;
  }, [byYearStateArea]);

  const [year, setYear] = useState(initialYear);
  const [area, setArea] = useState<string | undefined>(initialArea);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<typeof SPEEDS[number]>(1);

  // Reflect year + area in the URL via replaceState (no navigation, no re-render of server tree).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (year !== maxYear) params.set("year", String(year));
    if (area) params.set("area", area);
    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    history.replaceState(null, "", next);
  }, [year, area, maxYear]);

  // Available areas for the current year.
  const areasThisYear = areasByYearMap.get(year) ?? [];
  const effectiveArea = area && areasThisYear.includes(area) ? area : undefined;

  // Counts for the current (year, area) selection — entidad → count.
  const counts: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    if (effectiveArea) {
      const yMap = byAreaLookup.get(year)?.get(effectiveArea);
      if (yMap) for (const [ent, c] of yMap) out[ent] = c;
    } else {
      const yMap = totalsLookup.get(year);
      if (yMap) for (const [ent, c] of yMap) out[ent] = c;
    }
    return out;
  }, [year, effectiveArea, totalsLookup, byAreaLookup]);

  const { total, max, ranked } = useMemo(() => {
    let t = 0;
    let mx = 0;
    const list = Object.entries(counts).map(([entidad, count]) => {
      t += count;
      if (count > mx) mx = count;
      return { entidad, count };
    });
    list.sort((a, b) => b.count - a.count);
    return { total: t, max: mx, ranked: list };
  }, [counts]);

  // Play loop.
  const yearRef = useRef(year);
  useEffect(() => { yearRef.current = year; }, [year]);
  useEffect(() => {
    if (!playing) return;
    const period = 1500 / speed;
    const id = setInterval(() => {
      const cur = yearRef.current;
      let next = cur + 1;
      while (next <= maxYear && !yearSet.has(next)) next++;
      if (next > maxYear) {
        setPlaying(false);
        return;
      }
      setYear(next);
    }, period);
    return () => clearInterval(id);
  }, [playing, speed, maxYear, yearSet]);

  const linkFor = (entidad: string) => {
    const params = new URLSearchParams({ entidad, year: String(year) });
    if (effectiveArea) params.set("area", effectiveArea);
    return `/researchers?${params.toString()}`;
  };

  const handleAreaSelect = (next: string | undefined) => {
    setArea(next);
  };

  return (
    <div className="space-y-6">
      {/* Year slider + play controls */}
      <Card className="py-3">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{strings.yearLabel}</span>
            <span className="text-lg font-semibold tabular-nums">{year}</span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={playing ? "default" : "outline"}
                onClick={() => {
                  // If we're at (or past) the last year, rewind to the first year so Play
                  // restarts the animation instead of being a no-op.
                  if (!playing && year >= maxYear) setYear(minYear);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? strings.pause : strings.play}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{strings.speedLabel}</span>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-0.5 rounded ${speed === s ? "bg-foreground text-background" : "bg-muted"}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Slider
            value={[year]}
            min={minYear}
            max={maxYear}
            step={1}
            onValueChange={(v) => {
              const arr = (Array.isArray(v) ? v : [v]) as number[];
              const y = arr[0];
              if (!Number.isFinite(y)) return;
              let snap = y;
              if (!yearSet.has(y)) {
                let down = y, up = y;
                while (down >= minYear && !yearSet.has(down)) down--;
                while (up <= maxYear && !yearSet.has(up)) up++;
                const dv = yearSet.has(down);
                const uv = yearSet.has(up);
                if (dv && uv) snap = (y - down <= up - y) ? down : up;
                else if (dv) snap = down;
                else if (uv) snap = up;
                else return;
              }
              setYear(snap);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                let n = year - 1; while (n >= minYear && !yearSet.has(n)) n--;
                if (n >= minYear) setYear(n);
              } else if (e.key === "ArrowRight") {
                let n = year + 1; while (n <= maxYear && !yearSet.has(n)) n++;
                if (n <= maxYear) setYear(n);
              }
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            {[1990, 2000, 2010, 2020, maxYear].filter((t, i, a) => a.indexOf(t) === i && t >= minYear && t <= maxYear).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Area filter */}
      <Card className="py-3">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{strings.filterArea}</span>
            {effectiveArea && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleAreaSelect(undefined)}
              >
                {strings.reset}
              </Button>
            )}
          </div>
          <AreaPills
            areas={areasThisYear}
            active={effectiveArea}
            allLabel={strings.allAreas}
            onSelect={handleAreaSelect}
          />
          {effectiveArea && (
            <Badge variant="secondary" className="self-start">
              {strings.showingAreaPrefix} {effectiveArea}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Map + ranking */}
      {ranked.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {strings.preDataNote}{" "}
            <Link href="/historic" className="underline">{strings.historicTitle}</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:h-[640px]">
          <Card className="flex flex-col gap-0 py-0 overflow-hidden">
            <CardHeader className="py-3 border-b flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{strings.total}</span>
                  <span className="text-xl font-semibold tabular-nums">
                    {total.toLocaleString(locale === "es" ? "es-MX" : "en-US")}
                  </span>
                  <span className="text-xs text-muted-foreground">· {ranked.length} {strings.states}</span>
                </div>
              </div>
              <div className="hidden sm:block"><MapLegend max={max} label={strings.legend} /></div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-3 sm:p-4">
              <MexicoMap width={mapData.width} height={mapData.height} shapes={mapData.shapes}
                         counts={counts} breakdowns={{}} area={effectiveArea} />
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 py-0 overflow-hidden">
            <CardHeader className="py-3 border-b">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{strings.topStates}</span>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full">
                <ol className="py-2 pb-6">
                  {ranked.map((s, i) => {
                    const display = dbToDisplay[s.entidad] ?? s.entidad;
                    const pct = total > 0 ? (s.count / total) * 100 : 0;
                    const barPct = max > 0 ? (s.count / max) * 100 : 0;
                    return (
                      <li key={s.entidad}>
                        <Link href={linkFor(s.entidad)}
                              className="group block px-4 py-2 hover:bg-muted/60 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[10px] tabular-nums text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                              <span className="text-sm truncate">{display}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-medium tabular-nums">{s.count.toLocaleString()}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="ml-6 h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-foreground/70 group-hover:bg-foreground transition-colors" style={{ width: `${barPct}%` }} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
