import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type { Researcher } from "@/domain/entities/Researcher";
import type {
  AreaDisciplineRow, FacetCounts, InstitutionCount, ResearcherRepository,
  SearchOptions, SearchResult, StateCount, StateLevelRow,
} from "@/domain/repositories/ResearcherRepository";
import { isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

const toNum = (v: unknown): number =>
  typeof v === "string" ? Number.parseInt(v, 10) : (v as number);

interface SnapshotJoinRow {
  canonical_id: number;
  year: number;
  nivel: string | null;
  categoria: string | null;
  area_conocimiento: string | null;
  disciplina: string | null;
  subdisciplina: string | null;
  especialidad: string | null;
  institucion: string | null;
  dependencia: string | null;
  entidad: string | null;
  pais: string | null;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  researchers: { cvu: number | null; canonical_name: string } | null;
}

function mapSnapshotRow(r: SnapshotJoinRow): Researcher {
  return {
    cvu: r.researchers?.cvu ?? r.canonical_id, // fallback to canonical_id when cvu is null
    nombre: r.researchers?.canonical_name ?? "",
    nivel: isValidSniiLevel(r.nivel) ? r.nivel : null,
    categoria: r.categoria,
    fechaInicioVigencia: r.fecha_inicio_vigencia,
    fechaFinVigencia: r.fecha_fin_vigencia,
    areaConocimiento: r.area_conocimiento,
    disciplina: r.disciplina,
    subdisciplina: r.subdisciplina,
    especialidad: r.especialidad,
    cpiS: null,
    institucionAcreditacion: r.institucion,
    dependenciaAcreditacion: r.dependencia,
    subdependenciaAcreditacion: null,
    departamentoAcreditacion: null,
    entidadAcreditacion: r.entidad,
    posdocInvestPorMexico: null,
    institucionComision: null,
    dependenciaComision: null,
    ubicacionComision: null,
    institucionFinal: r.institucion,
    entidadFinal: r.entidad,
    notas: null,
  };
}

export class SupabaseResearcherRepository implements ResearcherRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  /** Default year used when a caller doesn't provide one. Lazy-cached. */
  private latestYear: number | null = null;
  private async resolveYear(year?: number): Promise<number> {
    if (year != null) return year;
    if (this.latestYear != null) return this.latestYear;
    const { data, error } = await this.client.from("researcher_snapshots").select("year").order("year", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    this.latestYear = (data?.year as number | undefined) ?? new Date().getFullYear();
    return this.latestYear;
  }

  async search(opts: SearchOptions): Promise<SearchResult> {
    const year = await this.resolveYear(opts.year);
    let q = this.client.from("researcher_snapshots")
      .select("*, researchers!inner(cvu, canonical_name)", { count: "exact" })
      .eq("year", year)
      .order("canonical_name", { ascending: true, foreignTable: "researchers" })
      .range(opts.offset, opts.offset + opts.limit - 1);
    if (opts.query?.trim()) {
      const tokens = opts.query.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().split(/\s+/).filter(Boolean);
      for (const t of tokens) q = q.ilike("researchers.canonical_name", `%${t}%`);
    }
    if (opts.nivel) q = q.eq("nivel", opts.nivel);
    if (opts.area) q = q.eq("area_conocimiento", opts.area);
    if (opts.entidad) q = q.eq("entidad", opts.entidad);
    if (opts.institucion) q = q.eq("institucion", opts.institucion);
    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    return { items: (data ?? []).map((r) => mapSnapshotRow(r as SnapshotJoinRow)), total: count ?? 0 };
  }

  async findByCvu(cvu: number): Promise<Researcher | null> {
    const year = await this.resolveYear();
    const { data, error } = await this.client.from("researcher_snapshots")
      .select("*, researchers!inner(cvu, canonical_name)")
      .eq("year", year).eq("researchers.cvu", cvu).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSnapshotRow(data as SnapshotJoinRow) : null;
  }

  async facets(year?: number): Promise<FacetCounts> {
    const yr = await this.resolveYear(year);
    const { count: total } = await this.client.from("researcher_snapshots")
      .select("*", { count: "exact", head: true }).eq("year", yr);
    const [byNivel, byArea, byEntidad] = await Promise.all([
      this.groupCountByYear("nivel", yr),
      this.groupCountByYear("area_conocimiento", yr),
      this.groupCountByYear("entidad", yr),
    ]);
    return { byNivel, byArea, byEntidad, total: total ?? 0 };
  }

  async distinctValues(column: "area_conocimiento" | "entidad_final", year?: number): Promise<string[]> {
    const yr = await this.resolveYear(year);
    const dbCol = column === "entidad_final" ? "entidad" : column;
    const facet = await this.groupCountByYear(dbCol, yr);
    return facet.map((f) => f.value);
  }

  async countsByState(filters?: { area?: string; year?: number }): Promise<StateCount[]> {
    const yr = await this.resolveYear(filters?.year);
    const { data, error } = await this.client.rpc("snapshots_counts_by_state", { p_year: yr, p_area: filters?.area ?? null });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ entidad: string; count: number | string }>).map((r) => ({ entidad: r.entidad, count: toNum(r.count) }));
  }

  async crossStateLevel(year?: number): Promise<StateLevelRow[]> {
    const yr = await this.resolveYear(year);
    const { data, error } = await this.client.rpc("snapshots_cross_state_level", { p_year: yr });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, string | number>>).map((r) => ({
      entidad: String(r.entidad), c: toNum(r.c), n1: toNum(r.n1), n2: toNum(r.n2),
      n3: toNum(r.n3), e: toNum(r.e), total: toNum(r.total),
    }));
  }

  async areaDisciplineBreakdown(year?: number): Promise<AreaDisciplineRow[]> {
    const yr = await this.resolveYear(year);
    const all = await this.fetchAllRpcRows<Record<string, string | number>>("snapshots_area_discipline_breakdown", { p_year: yr });
    return all.map((r) => ({
      area: String(r.area), discipline: String(r.discipline),
      subdiscipline: String(r.subdiscipline), count: toNum(r.count),
    }));
  }

  async countsByInstitution(year?: number): Promise<InstitutionCount[]> {
    const yr = await this.resolveYear(year);
    const all = await this.fetchAllRpcRows<Record<string, string | number>>("snapshots_counts_by_institution", { p_year: yr });
    return all.map((r) => ({ institucion: String(r.institucion), count: toNum(r.count) }));
  }

  private async groupCountByYear(column: string, year: number): Promise<Array<{ value: string; count: number }>> {
    const { data, error } = await this.client.rpc("snapshots_counts_by_column", { p_column: column, p_year: year });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ value: string; count: number | string }>).map((r) => ({ value: r.value, count: toNum(r.count) }));
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
