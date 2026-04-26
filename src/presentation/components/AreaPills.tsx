"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  areas: string[];
  active?: string;
  allLabel: string;
  /** Optional: preserve the year param when switching areas (Link mode). */
  year?: number;
  /** When provided, pills become buttons that call onSelect instead of navigating. */
  onSelect?: (area: string | undefined) => void;
}

const SHORT_NAMES: Record<string, string> = {
  I: "Físico-matemáticas",
  II: "Biología y química",
  III: "Medicina y salud",
  IV: "Conducta y educación",
  V: "Humanidades",
  VI: "Ciencias sociales",
  VII: "Agropecuarias",
  VIII: "Ingenierías",
  IX: "Interdisciplinaria",
};

export function AreaPills({ areas, active, allLabel, year, onSelect }: Props) {
  const sorted = [...areas].sort((a, b) => romanValue(a) - romanValue(b));
  const items = [{ value: "", label: allLabel, short: allLabel }].concat(
    sorted.map((a) => ({ value: a, label: a, short: shortLabel(a) })),
  );

  const buildHref = (areaValue: string) => {
    const params = new URLSearchParams();
    if (areaValue) params.set("area", areaValue);
    if (year != null) params.set("year", String(year));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const pillClass = (isActive: boolean) =>
    cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
      isActive
        ? "bg-foreground text-background border-foreground"
        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
    );

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Area filter">
      {items.map((it) => {
        const isActive = it.value ? active === it.value : !active;
        if (onSelect) {
          return (
            <button
              key={it.value || "_all"}
              type="button"
              title={it.label}
              aria-pressed={isActive}
              onClick={() => onSelect(it.value || undefined)}
              className={pillClass(isActive)}
            >
              {it.short}
            </button>
          );
        }
        return (
          <Link
            key={it.value || "_all"}
            href={buildHref(it.value)}
            scroll={false}
            title={it.label}
            aria-pressed={isActive}
            className={pillClass(isActive)}
          >
            {it.short}
          </Link>
        );
      })}
    </div>
  );
}

function shortLabel(area: string): string {
  const m = area.match(/^([IVXLCDM]+)\.\s*(.+)$/);
  if (!m) return area;
  const name = SHORT_NAMES[m[1]];
  return name ? `${m[1]} · ${name}` : area;
}

function romanValue(area: string): number {
  const m = area.match(/^([IVXLCDM]+)\./);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  let prev = 0;
  for (const ch of m[1]) {
    const v = map[ch] ?? 0;
    total += v > prev ? v - 2 * prev : v;
    prev = v;
  }
  return total;
}
