"use client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface HeadlineCard {
  label: string;
  value: string;
  caption: string;
  /** "number" for short numeric values (stays large), "name" for entity names (clamped smaller so long names don't dominate). */
  variant?: "number" | "name";
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
            <CardContent className="p-4 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span
                className={cn(
                  "font-semibold leading-tight",
                  c.variant === "name"
                    ? "text-base line-clamp-2"
                    : "text-3xl tabular-nums",
                )}
                title={c.variant === "name" ? c.value : undefined}
              >
                {c.value}
              </span>
              <span className="text-xs text-muted-foreground leading-snug line-clamp-2">
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
