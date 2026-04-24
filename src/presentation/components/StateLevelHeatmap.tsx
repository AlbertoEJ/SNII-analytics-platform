"use client";
import Link from "next/link";
import { interpolateBlues } from "d3-scale-chromatic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StateLevelRow } from "@/domain/repositories/ResearcherRepository";

const LEVELS: Array<{ key: keyof Pick<StateLevelRow, "c" | "n1" | "n2" | "n3" | "e">; label: string; code: string }> =
  [
    { key: "c", label: "C", code: "C" },
    { key: "n1", label: "1", code: "1" },
    { key: "n2", label: "2", code: "2" },
    { key: "n3", label: "3", code: "3" },
    { key: "e", label: "E", code: "E" },
  ];

interface Props {
  rows: StateLevelRow[];
  dbToDisplay: Record<string, string>;
  title: string;
  subtitle: string;
  stateLabel: string;
}

export function StateLevelHeatmap({ rows, dbToDisplay, title, subtitle, stateLabel }: Props) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardHeader className="py-3 border-b">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</span>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[640px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b">
              <tr>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-4 py-2">
                  {stateLabel}
                </th>
                {LEVELS.map((l) => (
                  <th
                    key={l.code}
                    className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-2 py-2 w-16"
                  >
                    {l.label}
                  </th>
                ))}
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-4 py-2 w-20">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const display = dbToDisplay[r.entidad] ?? r.entidad;
                return (
                  <tr key={r.entidad} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-1.5 truncate max-w-[200px]">{display}</td>
                    {LEVELS.map((l) => {
                      const v = r[l.key];
                      const pct = r.total > 0 ? v / r.total : 0;
                      const bg = pct > 0 ? interpolateBlues(0.1 + 0.9 * pct) : "transparent";
                      const isLight = pct < 0.5;
                      return (
                        <td
                          key={l.code}
                          className="px-1 py-1 text-center"
                          style={{ background: bg, color: isLight ? "inherit" : "white" }}
                          title={`${display} · ${l.label}: ${v.toLocaleString()} (${(pct * 100).toFixed(1)}%)`}
                        >
                          <Link
                            href={`/researchers?entidad=${encodeURIComponent(r.entidad)}&nivel=${encodeURIComponent(l.code)}`}
                            className="block tabular-nums text-xs px-1 py-0.5"
                          >
                            {pct > 0 ? `${(pct * 100).toFixed(0)}%` : "—"}
                          </Link>
                        </td>
                      );
                    })}
                    <td className="px-4 py-1.5 text-right text-xs tabular-nums font-medium">
                      {r.total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
