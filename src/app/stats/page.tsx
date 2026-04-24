import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVEL_LABELS, isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

export const revalidate = 3600;

export default async function StatsPage() {
  const locale = await getLocale();
  const t = getMessages(locale);
  const stats = await container().getStats.execute();

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t.stats.title}</h1>
        <p className="text-sm text-zinc-500">
          {t.stats.total}: <span className="font-medium tabular-nums">{stats.total.toLocaleString()}</span>
        </p>
      </header>

      <Section title={t.stats.byLevel}>
        <Bars
          items={stats.byNivel.map((n) => ({
            label: isValidSniiLevel(n.value) ? SNII_LEVEL_LABELS[n.value][locale] : n.value,
            count: n.count,
          }))}
          total={stats.total}
        />
      </Section>

      <Section title={t.stats.byArea}>
        <Bars items={stats.byArea.map((a) => ({ label: a.value, count: a.count }))} total={stats.total} />
      </Section>

      <Section title={t.stats.byState}>
        <Bars items={stats.byEntidad.slice(0, 32).map((e) => ({ label: e.value, count: e.count }))} total={stats.total} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Bars({ items, total }: { items: Array<{ label: string; count: number }>; total: number }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((i) => {
        const pct = (i.count / max) * 100;
        const labelInside = pct >= 35;
        return (
          <li key={i.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
            <div className="relative h-6 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-zinc-900 dark:bg-white"
                style={{ width: `${pct}%` }}
              />
              <span
                className={`absolute inset-y-0 flex items-center px-2 text-xs whitespace-nowrap ${
                  labelInside
                    ? "left-0 text-white dark:text-zinc-900"
                    : "left-full ml-2 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {i.label}
              </span>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums whitespace-nowrap">
              {i.count.toLocaleString()} · {((i.count / total) * 100).toFixed(1)}%
            </div>
          </li>
        );
      })}
    </ul>
  );
}
