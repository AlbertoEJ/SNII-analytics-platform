import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { isValidSniiLevel, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";
import { topNShare } from "@/application/use-cases/TopNShare";
import { HeadlineDashboard, type HeadlineCard } from "@/presentation/components/stats/HeadlineDashboard";
import { QuestionTabs } from "@/presentation/components/stats/QuestionTabs";
import { CountPane, type LevelFacet } from "@/presentation/components/stats/CountPane";
import { PlacePane } from "@/presentation/components/stats/PlacePane";
import { FieldPane } from "@/presentation/components/stats/FieldPane";

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

  // DB-name → display-name map for states.
  const dbToDisplay: Record<string, string> = {};
  for (const [code, dbName] of Object.entries(STATE_CODE_TO_DB_NAME)) {
    dbToDisplay[dbName] = STATE_DISPLAY_NAME[Number(code)];
  }

  const total = stats.total;
  const fmtPct = (ratio: number) =>
    `${(ratio * 100).toLocaleString(locale === "es" ? "es-MX" : "en-US", { maximumFractionDigits: 1 })}%`;
  const fmtNum = (n: number) =>
    n.toLocaleString(locale === "es" ? "es-MX" : "en-US");

  // --- ¿Cuántos? data ---
  const levels: LevelFacet[] = stats.byNivel
    .filter((n): n is { value: SniiLevelCode; count: number } => isValidSniiLevel(n.value))
    .map((n) => ({ code: n.value, count: n.count }));

  const topTierCount = levels
    .filter((l) => l.code === "3" || l.code === "E")
    .reduce((s, l) => s + l.count, 0);
  const candidateCount = levels.find((l) => l.code === "C")?.count ?? 0;

  const countStrings = {
    summaryTitle: t.stats.count.summaryTitle,
    rankingTitle: t.stats.count.rankingTitle,
    summaryBullets: [
      t.stats.count.bulletTotal(fmtNum(total)),
      t.stats.count.bulletTopTier(fmtPct(total > 0 ? topTierCount / total : 0)),
      t.stats.count.bulletCandidates(fmtPct(total > 0 ? candidateCount / total : 0)),
      t.stats.count.bulletLevels(levels.filter((l) => l.count > 0).length),
    ],
  };

  // --- ¿Dónde? data ---
  const stateItems = stateLevel.map((r) => ({
    label: dbToDisplay[r.entidad] ?? r.entidad,
    count: r.total,
  }));
  const stateShare = topNShare(stateItems, 5);

  const placeStrings = {
    rankingTitle: t.stats.place.rankingTitle,
    smallMultiples: {
      title: t.stats.place.smallMultiples.title,
      subtitle: t.stats.place.smallMultiples.subtitle,
    },
    concentrationLine: t.stats.place.concentrationLine(stateShare.n, fmtPct(stateShare.share)),
  };

  // --- ¿En qué? data ---
  const areaTotalsMap = new Map<string, number>();
  for (const row of areaBreakdown) {
    areaTotalsMap.set(row.area, (areaTotalsMap.get(row.area) ?? 0) + row.count);
  }
  const areaItems = Array.from(areaTotalsMap.entries()).map(([label, count]) => ({ label, count }));

  const institutionItems = institutions.map((i) => ({ label: i.institucion, count: i.count }));
  const institutionShare = topNShare(institutionItems, 5);

  const fieldStrings = {
    areaTitle: t.stats.field.areaTitle,
    treemapTitle: t.stats.field.treemapTitle,
    treemapSubtitle: t.stats.field.treemapSubtitle,
    institutionTitle: t.stats.field.institutionTitle,
    institutionConcentration: t.stats.field.institutionConcentration(
      institutionShare.n,
      fmtPct(institutionShare.share),
    ),
  };

  // --- Headline cards ---
  const topState = stateShare.entities[0] ?? { label: "—", count: 0 };
  const topInstitution = institutionShare.entities[0] ?? { label: "—", count: 0 };
  const topArea = areaItems.slice().sort((a, b) => b.count - a.count)[0] ?? { label: "—", count: 0 };

  const topStatePct = total > 0 ? topState.count / total : 0;
  const topInstitutionPct = total > 0 ? topInstitution.count / total : 0;
  const topAreaPct = total > 0 ? topArea.count / total : 0;

  // "1 de cada N" uses a rounded reciprocal of the share.
  const oneInN = (ratio: number) =>
    ratio > 0 ? Math.max(2, Math.round(1 / ratio)).toLocaleString(locale === "es" ? "es-MX" : "en-US") : "—";

  const headlineCards: [HeadlineCard, HeadlineCard, HeadlineCard, HeadlineCard] = [
    {
      label: t.stats.headline.total,
      value: fmtNum(total),
      caption: t.stats.headline.totalCaption,
    },
    {
      label: t.stats.headline.topState,
      value: topState.label,
      caption: t.stats.headline.topStateCaption(topState.label, oneInN(topStatePct)),
      href: `#state-${encodeURIComponent(
        // Store the DB-name in the hash so the anchor matches the PlacePane row id.
        Object.entries(dbToDisplay).find(([, display]) => display === topState.label)?.[0] ?? topState.label,
      )}`,
    },
    {
      label: t.stats.headline.topInstitution,
      value: topInstitution.label,
      caption: t.stats.headline.topInstitutionCaption(topInstitution.label, fmtPct(topInstitutionPct)),
      href: `#inst-${encodeURIComponent(topInstitution.label)}`,
    },
    {
      label: t.stats.headline.topArea,
      value: topArea.label,
      caption: t.stats.headline.topAreaCaption(topArea.label, fmtPct(topAreaPct)),
      href: `#area-${encodeURIComponent(topArea.label)}`,
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.stats.title}</h1>
        <p className="text-sm text-muted-foreground">{t.stats.subtitle}</p>
      </header>

      <HeadlineDashboard cards={headlineCards} />

      <QuestionTabs
        strings={{ count: t.stats.tabs.count, place: t.stats.tabs.place, field: t.stats.tabs.field }}
        count={
          <CountPane
            total={total}
            levels={levels}
            locale={locale}
            strings={countStrings}
          />
        }
        place={
          <PlacePane
            total={total}
            stateRows={stateLevel}
            dbToDisplay={dbToDisplay}
            locale={locale}
            strings={placeStrings}
          />
        }
        field={
          <FieldPane
            total={total}
            areaRows={areaBreakdown}
            institutions={institutions}
            strings={fieldStrings}
          />
        }
      />
    </div>
  );
}
