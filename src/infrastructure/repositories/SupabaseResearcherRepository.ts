import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type { Researcher } from "@/domain/entities/Researcher";
import type {
  AreaDisciplineRow,
  FacetCounts,
  InstitutionCount,
  ResearcherRepository,
  SearchOptions,
  SearchResult,
  StateCount,
  StateLevelRow,
} from "@/domain/repositories/ResearcherRepository";
import { isValidSniiLevel } from "@/domain/value-objects/SniiLevel";

type Row = {
  cvu: number;
  nombre: string;
  nivel: string | null;
  categoria: string | null;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  area_conocimiento: string | null;
  disciplina: string | null;
  subdisciplina: string | null;
  especialidad: string | null;
  cpi_s: string | null;
  institucion_acreditacion: string | null;
  dependencia_acreditacion: string | null;
  subdependencia_acreditacion: string | null;
  departamento_acreditacion: string | null;
  entidad_acreditacion: string | null;
  posdoc_invest_por_mexico: string | null;
  institucion_comision: string | null;
  dependencia_comision: string | null;
  ubicacion_comision: string | null;
  institucion_final: string | null;
  entidad_final: string | null;
  notas: string | null;
};

function toNum(v: unknown): number {
  return typeof v === "string" ? Number.parseInt(v, 10) : (v as number);
}

function mapRow(r: Row): Researcher {
  return {
    cvu: r.cvu,
    nombre: r.nombre,
    nivel: isValidSniiLevel(r.nivel) ? r.nivel : null,
    categoria: r.categoria,
    fechaInicioVigencia: r.fecha_inicio_vigencia,
    fechaFinVigencia: r.fecha_fin_vigencia,
    areaConocimiento: r.area_conocimiento,
    disciplina: r.disciplina,
    subdisciplina: r.subdisciplina,
    especialidad: r.especialidad,
    cpiS: r.cpi_s,
    institucionAcreditacion: r.institucion_acreditacion,
    dependenciaAcreditacion: r.dependencia_acreditacion,
    subdependenciaAcreditacion: r.subdependencia_acreditacion,
    departamentoAcreditacion: r.departamento_acreditacion,
    entidadAcreditacion: r.entidad_acreditacion,
    posdocInvestPorMexico: r.posdoc_invest_por_mexico,
    institucionComision: r.institucion_comision,
    dependenciaComision: r.dependencia_comision,
    ubicacionComision: r.ubicacion_comision,
    institucionFinal: r.institucion_final,
    entidadFinal: r.entidad_final,
    notas: r.notas,
  };
}

export class SupabaseResearcherRepository implements ResearcherRepository {
  constructor(private readonly client: SnSupabaseClient) {}

  async search(opts: SearchOptions): Promise<SearchResult> {
    let q = this.client
      .from("researchers")
      .select("*", { count: "exact" })
      .order("nombre", { ascending: true })
      .range(opts.offset, opts.offset + opts.limit - 1);

    if (opts.query?.trim()) {
      // Tokenize on whitespace and AND the tokens, so "Marco Antonio Moreno"
      // matches "MORENO ARMENDARIZ, MARCO ANTONIO" (different order, with comma).
      // Strip accents client-side and search against the indexed nombre_unaccent
      // generated column for accent-insensitive matching.
      const tokens = opts.query
        .trim()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .split(/\s+/)
        .map((t) => t.replace(/[\\%_]/g, (c) => `\\${c}`))
        .filter(Boolean);
      for (const t of tokens) {
        q = q.ilike("nombre_unaccent", `%${t}%`);
      }
    }
    if (opts.nivel) q = q.eq("nivel", opts.nivel);
    if (opts.area) q = q.eq("area_conocimiento", opts.area);
    if (opts.entidad) q = q.eq("entidad_final", opts.entidad);
    if (opts.institucion) q = q.eq("institucion_final", opts.institucion);

    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    return {
      items: (data ?? []).map((r) => mapRow(r as Row)),
      total: count ?? 0,
    };
  }

  async findByCvu(cvu: number): Promise<Researcher | null> {
    const { data, error } = await this.client
      .from("researchers")
      .select("*")
      .eq("cvu", cvu)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as Row) : null;
  }

  async facets(): Promise<FacetCounts> {
    const { count: total } = await this.client
      .from("researchers")
      .select("*", { count: "exact", head: true });

    const [byNivel, byArea, byEntidad] = await Promise.all([
      this.groupCount("nivel"),
      this.groupCount("area_conocimiento"),
      this.groupCount("entidad_final"),
    ]);

    return { byNivel, byArea, byEntidad, total: total ?? 0 };
  }

  async distinctValues(column: "area_conocimiento" | "entidad_final"): Promise<string[]> {
    const facet = await this.groupCount(column);
    return facet.map((f) => f.value);
  }

  async crossStateLevel(): Promise<StateLevelRow[]> {
    const { data, error } = await this.client.rpc("cross_state_level");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, string | number>>).map((r) => ({
      entidad: String(r.entidad),
      c: toNum(r.c),
      n1: toNum(r.n1),
      n2: toNum(r.n2),
      n3: toNum(r.n3),
      e: toNum(r.e),
      total: toNum(r.total),
    }));
  }

  async areaDisciplineBreakdown(): Promise<AreaDisciplineRow[]> {
    // PostgREST caps RPC responses at the configured max-rows (default 1000).
    // The breakdown returns ~4k rows; pull the full set in pages and concatenate.
    const all = await this.fetchAllRpcRows<Record<string, string | number>>("area_discipline_breakdown");
    return all.map((r) => ({
      area: String(r.area),
      discipline: String(r.discipline),
      subdiscipline: String(r.subdiscipline),
      count: toNum(r.count),
    }));
  }

  async countsByInstitution(): Promise<InstitutionCount[]> {
    const all = await this.fetchAllRpcRows<Record<string, string | number>>("counts_by_institution");
    return all.map((r) => ({
      institucion: String(r.institucion),
      count: toNum(r.count),
    }));
  }

  private async fetchAllRpcRows<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
    const pageSize = 1000;
    const out: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client
        .rpc(fn, args ?? {})
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as T[];
      out.push(...page);
      if (page.length < pageSize) break;
    }
    return out;
  }

  async countsByState(filters?: { area?: string }): Promise<StateCount[]> {
    const { data, error } = await this.client.rpc("researchers_by_state", {
      p_area: filters?.area ?? null,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ entidad: string; count: number | string }>).map((r) => ({
      entidad: r.entidad,
      count: typeof r.count === "string" ? Number.parseInt(r.count, 10) : r.count,
    }));
  }

  private async groupCount(column: string): Promise<Array<{ value: string; count: number }>> {
    const { data, error } = await this.client.rpc("researcher_counts_by_column", {
      p_column: column,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ value: string; count: number | string }>).map((r) => ({
      value: r.value,
      count: typeof r.count === "string" ? Number.parseInt(r.count, 10) : r.count,
    }));
  }
}
