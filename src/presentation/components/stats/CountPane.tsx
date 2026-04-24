"use client";
import { Card, CardContent } from "@/components/ui/card";
import { LevelDonut } from "@/presentation/components/LevelDonut";
import { IntensityBarList, type RankedRow } from "./IntensityBarList";
import { SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, SNII_LEVELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

export interface LevelFacet {
  code: SniiLevelCode;
  count: number;
}

interface Strings {
  rankingTitle: string;
  summaryTitle: string;
  summaryBullets: string[]; // pre-rendered, localized
}

interface Props {
  total: number;
  levels: LevelFacet[];
  locale: Locale;
  strings: Strings;
}

export function CountPane({ total, levels, locale, strings }: Props) {
  const countByCode = new Map(levels.map((l) => [l.code, l.count]));

  const donutSlices = SNII_LEVELS
    .map((code) => ({
      label: SNII_LEVEL_LABELS[code][locale],
      count: countByCode.get(code) ?? 0,
      color: SNII_LEVEL_COLORS[code],
    }))
    .filter((s) => s.count > 0);

  const rows: RankedRow[] = SNII_LEVELS
    .map((code) => ({
      label: SNII_LEVEL_LABELS[code][locale],
      count: countByCode.get(code) ?? 0,
      color: SNII_LEVEL_COLORS[code],
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="py-6">
          <CardContent className="flex justify-center">
            <LevelDonut total={total} slices={donutSlices} width={260} height={260} centerLabel="" />
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">{strings.summaryTitle}</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              {strings.summaryBullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{strings.rankingTitle}</h3>
        <IntensityBarList rows={rows} total={total} mode="categorical" />
      </section>
    </div>
  );
}
