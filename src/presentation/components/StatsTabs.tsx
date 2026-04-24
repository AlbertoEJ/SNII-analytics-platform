"use client";
import { useMemo, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

export interface FacetItem {
  label: string;
  count: number;
}

interface Props {
  total: number;
  tabs: Array<{
    id: string;
    label: string;
    items: FacetItem[];
  }>;
  strings: {
    largest: string;
    smallest: string;
    median: string;
    categories: string;
  };
}

export function StatsTabs({ total, tabs, strings }: Props) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <Tabs value={active} onValueChange={(v) => setActive(String(v))}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-2">
          <Panel total={total} items={tab.items} strings={strings} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Panel({
  total,
  items,
  strings,
}: {
  total: number;
  items: FacetItem[];
  strings: Props["strings"];
}) {
  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const counts = items.map((i) => i.count);
    const sorted = [...counts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return {
      largest: { label: items[0].label, count: items[0].count },
      smallest: {
        label: items[items.length - 1].label,
        count: items[items.length - 1].count,
      },
      median,
      n: items.length,
    };
  }, [items]);

  const max = items[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label={strings.categories} value={summary.n.toLocaleString()} />
          <SummaryCard
            label={strings.largest}
            value={summary.largest.count.toLocaleString()}
            sub={summary.largest.label}
          />
          <SummaryCard
            label={strings.median}
            value={summary.median.toLocaleString()}
          />
          <SummaryCard
            label={strings.smallest}
            value={summary.smallest.count.toLocaleString()}
            sub={summary.smallest.label}
          />
        </div>
      )}

      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <ol>
              {items.map((it, i) => {
                const pct = total > 0 ? (it.count / total) * 100 : 0;
                const barPct = max > 0 ? (it.count / max) * 100 : 0;
                return (
                  <li key={it.label} className="px-4 py-3 border-b last:border-b-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm truncate">{it.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium tabular-nums">
                          {it.count.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="ml-7 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground/70"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums mt-0.5">{value}</div>
        {sub && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={sub}>
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
