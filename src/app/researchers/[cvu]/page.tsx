import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVEL_LABELS } from "@/domain/value-objects/SniiLevel";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cvu: string }>;
}): Promise<Metadata> {
  const { cvu: cvuStr } = await params;
  if (!/^\d+$/.test(cvuStr)) return { title: "Investigador" };
  const r = await container().getResearcherByCvu.execute(Number.parseInt(cvuStr, 10));
  if (!r) return { title: "Investigador no encontrado" };

  const levelLabel = r.nivel ? SNII_LEVEL_LABELS[r.nivel].es : null;
  const description = [r.areaConocimiento, r.institucionFinal, r.entidadFinal]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${r.nombre}${levelLabel ? ` · ${levelLabel}` : ""} · SNII`,
    description: description || `Investigador SNII (CVU ${r.cvu})`,
  };
}

export default async function ResearcherDetailPage({
  params,
}: {
  params: Promise<{ cvu: string }>;
}) {
  const { cvu: cvuStr } = await params;
  if (!/^\d+$/.test(cvuStr)) notFound();
  const cvu = Number.parseInt(cvuStr, 10);

  const locale = await getLocale();
  const t = getMessages(locale);
  const researcher = await container().getResearcherByCvu.execute(cvu);
  if (!researcher) notFound();

  const r = researcher;
  const dateFmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(locale === "es" ? "es-MX" : "en-US") : "—";

  const rows: Array<[string, string | null]> = [
    [t.researcher.cvu, String(r.cvu)],
    [t.researcher.level, r.nivel ? SNII_LEVEL_LABELS[r.nivel][locale] : null],
    [t.researcher.category, r.categoria],
    [t.researcher.validity, `${dateFmt(r.fechaInicioVigencia)} — ${dateFmt(r.fechaFinVigencia)}`],
    [t.researcher.area, r.areaConocimiento],
    [t.researcher.discipline, r.disciplina],
    [t.researcher.subdiscipline, r.subdisciplina],
    [t.researcher.specialty, r.especialidad],
    [t.researcher.institution, r.institucionFinal ?? r.institucionAcreditacion],
    [t.researcher.department, r.dependenciaAcreditacion],
    [t.researcher.state, r.entidadFinal ?? r.entidadAcreditacion],
    [t.researcher.cpis, r.cpiS],
  ];

  return (
    <article className="space-y-6 max-w-3xl mx-auto">
      <Link href="/researchers" className="text-sm text-zinc-500 hover:underline">
        {t.researcher.backToList}
      </Link>
      <header>
        <h1 className="text-3xl font-semibold">{r.nombre}</h1>
        {r.nivel && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-medium">
            {SNII_LEVEL_LABELS[r.nivel][locale]}
          </span>
        )}
      </header>
      <dl className="grid sm:grid-cols-[200px_1fr] gap-x-6 gap-y-3 text-sm bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-zinc-500">{k}</dt>
            <dd className="font-medium">{v && v.trim() ? v : "—"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
