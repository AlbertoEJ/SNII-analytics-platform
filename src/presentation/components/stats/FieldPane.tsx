import { ConcentrationLine } from "./ConcentrationLine";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { DisciplineTreemap } from "@/presentation/components/DisciplineTreemap";
import type { AreaDisciplineRow, InstitutionCount } from "@/domain/repositories/ResearcherRepository";

interface Strings {
  areaTitle: string;
  treemapTitle: string;
  treemapSubtitle: string;
  institutionTitle: string;
  institutionConcentration: string; // pre-rendered
}

interface Props {
  total: number;
  areaRows: AreaDisciplineRow[];
  institutions: InstitutionCount[];
  strings: Strings;
}

export function FieldPane({ total, areaRows, institutions, strings }: Props) {
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
        <h3 className="text-sm font-semibold">{strings.areaTitle}</h3>
        <IntensityBarList rows={areaRanking} total={total} mode="intensity" palette="area" />
      </section>

      <DisciplineTreemap rows={areaRows} title={strings.treemapTitle} subtitle={strings.treemapSubtitle} />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.institutionTitle}</h3>
        <ConcentrationLine text={strings.institutionConcentration} />
        <IntensityBarList rows={institutionRanking} total={total} mode="intensity" palette="institution" />
      </section>
    </div>
  );
}
