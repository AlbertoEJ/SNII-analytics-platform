import { SNII_LEVELS, SNII_LEVEL_COLORS, SNII_LEVEL_LABELS, type SniiLevelCode, isValidSniiLevel } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

interface Props {
  snapshots: { year: number; nivel: SniiLevelCode | null }[];
  globallyMissingYears: number[];
  locale: Locale;
  strings: {
    title: string;
    activeRange: (first: number, last: number, n: number) => string;
    legend: string;
    unknownLevel: string;
    yearGap: (y: number) => string;
  };
}

export function CareerTimeline({ snapshots, globallyMissingYears, locale, strings }: Props) {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort((a, b) => a.year - b.year);
  const first = sorted[0].year;
  const last = sorted.at(-1)!.year;
  const totalYears = last - first + 1;
  const lookup = new Map(sorted.map((s) => [s.year, s.nivel]));
  const cellW = Math.max(8, Math.min(20, 720 / totalYears));
  const H = 28;
  const W = cellW * totalYears;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{strings.title}</h3>
        <span className="text-xs text-muted-foreground">
          {strings.activeRange(first, last, sorted.length)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={strings.title}>
        {Array.from({ length: totalYears }, (_, i) => first + i).map((yr, i) => {
          const lvl = lookup.get(yr) ?? null;
          const globally = globallyMissingYears.includes(yr);
          const x = i * cellW;
          let fill = "transparent";
          let pattern: string | null = null;
          let title = "";
          if (globally) {
            pattern = "url(#hatch)";
            title = strings.yearGap(yr);
          } else if (lvl == null && lookup.has(yr)) {
            fill = "var(--muted-foreground)";
            title = `${yr} · ${strings.unknownLevel}`;
          } else if (lvl == null) {
            fill = "transparent";
            title = strings.yearGap(yr);
          } else if (isValidSniiLevel(lvl)) {
            fill = SNII_LEVEL_COLORS[lvl];
            title = `${yr} · ${SNII_LEVEL_LABELS[lvl][locale]}`;
          }
          return (
            <rect key={yr} x={x} y={0} width={cellW - 1} height={H - 10} fill={pattern ?? fill} stroke="currentColor" strokeOpacity={0.08}>
              <title>{title}</title>
            </rect>
          );
        })}
        {/* tick labels every 5 years */}
        {Array.from({ length: totalYears }, (_, i) => first + i)
          .filter((yr) => yr % 5 === 0)
          .map((yr) => (
            <text key={`t${yr}`} x={(yr - first) * cellW + cellW / 2} y={H - 1}
                  fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.55}>
              {yr}
            </text>
          ))}
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)">
            <line x1={0} x2={0} y1={0} y2={4} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
          </pattern>
        </defs>
      </svg>
      {/* legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-wider">{strings.legend}</span>
        {SNII_LEVELS.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SNII_LEVEL_COLORS[k] }} />
            {SNII_LEVEL_LABELS[k][locale]}
          </span>
        ))}
      </div>
    </section>
  );
}
