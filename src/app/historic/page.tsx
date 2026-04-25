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

const TOP_N = 15;

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
    c.getInstitutionsByYear.execute({ topN: TOP_N }),
  ]);

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

      <ChartCard title={t.historic.institutions.title} subtitle={t.historic.institutions.subtitle}>
        <InstitutionBumpChart rows={institutions} topN={TOP_N} />
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
