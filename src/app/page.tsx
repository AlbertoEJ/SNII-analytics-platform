import Link from "next/link";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { buildMexicoMap } from "@/lib/mexico/buildMap";
import { MexicoMap } from "@/presentation/components/MexicoMap";
import { MapLegend } from "@/presentation/components/MapLegend";
import { AreaPills } from "@/presentation/components/AreaPills";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

const CARD_HEIGHT = "lg:h-[640px]";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawArea = typeof sp.area === "string" && sp.area.trim() ? sp.area : undefined;

  const locale = await getLocale();
  const t = getMessages(locale);
  const { getCountsByState, getAnalysis, getStats, repo } = container();
  const [areas, mapData, stateLevel, stats] = await Promise.all([
    repo.distinctValues("area_conocimiento"),
    buildMexicoMap(),
    getAnalysis.crossStateLevel(),
    getStats.execute(),
  ]);
  const area = rawArea && areas.includes(rawArea) ? rawArea : undefined;
  const stateCounts = await getCountsByState.execute({ area });

  // Per-state level breakdown (always shows totals across all areas — used for
  // the map's hover tooltip; an area filter changes the choropleth color but
  // the breakdown panel stays informative about the underlying composition).
  const breakdowns: Record<string, { c: number; n1: number; n2: number; n3: number; e: number }> = {};
  for (const r of stateLevel) {
    breakdowns[r.entidad] = { c: r.c, n1: r.n1, n2: r.n2, n3: r.n3, e: r.e };
  }

  const counts: Record<string, number> = {};
  let total = 0;
  let max = 0;
  for (const s of stateCounts) {
    counts[s.entidad] = s.count;
    total += s.count;
    if (s.count > max) max = s.count;
  }

  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  const linkFor = (entidad: string) => {
    const params = new URLSearchParams({ entidad });
    if (area) params.set("area", area);
    return `/researchers?${params.toString()}`;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.map.title}</h1>
        <p className="text-sm text-muted-foreground">{t.map.subtitle}</p>
      </header>

      {/* Filter section as a card */}
      <Card className="py-3">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.map.filterArea}
            </span>
            {area && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                className="h-7 px-2 text-xs"
                render={<Link href="/">{t.map.reset}</Link>}
              />
            )}
          </div>
          <AreaPills areas={areas} active={area} allLabel={t.map.allAreas} />
          {area && (
            <Badge variant="secondary" className="self-start">
              {t.map.showingArea(area)}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Map + ranking, equal height */}
      <div className={`grid gap-4 lg:grid-cols-[1fr_320px] ${CARD_HEIGHT}`}>
        {/* Map card */}
        <Card className="flex flex-col gap-0 py-0 overflow-hidden">
          <CardHeader className="py-3 border-b flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t.map.total}
                </span>
                <span className="text-xl font-semibold tabular-nums">
                  {total.toLocaleString(locale === "es" ? "es-MX" : "en-US")}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {stateCounts.length} {t.map.states}
                </span>
              </div>
              {!area && stats.total > total && (
                <span className="text-[11px] text-muted-foreground">
                  {t.map.coverageNote(
                    total.toLocaleString(locale === "es" ? "es-MX" : "en-US"),
                    stats.total.toLocaleString(locale === "es" ? "es-MX" : "en-US"),
                  )}
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <MapLegend max={max} label={t.map.legend} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-3 sm:p-4">
            <MexicoMap
              width={mapData.width}
              height={mapData.height}
              shapes={mapData.shapes}
              counts={counts}
              breakdowns={breakdowns}
              area={area}
            />
          </CardContent>
          <div className="px-4 pb-3 text-xs text-muted-foreground sm:hidden">
            {t.map.hint}
          </div>
        </Card>

        {/* Ranking card */}
        <Card className="flex flex-col gap-0 py-0 overflow-hidden">
          <CardHeader className="py-3 border-b">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.map.topStates}
            </span>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full">
              <ol className="py-2">
                {stateCounts.map((s, i) => {
                  const display = dbToDisplay[s.entidad] ?? s.entidad;
                  const pct = total > 0 ? (s.count / total) * 100 : 0;
                  const barPct = max > 0 ? (s.count / max) * 100 : 0;
                  return (
                    <li key={s.entidad}>
                      <Link
                        href={linkFor(s.entidad)}
                        className="group block px-4 py-2 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-[10px] tabular-nums text-muted-foreground w-4 text-right shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm truncate">{display}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium tabular-nums">
                              {s.count.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="ml-6 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-foreground/70 group-hover:bg-foreground transition-colors"
                            style={{ width: `${barPct}%` }}
                          />
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
    </div>
  );
}
