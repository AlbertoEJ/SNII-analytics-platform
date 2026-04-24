"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AreaDisciplineRow } from "@/domain/repositories/ResearcherRepository";

interface Props {
  rows: AreaDisciplineRow[];
  title: string;
  subtitle: string;
  researchersLabel: string;
}

interface AreaNode {
  name: string;
  total: number;
  disciplines: Array<{
    name: string;
    total: number;
    subdisciplines: Array<{ name: string; count: number }>;
  }>;
}

function buildTree(rows: AreaDisciplineRow[]): AreaNode[] {
  const areaMap = new Map<string, AreaNode>();
  for (const row of rows) {
    let area = areaMap.get(row.area);
    if (!area) {
      area = { name: row.area, total: 0, disciplines: [] };
      areaMap.set(row.area, area);
    }
    area.total += row.count;
    let disc = area.disciplines.find((d) => d.name === row.discipline);
    if (!disc) {
      disc = { name: row.discipline, total: 0, subdisciplines: [] };
      area.disciplines.push(disc);
    }
    disc.total += row.count;
    disc.subdisciplines.push({ name: row.subdiscipline, count: row.count });
  }
  // Sort disciplines & subdisciplines by count DESC
  for (const a of areaMap.values()) {
    a.disciplines.sort((x, y) => y.total - x.total);
    for (const d of a.disciplines) d.subdisciplines.sort((x, y) => y.count - x.count);
  }
  // Sort areas by roman numeral
  return [...areaMap.values()].sort((a, b) => romanValue(a.name) - romanValue(b.name));
}

function romanValue(area: string): number {
  const m = area.match(/^([IVXLCDM]+)\./);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0,
    prev = 0;
  for (const ch of m[1]) {
    const v = map[ch] ?? 0;
    total += v > prev ? v - 2 * prev : v;
    prev = v;
  }
  return total;
}

export function DisciplineTree({ rows, title, subtitle, researchersLabel }: Props) {
  const tree = useMemo(() => buildTree(rows), [rows]);
  const grandTotal = tree.reduce((sum, a) => sum + a.total, 0);
  const maxAreaTotal = tree.reduce((m, a) => Math.max(m, a.total), 0);

  return (
    <Card className="py-0 overflow-hidden">
      <CardHeader className="py-3 border-b">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</span>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[700px]">
          <ul>
            {tree.map((area) => (
              <AreaRow
                key={area.name}
                area={area}
                grandTotal={grandTotal}
                maxAreaTotal={maxAreaTotal}
                researchersLabel={researchersLabel}
              />
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AreaRow({
  area,
  grandTotal,
  maxAreaTotal,
  researchersLabel,
}: {
  area: AreaNode;
  grandTotal: number;
  maxAreaTotal: number;
  researchersLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pct = grandTotal > 0 ? (area.total / grandTotal) * 100 : 0;
  const barPct = maxAreaTotal > 0 ? (area.total / maxAreaTotal) * 100 : 0;
  const maxDisciplineTotal = area.disciplines[0]?.total ?? 0;
  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 hover:bg-muted/40 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <Caret open={open} />
            <span className="text-sm font-medium truncate">{area.name}</span>
          </span>
          <span className="flex items-center gap-3 shrink-0 text-xs">
            <span className="tabular-nums font-medium">
              {area.total.toLocaleString()}
            </span>
            <span className="tabular-nums text-muted-foreground w-10 text-right">
              {pct.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="ml-5 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground/70"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </button>
      {open && (
        <ul className="bg-muted/20">
          {area.disciplines.map((d) => (
            <DisciplineRow
              key={d.name}
              discipline={d}
              area={area}
              maxDisciplineTotal={maxDisciplineTotal}
              researchersLabel={researchersLabel}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DisciplineRow({
  discipline,
  area,
  maxDisciplineTotal,
  researchersLabel,
}: {
  discipline: AreaNode["disciplines"][number];
  area: AreaNode;
  maxDisciplineTotal: number;
  researchersLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pct = area.total > 0 ? (discipline.total / area.total) * 100 : 0;
  const barPct = maxDisciplineTotal > 0 ? (discipline.total / maxDisciplineTotal) * 100 : 0;
  const maxSub = discipline.subdisciplines[0]?.count ?? 0;
  return (
    <li className="border-t border-background/60 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full pl-10 pr-4 py-2 hover:bg-background/60 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <Caret open={open} />
            <span className="text-sm truncate">{discipline.name}</span>
          </span>
          <span className="flex items-center gap-3 shrink-0 text-xs">
            <span className="tabular-nums">{discipline.total.toLocaleString()}</span>
            <span className="tabular-nums text-muted-foreground w-10 text-right">
              {pct.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="ml-5 h-1 rounded-full bg-background/70 overflow-hidden">
          <div
            className="h-full bg-foreground/60"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </button>
      {open && (
        <ul className="border-t border-background/60">
          {discipline.subdisciplines.map((s) => {
            const subPct = discipline.total > 0 ? (s.count / discipline.total) * 100 : 0;
            const subBarPct = maxSub > 0 ? (s.count / maxSub) * 100 : 0;
            return (
              <li key={s.name}>
                <Link
                  href={`/researchers?area=${encodeURIComponent(area.name)}`}
                  className="block pl-16 pr-4 py-1.5 hover:bg-background/60 text-xs"
                  title={`${area.name} → ${discipline.name} → ${s.name}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-0.5">
                    <span className="truncate text-muted-foreground">{s.name}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="tabular-nums">{s.count.toLocaleString()}</span>
                      <span className="tabular-nums text-muted-foreground w-10 text-right">
                        {subPct.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-0.5 rounded-full bg-background/60 overflow-hidden">
                    <div
                      className="h-full bg-foreground/40"
                      style={{ width: `${subBarPct}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <span className="sr-only">{researchersLabel}</span>
    </li>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
