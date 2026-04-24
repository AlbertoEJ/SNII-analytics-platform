import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { container } from "@/lib/container";
import { SNII_LEVEL_LABELS } from "@/domain/value-objects/SniiLevel";
import { STATE_DISPLAY_NAME, STATE_CODE_TO_DB_NAME } from "@/lib/mexico/stateNameMap";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LevelBadge } from "@/presentation/components/LevelBadge";
import { formatName, nameInitials } from "@/lib/formatName";

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
    title: `${formatName(r.nombre)}${levelLabel ? ` · ${levelLabel}` : ""} · SNII`,
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
  const r = await container().getResearcherByCvu.execute(cvu);
  if (!r) notFound();

  const dateFmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(locale === "es" ? "es-MX" : "en-US") : null;

  const inicio = dateFmt(r.fechaInicioVigencia);
  const fin = dateFmt(r.fechaFinVigencia);
  const isActive = r.fechaFinVigencia ? new Date(r.fechaFinVigencia) >= new Date() : true;

  const institucion = r.institucionFinal ?? r.institucionAcreditacion;
  const entidad = r.entidadFinal ?? r.entidadAcreditacion;
  const entidadDisplay = entidad
    ? Object.entries(STATE_CODE_TO_DB_NAME).find(([, v]) => v === entidad)?.[0]
    : undefined;
  const entidadLabel = entidadDisplay
    ? STATE_DISPLAY_NAME[Number(entidadDisplay)]
    : entidad ?? "—";

  const initials = nameInitials(r.nombre);
  const displayName = formatName(r.nombre);

  return (
    <article className="space-y-5 max-w-5xl mx-auto">
      {/* Back link */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="h-7 px-2 -ml-2 text-xs text-muted-foreground"
          render={
            <Link href="/researchers">
              <span aria-hidden className="mr-1">←</span>
              {t.researcher.backToList}
            </Link>
          }
        />
      </div>

      {/* Hero card */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-5">
            <span
              aria-hidden
              className="grid place-items-center w-16 h-16 rounded-2xl bg-foreground text-background text-xl font-semibold shrink-0"
            >
              {initials || "?"}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">CVU {r.cvu}</span>
                  {r.categoria && (
                    <>
                      <Separator orientation="vertical" className="!h-3" />
                      <span>{r.categoria}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.nivel && <LevelBadge level={r.nivel} locale={locale} />}
                {r.areaConocimiento && (
                  <Badge variant="secondary" className="font-normal">
                    {r.areaConocimiento}
                  </Badge>
                )}
                {entidad && (
                  <Badge variant="outline" className="font-normal">
                    {entidadLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vigencia banner */}
      {(inicio || fin) && (
        <Card className="py-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`}
              />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t.researcher.validity}
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {inicio ?? "—"} <span className="text-muted-foreground">→</span> {fin ?? "—"}
                </div>
              </div>
            </div>
            {fin && (
              <Badge variant={isActive ? "secondary" : "outline"} className="font-normal">
                {isActive ? t.researcher.validUntil(fin) : t.researcher.expiredOn(fin)}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Two-column info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title={t.researcher.academic}>
          <Row label={t.researcher.area} value={r.areaConocimiento} />
          <Row label={t.researcher.discipline} value={r.disciplina} />
          <Row label={t.researcher.subdiscipline} value={r.subdisciplina} />
          <Row label={t.researcher.specialty} value={r.especialidad} />
        </InfoCard>

        <InfoCard title={t.researcher.affiliation}>
          <Row label={t.researcher.institution} value={institucion} />
          <Row label={t.researcher.department} value={r.dependenciaAcreditacion} />
          <Row label={t.researcher.subDepartment} value={r.subdependenciaAcreditacion} />
          <Row label={t.researcher.departmentSection} value={r.departamentoAcreditacion} />
          <Row label={t.researcher.state} value={entidadLabel === "—" ? null : entidadLabel} />
          <Row label={t.researcher.cpis} value={r.cpiS ? t.researcher.isCpis : null} />
        </InfoCard>
      </div>

      {/* Actions */}
      <Card className="py-0">
        <CardHeader className="py-3 border-b">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t.researcher.actions}
          </span>
        </CardHeader>
        <CardContent className="p-3 flex flex-wrap gap-2">
          {entidad && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/?entidad=${encodeURIComponent(entidad)}`}>
                  {t.researcher.viewOnMap}
                </Link>
              }
            />
          )}
          {entidad && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/researchers?entidad=${encodeURIComponent(entidad)}`}>
                  {t.researcher.othersFromState}
                </Link>
              }
            />
          )}
          {r.areaConocimiento && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/researchers?area=${encodeURIComponent(r.areaConocimiento)}`}>
                  {t.researcher.othersFromArea}
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Notes (often present in the padron) */}
      {r.notas && r.notas.trim() && (
        <Card className="py-0">
          <CardHeader className="py-3 border-b">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.researcher.notes}
            </span>
          </CardHeader>
          <CardContent className="p-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto">
            {r.notas}
          </CardContent>
        </Card>
      )}
    </article>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="py-0">
      <CardHeader className="py-3 border-b">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</span>
      </CardHeader>
      <CardContent className="p-0">
        <dl className="divide-y">{children}</dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words min-w-0">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
