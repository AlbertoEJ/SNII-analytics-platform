import { ConcentrationLine } from "./ConcentrationLine";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { StateLevelSmallMultiples } from "./StateLevelSmallMultiples";
import type { StateLevelRow } from "@/domain/repositories/ResearcherRepository";
import type { Locale } from "@/presentation/i18n/messages";

interface Strings {
  rankingTitle: string;
  smallMultiples: { title: string; subtitle: string };
  concentrationLine: string; // pre-rendered
}

interface Props {
  total: number;
  stateRows: StateLevelRow[];
  dbToDisplay: Record<string, string>;
  locale: Locale;
  strings: Strings;
}

export function PlacePane({ total, stateRows, dbToDisplay, locale, strings }: Props) {
  const ranking: RankedRow[] = [...stateRows]
    .sort((a, b) => b.total - a.total)
    .map((r) => ({
      label: dbToDisplay[r.entidad] ?? r.entidad,
      count: r.total,
      id: `state-${r.entidad}`,
    }));

  return (
    <div id="place" className="space-y-4">
      <ConcentrationLine text={strings.concentrationLine} />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.rankingTitle}</h3>
        <IntensityBarList rows={ranking} total={total} mode="intensity" palette="state" />
      </section>

      <StateLevelSmallMultiples
        rows={stateRows}
        dbToDisplay={dbToDisplay}
        title={strings.smallMultiples.title}
        subtitle={strings.smallMultiples.subtitle}
        locale={locale}
      />
    </div>
  );
}
