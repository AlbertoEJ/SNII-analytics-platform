"use client";
import { Users, MapPin, Building2, BookOpen, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICONS = {
  users: Users,
  mapPin: MapPin,
  building: Building2,
  book: BookOpen,
} as const satisfies Record<string, LucideIcon>;

export type HeadlineIcon = keyof typeof ICONS;

export interface HeadlineCard {
  label: string;
  /** Primary metric — rendered large (e.g. "48,093", "14.2%"). */
  value: string;
  /** Optional secondary line — typically the entity name (e.g. "UNAM"). */
  detail?: string;
  /** Short unit-only suffix (e.g. "del padrón"). */
  caption: string;
  href?: string;
  icon?: HeadlineIcon;
  /** Tailwind text-color class for the icon tint. */
  accent?: string;
}

interface Props {
  cards: [HeadlineCard, HeadlineCard, HeadlineCard, HeadlineCard];
}

export function HeadlineDashboard({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, idx) => {
        const Icon = c.icon ? ICONS[c.icon] : null;
        const body = (
          <Card className="py-0 h-full transition-shadow hover:shadow-lg">
            <CardContent className="p-4 flex flex-col gap-3 h-full">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {c.label}
                </span>
                {Icon && (
                  <span
                    className={cn(
                      "grid place-items-center w-8 h-8 rounded-lg bg-muted/60 shrink-0",
                      c.accent ?? "text-foreground/70",
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                  </span>
                )}
              </div>
              <span className="text-3xl font-semibold leading-none tabular-nums tracking-tight">
                {c.value}
              </span>
              <span className="text-xs text-muted-foreground -mt-1">{c.caption}</span>
              {/* Detail goes last, pushed to the bottom of the card via mt-auto.
                  min-h reserves a 2-line slot so cards without a detail keep equal height. */}
              <span
                className="mt-auto text-xs font-medium text-foreground/80 line-clamp-2 leading-snug min-h-[2.25rem]"
                title={c.detail}
              >
                {c.detail ?? " "}
              </span>
            </CardContent>
          </Card>
        );
        if (c.href) {
          return (
            <a
              key={idx}
              href={c.href}
              aria-label={`${c.label}: ${c.detail ?? c.value}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-4xl"
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
