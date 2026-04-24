import { ConcentrationLine } from "./ConcentrationLine";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { DisciplineTreemap } from "@/presentation/components/DisciplineTreemap";
import type { AreaDisciplineRow, InstitutionCount } from "@/domain/repositories/ResearcherRepository";
import type { Locale } from "@/presentation/i18n/messages";

interface Strings {
  areaTitle: string;
  treemapTitle: string;
  treemapSubtitle: string;
  treemapRootLabel: string;
  treemapBackLabel: string;
  treemapResearchersLabel: string;
  institutionTitle: string;
  institutionConcentration: string; // pre-rendered
}

interface Props {
  total: number;
  areaRows: AreaDisciplineRow[];
  institutions: InstitutionCount[];
  locale: Locale;
  strings: Strings;
}

export function FieldPane({ total, areaRows, institutions, locale, strings }: Props) {
  // Area totals (sum across disciplines).
  const areaTotals = new Map<string, number>();
  for (const row of areaRows) {
    areaTotals.set(row.area, (areaTotals.get(row.area) ?? 0) + row.count);
  }
  const areaRanking: RankedRow[] = Array.from(areaTotals.entries())
    .map(([label, count]) => ({ label, count, id: `area-${label}` }))
    .sort((a, b) => b.count - a.count);

  const institutionRanking: RankedRow[] = institutions.map((i) => ({
    label: i.institucion,
    count: i.count,
    id: `inst-${i.institucion}`,
  }));

  return (
    <div id="field" className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-base font-semibold">{strings.areaTitle}</h3>
        <IntensityBarList rows={areaRanking} total={total} mode="intensity" palette="area" locale={locale} />
      </section>

      <DisciplineTreemap
        rows={areaRows}
        title={strings.treemapTitle}
        subtitle={strings.treemapSubtitle}
        rootLabel={strings.treemapRootLabel}
        backLabel={strings.treemapBackLabel}
        researchersLabel={strings.treemapResearchersLabel}
        locale={locale}
      />

      <section className="space-y-2">
        <h3 className="text-base font-semibold">{strings.institutionTitle}</h3>
        <ConcentrationLine text={strings.institutionConcentration} />
        <IntensityBarList rows={institutionRanking} total={total} mode="intensity" palette="institution" locale={locale} />
      </section>
    </div>
  );
}
