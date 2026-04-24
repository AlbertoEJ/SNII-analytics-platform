"use client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { intensityShade, type PaletteName } from "./palette";

export interface RankedRow {
  label: string;
  count: number;
  /** Optional explicit color — only used when `mode === "categorical"`. */
  color?: string;
  /** Optional stable id to scroll into view programmatically. */
  id?: string;
}

type Props = {
  rows: RankedRow[];
  total: number;
  maxHeight?: number;
  showIndex?: boolean;
} & (
  | { mode: "categorical" }
  | { mode: "intensity"; palette: PaletteName }
);

export function IntensityBarList(props: Props) {
  const { rows, total, maxHeight = 640, showIndex = true } = props;
  const max = rows[0]?.count ?? 1;

  return (
    <Card className="py-0 overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <ol>
            {rows.map((row, i) => {
              const pct = total > 0 ? (row.count / total) * 100 : 0;
              const barPct = max > 0 ? (row.count / max) * 100 : 0;
              const barColor =
                props.mode === "categorical"
                  ? row.color ?? "var(--foreground)"
                  : intensityShade(props.palette, max > 0 ? row.count / max : 0);
              return (
                <li
                  key={row.id ?? row.label}
                  id={row.id}
                  className="px-4 py-3 border-b last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {showIndex && (
                        <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}
                        </span>
                      )}
                      <span className="text-sm truncate">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium tabular-nums">
                        {row.count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className={showIndex ? "ml-7 h-1.5 rounded-full bg-muted overflow-hidden" : "h-1.5 rounded-full bg-muted overflow-hidden"}>
                    <div
                      className="h-full"
                      style={{ width: `${barPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
