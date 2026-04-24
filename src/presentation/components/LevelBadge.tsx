import { Badge } from "@/components/ui/badge";
import { SNII_LEVEL_LABELS, type SniiLevelCode } from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<SniiLevelCode, string> = {
  C: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  "1": "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
  "2": "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200",
  "3": "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  E: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200",
};

export function LevelBadge({
  level,
  locale,
  className,
}: {
  level: SniiLevelCode;
  locale: Locale;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(LEVEL_TONE[level], "border-transparent", className)}>
      {SNII_LEVEL_LABELS[level][locale]}
    </Badge>
  );
}
