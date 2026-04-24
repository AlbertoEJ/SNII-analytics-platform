"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/presentation/i18n/messages";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (loc: Locale) => {
    document.cookie = `locale=${loc}; path=/; max-age=${60 * 60 * 24 * 365}`;
    start(() => router.refresh());
  };

  return (
    <div className="flex gap-1 text-xs" aria-label="Language">
      {(["es", "en"] as Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => set(loc)}
          disabled={pending}
          className={`px-2 py-1 rounded ${
            current === loc
              ? "bg-foreground text-background"
              : "border border-foreground/20 hover:bg-foreground/5"
          }`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
