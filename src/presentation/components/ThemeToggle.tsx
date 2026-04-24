"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ ariaLabel }: { ariaLabel: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Cycle: light → dark → system
  const next = () => {
    const current = theme === "system" ? "system" : theme;
    if (current === "light") setTheme("dark");
    else if (current === "dark") setTheme("system");
    else setTheme("light");
  };

  // Render a placeholder before mount to avoid hydration mismatch
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const label =
    !mounted || theme === "system" ? "auto" : theme === "dark" ? "dark" : "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={ariaLabel}
      onClick={next}
      className="h-7 w-7"
      title={`Tema: ${label}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 stroke-current fill-none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {isDark ? (
          // moon
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          // sun
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        )}
      </svg>
    </Button>
  );
}
