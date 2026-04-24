"use client";
import { Card, CardContent } from "@/components/ui/card";

export interface HeadlineCard {
  label: string;
  value: string;
  caption: string;
  /** Optional anchor hash to jump to (e.g. "#place" or "#inst-unam"). */
  href?: string;
}

interface Props {
  cards: [HeadlineCard, HeadlineCard, HeadlineCard, HeadlineCard];
}

export function HeadlineDashboard({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, idx) => {
        const body = (
          <Card className="py-0 h-full">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">{c.value}</span>
              <span className="text-[12px] text-muted-foreground leading-snug">
                {c.caption}
              </span>
            </CardContent>
          </Card>
        );
        if (c.href) {
          return (
            <a
              key={idx}
              href={c.href}
              aria-label={c.caption}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              {body}
            </a>
          );
        }
        return <div key={idx}>{body}</div>;
      })}
    </div>
  );
}
