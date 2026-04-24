import type { SnSupabaseClient } from "@/infrastructure/supabase/client";
import type { Researcher } from "@/domain/entities/Researcher";
import type {
  FacetCounts,
  ResearcherRepository,
  SearchOptions,
  SearchResult,
  StateCount,
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
      q = q.ilike("nombre", `%${opts.query.trim()}%`);
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
