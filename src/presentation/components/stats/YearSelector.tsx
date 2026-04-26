"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const KEY_YEARS = [1984, 1990, 2000, 2010, 2020, 2026] as const;

interface Props {
  availableYears: number[];
  current: number;
  label: string;
}

export function YearSelector({ availableYears, current, label }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();

  const minYear = availableYears[0] ?? 1984;
  const maxYear = availableYears.at(-1) ?? 2026;

  const navigate = (y: number) => {
    if (!availableYears.includes(y)) return;
    const next = new URLSearchParams(sp.toString());
    if (y === maxYear) next.delete("year");
    else next.set("year", String(y));
    const qs = next.toString();
    router.push(qs ? `${path}?${qs}` : path, { scroll: false });
  };

  // Pill set: only years that exist in the data, intersected with the highlight list.
  const pillYears = KEY_YEARS.filter((y) => availableYears.includes(y));
  // Other years available via the select.
  const otherYears = availableYears.filter((y) => !pillYears.includes(y as typeof KEY_YEARS[number]));

  const currentInPills = (pillYears as readonly number[]).includes(current);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {pillYears.map((y) => {
          const active = y === current;
          return (
            <button
              key={y}
              type="button"
              aria-pressed={active}
              onClick={() => navigate(y)}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors tabular-nums",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
              )}
            >
              {y}
            </button>
          );
        })}
        {otherYears.length > 0 && (
          <select
            value={currentInPills ? "" : String(current)}
            onChange={(e) => {
              const y = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(y)) navigate(y);
            }}
            aria-label={label}
            className={cn(
              "h-7 px-2 rounded-full text-xs font-medium border transition-colors tabular-nums appearance-none cursor-pointer",
              currentInPills
                ? "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
                : "bg-foreground text-background border-foreground",
            )}
          >
            <option value="" disabled>
              {minYear}–{maxYear}
            </option>
            {otherYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
