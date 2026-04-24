"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { formatName } from "@/lib/formatName";
import {
  SNII_LEVEL_COLORS,
  SNII_LEVEL_LABELS,
  type SniiLevelCode,
} from "@/domain/value-objects/SniiLevel";
import type { Locale } from "@/presentation/i18n/messages";

interface Hit {
  cvu: number;
  nombre: string;
  nivel: SniiLevelCode | null;
  area: string | null;
  entidad: string | null;
}

interface Strings {
  placeholder: string;
  empty: string;
  noResults: string;
  viewAllTemplate: string;
}

export function CommandPalette({
  locale,
  strings,
}: {
  locale: Locale;
  strings: Strings;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);
  const lastQRef = useRef("");

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setTotal(0);
      return;
    }
    const handle = setTimeout(async () => {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      setLoading(true);
      try {
        lastQRef.current = q;
        const res = await fetch(`/api/researchers/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Hit[]; total: number };
        // Drop stale responses
        if (lastQRef.current !== q) return;
        setHits(data.items);
        setTotal(data.total);
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") {
          // no-op
        }
      } finally {
        if (lastQRef.current === q) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command shouldFilter={false}>
        {/* cmdk's built-in filtering would dedupe by label; we already filtered server-side */}
        <CommandInput
          placeholder={strings.placeholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
        {hits.length === 0 && query.trim().length >= 2 && !loading && (
          <CommandEmpty>{strings.noResults}</CommandEmpty>
        )}
        {hits.length === 0 && query.trim().length < 2 && (
          <CommandEmpty>{/* render nothing — cmdk would ignore an empty prop */}{""}</CommandEmpty>
        )}
        {hits.length > 0 && (
          <>
            <CommandGroup>
              {hits.map((h) => (
                <CommandItem
                  key={h.cvu}
                  value={`${h.cvu}-${h.nombre}`}
                  onSelect={() => go(`/researchers/${h.cvu}`)}
                  className="gap-3"
                >
                  <span
                    aria-hidden
                    className="w-1.5 h-6 rounded-full shrink-0"
                    style={{
                      background: h.nivel
                        ? SNII_LEVEL_COLORS[h.nivel]
                        : "var(--muted-foreground)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{formatName(h.nombre)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {h.area ?? "—"}
                      {h.entidad ? ` · ${h.entidad}` : ""}
                    </div>
                  </div>
                  {h.nivel && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                      {SNII_LEVEL_LABELS[h.nivel][locale]}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {total > hits.length && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__view_all__"
                    onSelect={() => go(`/researchers?q=${encodeURIComponent(query.trim())}`)}
                  >
                    {strings.viewAllTemplate.replace("{n}", total.toLocaleString(locale === "es" ? "es-MX" : "en-US"))}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </>
        )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
