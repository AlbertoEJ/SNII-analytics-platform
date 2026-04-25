import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
import { CareerTimeline } from "@/presentation/components/researcher/CareerTimeline";
import { formatName, nameInitials } from "@/lib/formatName";

export const revalidate = 3600;

const GLOBALLY_MISSING_YEARS = [2021];

async function resolveIdentity(c: ReturnType<typeof container>, id: string) {
  if (/^\d+$/.test(id)) return c.identityRepo.findByCvu(Number.parseInt(id, 10));
  const m = id.match(/^c-(\d+)$/);
  if (m) return c.identityRepo.findByCanonicalId(Number.parseInt(m[1], 10));
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = container();
  const identity = await resolveIdentity(c, id);
  if (!identity) return { title: "Investigador no encontrado" };
  const timeline = await c.getResearcherTimeline.execute(identity.canonicalId);
  const latest = timeline.at(-1);
  const levelLabel = latest?.nivel ? SNII_LEVEL_LABELS[latest.nivel].es : null;
  const description = [latest?.areaConocimiento, latest?.institucion, latest?.entidad]
    .filter(Boolean)
    .join(" · ");
  return {
    title: `${formatName(identity.canonicalName)}${levelLabel ? ` · ${levelLabel}` : ""} · SNII`,
    description: description || `Investigador SNII (CVU ${identity.cvu ?? "—"})`,
  };
}

export default async function ResearcherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getMessages(locale);
  const c = container();
  const identity = await resolveIdentity(c, id);
  if (!identity) notFound();

  const timeline = await c.getResearcherTimeline.execute(identity.canonicalId);
  const latest = timeline.at(-1);

  const dateFmt = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(locale === "es" ? "es-MX" : "en-US") : null;

  const inicio = dateFmt(latest?.fechaInicioVigencia);
  const fin = dateFmt(latest?.fechaFinVigencia);
  const isActive = latest?.fechaFinVigencia ? new Date(latest.fechaFinVigencia) >= new Date() : true;

  const institucion = latest?.institucion ?? null;
  const entidad = latest?.entidad ?? null;
  const entidadDisplay = entidad
    ? Object.entries(STATE_CODE_TO_DB_NAME).find(([, v]) => v === entidad)?.[0]
    : undefined;
  const entidadLabel = entidadDisplay
    ? STATE_DISPLAY_NAME[Number(entidadDisplay)]
    : entidad ?? "—";

  const initials = nameInitials(identity.canonicalName);
  const displayName = formatName(identity.canonicalName);

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
                  <span className="tabular-nums">CVU {identity.cvu ?? "—"}</span>
                  {latest?.categoria && (
                    <>
                      <Separator orientation="vertical" className="!h-3" />
                      <span>{latest.categoria}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {latest?.nivel && <LevelBadge level={latest.nivel} locale={locale} />}
                {latest?.areaConocimiento && (
                  <Badge variant="secondary" className="font-normal">
                    {latest.areaConocimiento}
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

      {/* Ambiguity banner */}
      {identity.ambiguous && (
        <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-900 dark:text-amber-100">{t.researcher.ambiguous}</p>
          </CardContent>
        </Card>
      )}

      {/* Career timeline */}
      <Card className="py-0">
        <CardContent className="p-4">
          <CareerTimeline
            snapshots={timeline.map((s) => ({ year: s.year, nivel: s.nivel }))}
            globallyMissingYears={GLOBALLY_MISSING_YEARS}
            locale={locale}
            strings={{
              title: t.researcher.timeline.title,
              activeRange: t.researcher.timeline.active,
              legend: t.researcher.timeline.legend,
              unknownLevel: t.researcher.timeline.unknownLevel,
              yearGap: t.researcher.timeline.yearGap,
            }}
          />
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
          <Row label={t.researcher.area} value={latest?.areaConocimiento ?? null} />
          <Row label={t.researcher.discipline} value={latest?.disciplina ?? null} />
          <Row label={t.researcher.subdiscipline} value={latest?.subdisciplina ?? null} />
          <Row label={t.researcher.specialty} value={latest?.especialidad ?? null} />
        </InfoCard>

        <InfoCard title={t.researcher.affiliation}>
          <Row label={t.researcher.institution} value={institucion} />
          <Row label={t.researcher.department} value={latest?.dependencia ?? null} />
          <Row label={t.researcher.state} value={entidadLabel === "—" ? null : entidadLabel} />
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
          {latest?.areaConocimiento && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/researchers?area=${encodeURIComponent(latest.areaConocimiento)}`}>
                  {t.researcher.othersFromArea}
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>
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
