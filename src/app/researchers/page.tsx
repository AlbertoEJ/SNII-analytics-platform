import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages, type Locale } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVELS, SNII_LEVEL_LABELS, isValidSniiLevel } from "@/domain/value-objects/SniiLevel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LevelBadge } from "@/presentation/components/LevelBadge";
import { SearchIcon, CloseIcon } from "@/presentation/components/icons";
import { formatName, nameInitials } from "@/lib/formatName";
import { SNII_LEVEL_COLORS } from "@/domain/value-objects/SniiLevel";

const PAGE_SIZE = 25;

export const revalidate = 3600;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const parts = ["Investigadores"];
  if (typeof sp.nivel === "string" && isValidSniiLevel(sp.nivel)) {
    parts.push(SNII_LEVEL_LABELS[sp.nivel].es);
  }
  if (typeof sp.entidad === "string" && sp.entidad) parts.push(sp.entidad);
  if (typeof sp.area === "string" && sp.area) parts.push(sp.area);
  if (typeof sp.q === "string" && sp.q.trim()) parts.push(`"${sp.q.trim()}"`);
  return {
    title: `${parts.join(" · ")} · SNII`,
    description:
      "Buscador del padrón SNII (Sistema Nacional de Investigadoras e Investigadores).",
  };
}

const NATIVE_SELECT =
  "flex h-9 w-full items-center justify-between rounded-xl border border-input bg-input/50 px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-3 focus:ring-ring/30 focus:border-ring appearance-none";

