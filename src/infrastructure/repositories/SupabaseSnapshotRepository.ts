import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type {
  SnapshotRepository, YearTotal, YearLevelCount, YearStateCount,
  YearAreaCount, YearInstitutionCount, YearNetFlow, YearStateCountFiltered,
} from "@/domain/repositories/SnapshotRepository";
import type { ResearcherSnapshot } from "@/domain/entities/ResearcherSnapshot";
import { isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

const toNum = (v: unknown): number =>
  typeof v === "string" ? Number.parseInt(v, 10) : (v as number);

export class SupabaseSnapshotRepository implements SnapshotRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  async availableYears(): Promise<number[]> {
    const all = await this.fetchAllRpcRows<{ year: number }>("snapshots_available_years");
    return all.map((r) => toNum(r.year));
  }

  async countsByState(year: number, filters?: { area?: string }): Promise<YearStateCountFiltered[]> {
    const { data, error } = await this.client.rpc("snapshots_counts_by_state", {
      p_year: year,
      p_area: filters?.area ?? null,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ entidad: string; count: number | string }>).map((r) => ({
      entidad: r.entidad,
      count: toNum(r.count),
    }));
  }

  async totalsPerYear(): Promise<YearTotal[]> {
    const all = await this.fetchAllRpcRows<{ year: number; count: number | string }>("snapshots_totals_per_year");
    return all.map((r) => ({ year: toNum(r.year), count: toNum(r.count) }));
  }

  async levelsByYear(): Promise<YearLevelCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; nivel: string; count: number | string }>("snapshots_levels_by_year");
    return all.map((r) => ({ year: toNum(r.year), nivel: r.nivel, count: toNum(r.count) }));
  }

  async statesByYear(): Promise<YearStateCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; entidad: string; count: number | string }>("snapshots_states_by_year");
    return all.map((r) => ({ year: toNum(r.year), entidad: r.entidad, count: toNum(r.count) }));
  }

  async areasByYear(): Promise<YearAreaCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; area: string; count: number | string }>("snapshots_areas_by_year");
    return all.map((r) => ({ year: toNum(r.year), area: r.area, count: toNum(r.count) }));
  }

  async institutionsByYear(topN: number): Promise<YearInstitutionCount[]> {
    const all = await this.fetchAllRpcRows<{ year: number; institucion: string; count: number | string; rank: number | string }>(
      "snapshots_institutions_by_year", { p_top_n: topN }
    );
    return all.map((r) => ({
      year: toNum(r.year), institucion: r.institucion, count: toNum(r.count), rank: toNum(r.rank),
    }));
  }

  async netFlowsByYear(): Promise<YearNetFlow[]> {
    const all = await this.fetchAllRpcRows<{ year: number; entrants: number | string; departures: number | string }>("snapshots_net_flows_by_year");
    return all.map((r) => ({ year: toNum(r.year), entrants: toNum(r.entrants), departures: toNum(r.departures) }));
  }

  async timelineFor(canonicalId: number): Promise<ResearcherSnapshot[]> {
    const { data, error } = await this.client.rpc("snapshots_timeline_for", { p_canonical_id: canonicalId });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const rawNivel = r.nivel as string | null | undefined;
      return {
        canonicalId,
        year: toNum(r.year),
        nivel: isValidSniiLevel(rawNivel) ? rawNivel : null,
        categoria: (r.categoria as string | null) ?? null,
        areaConocimiento: (r.area_conocimiento as string | null) ?? null,
        disciplina: (r.disciplina as string | null) ?? null,
        subdisciplina: (r.subdisciplina as string | null) ?? null,
        especialidad: (r.especialidad as string | null) ?? null,
        institucion: (r.institucion as string | null) ?? null,
        dependencia: (r.dependencia as string | null) ?? null,
        entidad: (r.entidad as string | null) ?? null,
        pais: (r.pais as string | null) ?? null,
        fechaInicioVigencia: (r.fecha_inicio_vigencia as string | null) ?? null,
        fechaFinVigencia: (r.fecha_fin_vigencia as string | null) ?? null,
        sourceFile: (r.source_file as string) ?? "",
      };
    });
  }

  private async fetchAllRpcRows<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
    const pageSize = 1000;
    const out: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client.rpc(fn, args ?? {}).range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as T[];
      out.push(...page);
      if (page.length < pageSize) break;
    }
    return out;
  }
}
