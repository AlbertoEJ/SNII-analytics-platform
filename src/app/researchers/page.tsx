import Link from "next/link";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVELS, SNII_LEVEL_LABELS, isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

const PAGE_SIZE = 25;

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
  const area = typeof sp.area === "string" ? sp.area : undefined;
  const entidad = typeof sp.entidad === "string" ? sp.entidad : undefined;
  const page = Math.max(1, parseInt((typeof sp.page === "string" ? sp.page : "1"), 10) || 1);

  const { searchResearchers, repo } = container();
  const [result, areas, entidades] = await Promise.all([
    searchResearchers.execute({
      query, nivel, area, entidad,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    repo.distinctValues("area_conocimiento"),
    repo.distinctValues("entidad_final"),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: query, nivel, area, entidad, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/researchers?${s}` : "/researchers";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.nav.researchers}</h1>

      <form className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr_1.5fr_auto] items-end">
        <label className="text-sm">
          <span className="block mb-1 text-zinc-600 dark:text-zinc-400">{t.search.placeholder}</span>
          <input
            name="q"
            defaultValue={query}
            placeholder={t.search.placeholder}
            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-600 dark:text-zinc-400">{t.search.level}</span>
          <select
            name="nivel"
            defaultValue={nivel ?? ""}
            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <option value="">{t.search.all}</option>
            {SNII_LEVELS.map((l) => (
              <option key={l} value={l}>{SNII_LEVEL_LABELS[l][locale]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-600 dark:text-zinc-400">{t.search.area}</span>
          <select
            name="area"
            defaultValue={area ?? ""}
            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <option value="">{t.search.all}</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-600 dark:text-zinc-400">{t.search.state}</span>
          <select
            name="entidad"
            defaultValue={entidad ?? ""}
            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <option value="">{t.search.all}</option>
            {entidades.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm">
            {t.search.filters}
          </button>
          <Link
            href="/researchers"
            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
          >
            {t.search.clear}
          </Link>
        </div>
      </form>

      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        {t.search.results(result.total)}
      </div>

      {result.items.length === 0 ? (
        <p className="text-center py-12 text-zinc-500">{t.search.empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
          {result.items.map((r) => (
            <li key={r.cvu} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <Link href={`/researchers/${r.cvu}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{r.nombre}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {r.areaConocimiento ?? "—"} · {r.entidadFinal ?? r.entidadAcreditacion ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {r.nivel && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {SNII_LEVEL_LABELS[r.nivel][locale]}
                    </span>
                  )}
                  <span className="text-zinc-500 tabular-nums">CVU {r.cvu}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm">
          <Link
            href={buildUrl({ page: String(Math.max(1, page - 1)) })}
            aria-disabled={page <= 1}
            className={`px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.search.prev}
          </Link>
          <span className="text-zinc-600 dark:text-zinc-400">{t.search.page(page, totalPages)}</span>
          <Link
            href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}
            aria-disabled={page >= totalPages}
            className={`px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.search.next}
          </Link>
        </div>
      )}
    </div>
  );
}
