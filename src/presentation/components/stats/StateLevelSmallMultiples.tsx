import { Card, CardContent } from "@/components/ui/card";
import type { StateLevelRow } from "@/domain/repositories/ResearcherRepository";
import { SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

interface Props {
  rows: StateLevelRow[];
  dbToDisplay: Record<string, string>;
  title: string;
  subtitle: string;
  locale: Locale;
}

// Canonical order for stack segments: C → 1 → 2 → 3 → E.
const ORDER: SniiLevelCode[] = ["C", "1", "2", "3", "E"];

function segmentValue(row: StateLevelRow, code: SniiLevelCode): number {
  switch (code) {
    case "C": return row.c;
    case "1": return row.n1;
    case "2": return row.n2;
    case "3": return row.n3;
    case "E": return row.e;
  }
}

export function StateLevelSmallMultiples({ rows, dbToDisplay, title, subtitle, locale }: Props) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);

  return (
    <section className="space-y-3">
      <header>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sorted.map((row) => {
          const display = dbToDisplay[row.entidad] ?? row.entidad;
          const total = row.total || 1;
          return (
            <Card key={row.entidad} className="py-0">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium truncate" title={display}>{display}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {row.total.toLocaleString(locale === "es" ? "es-MX" : "en-US")}
                  </span>
                </div>
                <div
                  className="flex h-2 rounded-full overflow-hidden bg-muted"
                  role="img"
                  aria-label={ORDER.map((code) => {
                    const v = segmentValue(row, code);
                    const pct = ((v / total) * 100).toFixed(1);
                    return `${SNII_LEVEL_LABELS[code][locale]} ${pct}%`;
                  }).join(", ")}
                >
                  {ORDER.map((code) => {
                    const value = segmentValue(row, code);
                    const pct = (value / total) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={code}
                        style={{ width: `${pct}%`, backgroundColor: SNII_LEVEL_COLORS[code] }}
                        title={`${SNII_LEVEL_LABELS[code][locale]}: ${value.toLocaleString(locale === "es" ? "es-MX" : "en-US")} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
