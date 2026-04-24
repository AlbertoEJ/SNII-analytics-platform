import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVEL_LABELS, isValidSniiLevel } from "@/domain/value-objects/SniiLevel";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisTabs } from "@/presentation/components/AnalysisTabs";

export const revalidate = 3600;

export default async function StatsPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const { getStats, getAnalysis } = container();

  const [stats, stateLevel, areaBreakdown, institutions] = await Promise.all([
    getStats.execute(),
    getAnalysis.crossStateLevel(),
    getAnalysis.areaDisciplineBreakdown(),
    getAnalysis.countsByInstitution(),
  ]);

  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  const overview = {
    nivel: stats.byNivel.map((n) => ({
      label: isValidSniiLevel(n.value) ? SNII_LEVEL_LABELS[n.value][locale] : n.value,
      count: n.count,
    })),
    area: stats.byArea.map((a) => ({ label: a.value, count: a.count })),
    entidad: stats.byEntidad.map((e) => ({
      label: dbToDisplay[e.value] ?? e.value,
      count: e.count,
    })),
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.stats.title}</h1>
        <p className="text-sm text-muted-foreground">{t.stats.subtitle}</p>
      </header>

      <Card className="py-0">
        <CardContent className="p-5 flex items-baseline gap-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t.stats.total}
          </span>
          <span className="text-3xl font-semibold tabular-nums">
            {stats.total.toLocaleString()}
          </span>
        </CardContent>
      </Card>

      <AnalysisTabs
        total={stats.total}
        overview={overview}
        stateLevel={stateLevel}
        areaBreakdown={areaBreakdown}
        institutions={institutions}
        dbToDisplay={dbToDisplay}
        strings={{
          tabs: t.stats.tabs,
          byLevel: t.stats.byLevel,
          byArea: t.stats.byArea,
          byState: t.stats.byState,
          overview: {
            largest: t.stats.largest,
            smallest: t.stats.smallest,
            median: t.stats.median,
            categories: t.stats.categories,
          },
          heatmap: t.stats.heatmap,
          disciplines: t.stats.disciplines,
          concentration: t.stats.concentration,
        }}
      />
    </div>
  );
}