export default async function ResearchersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = getMessages(locale);

  const query = typeof sp.q === "string" ? sp.q : "";
  const nivel = typeof sp.nivel === "string" && isValidSniiLevel(sp.nivel) ? sp.nivel : undefined;
  const rawArea = typeof sp.area === "string" ? sp.area : undefined;
  const rawEntidad = typeof sp.entidad === "string" ? sp.entidad : undefined;
  const page = Math.max(1, parseInt((typeof sp.page === "string" ? sp.page : "1"), 10) || 1);

  const { searchResearchers, repo, getAvailableYears } = container();
  const availableYears = await getAvailableYears.execute();
  const latest = availableYears.at(-1) ?? new Date().getFullYear();
  const yearRaw = typeof sp.year === "string" ? Number.parseInt(sp.year, 10) : Number.NaN;
  const year = availableYears.includes(yearRaw) ? yearRaw : latest;
  const [areas, entidades] = await Promise.all([
    repo.distinctValues("area_conocimiento", year),
    repo.distinctValues("entidad_final", year),
  ]);
  const area = rawArea && areas.includes(rawArea) ? rawArea : undefined;
  const entidad = rawEntidad && entidades.includes(rawEntidad) ? rawEntidad : undefined;
  const result = await searchResearchers.execute({
    query, nivel, area, entidad, year,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  // Build a URL preserving the rest of the params, optionally dropping or overriding keys.
  const buildUrl = (overrides: Partial<Record<string, string | undefined>>) => {
    const p = new URLSearchParams();
    const merged = {
      q: query || undefined,
      nivel,
      area,
      entidad,
      page: page > 1 ? String(page) : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/researchers?${s}` : "/researchers";
  };

  const activeChips: Array<{ label: string; href: string }> = [];
  if (query) activeChips.push({ label: `"${query}"`, href: buildUrl({ q: undefined, page: undefined }) });
  if (nivel) activeChips.push({ label: SNII_LEVEL_LABELS[nivel][locale], href: buildUrl({ nivel: undefined, page: undefined }) });
  if (area) activeChips.push({ label: area, href: buildUrl({ area: undefined, page: undefined }) });
  if (entidad) activeChips.push({ label: entidad, href: buildUrl({ entidad: undefined, page: undefined }) });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.nav.researchers}</h1>
        <p className="text-sm text-muted-foreground">
          {t.search.results(result.total)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters card */}
        <FiltersCard
          query={query}
          nivel={nivel}
          area={area}
          entidad={entidad}
          areas={areas}
          entidades={entidades}
          locale={locale}
          t={t}
        />

        {/* Results column */}
        <div className="min-w-0 space-y-4">
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
                {t.search.activeFilters}
              </span>
              {activeChips.map((c) => (
                <Badge
                  key={c.label}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1 py-0.5 text-xs"
                >
                  <span className="truncate max-w-[200px]">{c.label}</span>
                  <Link
                    href={c.href}
                    aria-label={`${t.search.remove} ${c.label}`}
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-foreground/10"
                  >
                    <CloseIcon className="w-2.5 h-2.5 stroke-current fill-none" />
                  </Link>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                className="h-6 px-2 text-xs"
                render={<Link href="/researchers">{t.search.clear}</Link>}
              />
            </div>
          )}

          {result.items.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm font-medium">{t.search.empty}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.search.emptyHint}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 overflow-hidden">
              <ul className="divide-y">
                {result.items.map((r) => (
                  <li key={r.cvu}>
                    <Link
                      href={`/researchers/${r.cvu}`}
                      className="group relative flex items-center gap-3 pl-5 pr-4 py-3 hover:bg-muted/60 transition-colors"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                        style={{
                          background: r.nivel
                            ? SNII_LEVEL_COLORS[r.nivel]
                            : "transparent",
                        }}
                      />
                      <Avatar nombre={r.nombre} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{formatName(r.nombre)}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {r.areaConocimiento ?? "—"}
                          {r.entidadFinal ? ` · ${r.entidadFinal}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.nivel && <LevelBadge level={r.nivel} locale={locale} />}
                        <span className="hidden sm:inline text-[11px] text-muted-foreground tabular-nums">
                          CVU {r.cvu}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center text-sm">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                disabled={page <= 1}
                render={
                  <Link href={buildUrl({ page: String(Math.max(1, page - 1)) })}>
                    {t.search.prev}
                  </Link>
                }
              />
              <span className="text-muted-foreground text-xs">
                {t.search.page(page, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                disabled={page >= totalPages}
                render={
                  <Link href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}>
                    {t.search.next}
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FiltersCard({
  query,
  nivel,
  area,
  entidad,
  areas,
  entidades,
  locale,
  t,
}: {
  query: string;
  nivel: string | undefined;
  area: string | undefined;
  entidad: string | undefined;
  areas: string[];
  entidades: string[];
  locale: Locale;
  t: ReturnType<typeof getMessages>;
}) {
  return (
    <Card className="lg:sticky lg:top-16 lg:self-start py-0 overflow-hidden">
      <CardHeader className="py-3 border-b">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {t.search.filters}
        </span>
      </CardHeader>
      <CardContent className="p-4">
        <form className="flex flex-col gap-4">
          <Field label={t.search.placeholder}>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground stroke-current fill-none" />
              <Input
                name="q"
                defaultValue={query}
                placeholder={t.search.placeholder}
                className="pl-8 h-9 rounded-xl"
              />
            </div>
          </Field>
          <Field label={t.search.level}>
            <select name="nivel" defaultValue={nivel ?? ""} className={NATIVE_SELECT}>
              <option value="">{t.search.all}</option>
              {SNII_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {SNII_LEVEL_LABELS[l][locale]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.search.area}>
            <select name="area" defaultValue={area ?? ""} className={NATIVE_SELECT}>
              <option value="">{t.search.all}</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.search.state}>
            <select name="entidad" defaultValue={entidad ?? ""} className={NATIVE_SELECT}>
              <option value="">{t.search.all}</option>
              {entidades.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" size="sm" className="mt-1">
            {t.search.apply}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span
      aria-hidden
      className="grid place-items-center w-9 h-9 rounded-full bg-muted text-[11px] font-semibold tracking-tight text-muted-foreground shrink-0"
    >
      {nameInitials(nombre)}
    </span>
  );
}
