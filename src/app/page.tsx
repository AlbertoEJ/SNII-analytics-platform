import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { buildMexicoMap } from "@/lib/mexico/buildMap";
import { MapDashboard } from "@/presentation/components/MapDashboard";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";

export const revalidate = 3600;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = getMessages(locale);
  const { snapshotRepo, getStatesByYear, getStatesByYearAndArea, getAvailableYears } = container();

  const availableYears = await getAvailableYears.execute();
  // The map needs entidad data, which only exists from 1990 onward.
  const mapYears = availableYears.filter((y) => y >= 1990);
  const latest = mapYears.at(-1) ?? 2026;
  const yearRaw = typeof sp.year === "string" ? Number.parseInt(sp.year, 10) : Number.NaN;
  const initialYear = Number.isFinite(yearRaw) && mapYears.includes(yearRaw) ? yearRaw : latest;
  const initialArea = typeof sp.area === "string" && sp.area.trim() ? sp.area : undefined;

  // One-shot prefetch: full historical state counts (with and without area filter)
  // plus the area list per year. Animating Reproducir is then 100% local — no
  // navigation, no server round-trip, no flicker.
  const [statesByYear, statesByYearArea, areasByYear, mapData] = await Promise.all([
    getStatesByYear.execute(),
    getStatesByYearAndArea.execute(),
    snapshotRepo.areasByYear(),
    buildMexicoMap(),
  ]);

  // Filter to map years (>=1990) and project to plain rows for the client.
  const totalsByYearState = statesByYear
    .filter((r) => r.year >= 1990)
    .map((r) => ({ year: r.year, entidad: r.entidad, count: r.count }));
  const byYearStateArea = statesByYearArea.map((r) => ({
    year: r.year, entidad: r.entidad, area: r.area, count: r.count,
  }));
  const areasByYearProjection = areasByYear
    .filter((r) => r.year >= 1990)
    .map((r) => ({ year: r.year, area: r.area }));

  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.map.title}</h1>
        <p className="text-sm text-muted-foreground">{t.map.subtitle}</p>
      </header>

      <MapDashboard
        totalsByYearState={totalsByYearState}
        byYearStateArea={byYearStateArea}
        areasByYear={areasByYearProjection}
        mapData={mapData}
        dbToDisplay={dbToDisplay}
        initialYear={initialYear}
        initialArea={initialArea}
        locale={locale}
        strings={{
          total: t.map.total,
          states: t.map.states,
          legend: t.map.legend,
          filterArea: t.map.filterArea,
          allAreas: t.map.allAreas,
          reset: t.map.reset,
          showingAreaPrefix: locale === "es" ? "Mostrando:" : "Showing:",
          yearLabel: t.slider.label,
          play: t.slider.play,
          pause: t.slider.pause,
          speedLabel: t.slider.speedLabel,
          topStates: t.map.topStates,
          preDataNote: t.slider.preDataNote,
          historicTitle: t.historic.title,
        }}
      />
    </div>
  );
}
