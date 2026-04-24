import Link from "next/link";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { buildMexicoMap } from "@/lib/mexico/buildMap";
import { MexicoMap } from "@/presentation/components/MexicoMap";

export const revalidate = 3600;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawArea = typeof sp.area === "string" && sp.area.trim() ? sp.area : undefined;

  const locale = await getLocale();
  const t = getMessages(locale);
  const { getStats, getCountsByState, repo } = container();
  const [areas, mapData] = await Promise.all([
    repo.distinctValues("area_conocimiento"),
    buildMexicoMap(),
  ]);
  const area = rawArea && areas.includes(rawArea) ? rawArea : undefined;
  const [stats, stateCounts] = await Promise.all([
    getStats.execute(),
    getCountsByState.execute({ area }),
  ]);

  const counts: Record<string, number> = {};
  for (const s of stateCounts) counts[s.entidad] = s.count;

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">{t.appName}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{t.tagline}</p>
        <div className="flex justify-center gap-3 pt-4">
          <Link
            href="/researchers"
            className="px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium hover:opacity-90"
          >
            {t.nav.researchers}
          </Link>
          <Link
            href="/stats"
            className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            {t.nav.stats}
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{t.map.title}</h2>
            {area && (
              <p className="text-xs text-zinc-500 mt-1">{t.map.showingArea(area)}</p>
            )}
          </div>
          <form className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-400">
                {t.map.filterArea}
              </span>
              <select
                name="area"
                defaultValue={area ?? ""}
                className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-w-[260px]"
              >
                <option value="">{t.map.allAreas}</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm"
            >
              {t.map.apply}
            </button>
            {area && (
              <Link
                href="/"
                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
              >
                {t.map.reset}
              </Link>
            )}
          </form>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <MexicoMap
            width={mapData.width}
            height={mapData.height}
            shapes={mapData.shapes}
            counts={counts}
            hint={t.map.hint}
            area={area}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label={t.stats.total} value={stats.total} />
        {stats.byNivel.slice(0, 4).map((n) => (
          <Stat key={n.value} label={`${t.researcher.level} ${n.value}`} value={n.count} />
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

