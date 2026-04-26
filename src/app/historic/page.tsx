import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { container } from "@/lib/container";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { TotalPerYearChart } from "@/presentation/components/historic/TotalPerYearChart";
import { LevelsAreaChart } from "@/presentation/components/historic/LevelsAreaChart";
import { NetFlowChart } from "@/presentation/components/historic/NetFlowChart";
import { StateSmallMultiples } from "@/presentation/components/historic/StateSmallMultiples";
import { AreasAreaChart } from "@/presentation/components/historic/AreasAreaChart";
import { InstitutionBumpChart } from "@/presentation/components/historic/InstitutionBumpChart";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Histórico SNII · 1984–2026" };
}

// Number of institutions shown in the bump chart legend.
const LEGEND_TOP_N = 10;
// Per-year cutoff used to fetch the raw RPC rows. Wider than LEGEND_TOP_N so
// the "10 most consistent across history" filter has enough material to pick
// from — an institution always at rank ~12 globally still gets considered.
const FETCH_TOP_N = 30;

export default async function HistoricPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const c = container();
  const [years, totals, levels, netFlows, states, areas, institutions] = await Promise.all([
    c.getAvailableYears.execute(),
    c.getTotalsPerYear.execute(),
    c.getLevelsByYear.execute(),
    c.getNetFlowsByYear.execute(),
    c.getStatesByYear.execute(),
    c.getAreasByYear.execute(),
    c.getInstitutionsByYear.execute({ topN: FETCH_TOP_N }),
  ]);

  // Reduce the raw per-year top-N rows to a single legend of the LEGEND_TOP_N
  // institutions with the highest cumulative count across all years, then
  // re-rank within each year over only those institutions.
  const totalsByInst = new Map<string, number>();
  for (const r of institutions) {
    totalsByInst.set(r.institucion, (totalsByInst.get(r.institucion) ?? 0) + r.count);
  }
  const keepInst = new Set(
    Array.from(totalsByInst.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, LEGEND_TOP_N)
      .map(([name]) => name),
  );
  const filtered = institutions.filter((r) => keepInst.has(r.institucion));
  const byYear = new Map<number, typeof filtered>();
  for (const r of filtered) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year)!.push(r);
  }
  const reranked = Array.from(byYear.values()).flatMap((group) => {
    const sorted = [...group].sort((a, b) => b.count - a.count);
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  });

  const latestYear = years.at(-1) ?? 2026;
  const minYear = years[0] ?? 1984;
  const expectedYears = Array.from({ length: latestYear - minYear + 1 }, (_, i) => minYear + i);
  const presentYears = new Set(years);
  const missingYears = expectedYears.filter((y) => !presentYears.has(y));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t.historic.title}</h1>
        <p className="text-sm text-muted-foreground">{t.historic.subtitle}</p>
        <p className="text-xs text-muted-foreground">{t.historic.caveat}</p>
      </header>

      <ChartCard title={t.historic.totals.title} subtitle={t.historic.totals.subtitle}>
        <TotalPerYearChart rows={totals} missingYears={missingYears} />
      </ChartCard>

      <ChartCard title={t.historic.levels.title} subtitle={t.historic.levels.subtitle}>
        <LevelsAreaChart rows={levels} absLabel={t.historic.levels.abs} pctLabel={t.historic.levels.pct} locale={locale} />
      </ChartCard>

      <ChartCard title={t.historic.netFlow.title} subtitle={t.historic.netFlow.subtitle}>
        <NetFlowChart rows={netFlows} />
      </ChartCard>

      <ChartCard title={t.historic.states.title} subtitle={t.historic.states.subtitle}>
        <StateSmallMultiples rows={states} latestYear={latestYear} noPriorDataLabel={t.historic.noPriorData} />
      </ChartCard>

      <ChartCard title={t.historic.areas.title} subtitle={t.historic.areas.subtitle}>
        <AreasAreaChart rows={areas} />
      </ChartCard>

      <ChartCard title={t.historic.institutions.title(LEGEND_TOP_N)} subtitle={t.historic.institutions.subtitle}>
        <InstitutionBumpChart rows={reranked} topN={LEGEND_TOP_N} />
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardHeader className="py-3 border-b">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
