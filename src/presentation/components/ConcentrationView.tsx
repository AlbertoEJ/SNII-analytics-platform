"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LorenzCurve } from "./LorenzCurve";

interface Item {
  label: string;
  count: number;
}

interface ConcentrationStrings {
  title: string;
  subtitle: string;
  hhi: string;
  hhiHint: string;
  topShareTop3: string;
  topShareTop5: string;
  topShareHintTop3: string;
  dominance: string;
  dominanceHint: string;
  byState: string;
  byInstitution: string;
  interpretation: string;
  verticeTemplate: string;
  moderateTemplate: string;
  dispersedTemplate: string;
  topShort: string;
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

interface Props {
  strings: ConcentrationStrings;
  states: Item[];
  institutions: Item[];
}

export function ConcentrationView({ strings, states, institutions }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{strings.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">{strings.subtitle}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block label={strings.byState} items={states} strings={strings} />
        <Block label={strings.byInstitution} items={institutions} strings={strings} />
      </div>
    </div>
  );
}

function Block({
  label,
  items,
  strings,
}: {
  label: string;
  items: Item[];
  strings: ConcentrationStrings;
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.count, 0);
  const sortedDesc = [...items].sort((a, b) => b.count - a.count);
  const top1 = sortedDesc[0];

  // HHI = sum of squared market shares (0..1).
  const hhi = items.reduce((s, i) => {
    const share = total > 0 ? i.count / total : 0;
    return s + share * share;
  }, 0);

  const top3Share = sortedDesc.slice(0, 3).reduce((s, i) => s + i.count, 0) / total;
  const top5Share = sortedDesc.slice(0, 5).reduce((s, i) => s + i.count, 0) / total;

  // Median
  const sortedAsc = [...sortedDesc].sort((a, b) => a.count - b.count);
  const median = sortedAsc[Math.floor(sortedAsc.length / 2)].count;
  const dominance = median > 0 ? top1.count / median : 0;

  const top1ShareStr = `${(top1.count / total * 100).toFixed(1)}%`;
  const hhiStr = hhi.toFixed(3);
  const tpl =
    hhi >= 0.18
      ? strings.verticeTemplate
      : hhi >= 0.1
        ? strings.moderateTemplate
        : strings.dispersedTemplate;
  const interp = fillTemplate(tpl, { entity: top1.label, share: top1ShareStr, hhi: hhiStr });

  return (
    <Card className="py-0">
      <CardHeader className="py-3 border-b">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Metric
            value={hhiStr}
            label={strings.hhi}
            hint={strings.hhiHint}
            tone={hhi >= 0.18 ? "danger" : hhi >= 0.1 ? "warn" : "ok"}
          />
          <Metric
            value={`${(top3Share * 100).toFixed(1)}%`}
            label={strings.topShareTop3}
            hint={strings.topShareHintTop3}
          />
          <Metric
            value={`${dominance.toFixed(1)}×`}
            label={strings.dominance}
            hint={strings.dominanceHint}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {strings.topShort}: <span className="tabular-nums font-medium text-foreground">{(top5Share * 100).toFixed(1)}%</span>
        </div>

        <div className="border-t pt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            {strings.interpretation}
          </div>
          <p className="text-sm leading-snug">{interp}</p>
        </div>

        <div className="border-t pt-3">
          <LorenzCurve items={items} />
        </div>

        <div className="border-t pt-3 space-y-1.5">
          {sortedDesc.slice(0, 5).map((i, idx) => {
            const share = (i.count / total) * 100;
            const barPct = (i.count / sortedDesc[0].count) * 100;
            return (
              <div key={i.label} className="text-xs">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] tabular-nums text-muted-foreground w-3">
                      {idx + 1}
                    </span>
                    <span className="truncate" title={i.label}>
                      {i.label}
                    </span>
                  </span>
                  <span className="tabular-nums font-medium shrink-0">{share.toFixed(1)}%</span>
                </div>
                <div className="ml-5 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground/70" style={{ width: `${barPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200"
      : tone === "warn"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
        : tone === "ok"
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {tone && <Badge variant="secondary" className={`${toneClass} border-transparent text-[9px] py-0 px-1.5`}>·</Badge>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground leading-snug">{hint}</div>
    </div>
  );
}
