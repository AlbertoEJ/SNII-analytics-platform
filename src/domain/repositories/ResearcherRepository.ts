import type { Researcher } from "../entities/Researcher";
import type { SniiLevelCode } from "../value-objects/SniiLevel";

export interface SearchFilters {
  query?: string;
  nivel?: SniiLevelCode;
  area?: string;
  entidad?: string;
  institucion?: string;
}

export interface SearchOptions extends SearchFilters {
  year?: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  items: Researcher[];
  total: number;
}

export interface FacetCounts {
  byNivel: Array<{ value: string; count: number }>;
  byArea: Array<{ value: string; count: number }>;
  byEntidad: Array<{ value: string; count: number }>;
  total: number;
}

export interface StateCount {
  entidad: string;
  count: number;
}

export interface StateLevelRow {
  entidad: string;
  c: number;
  n1: number;
  n2: number;
  n3: number;
  e: number;
  total: number;
}

export interface AreaDisciplineRow {
  area: string;
  discipline: string;
  subdiscipline: string;
  count: number;
}

export interface InstitutionCount {
  institucion: string;
  count: number;
}

export interface ResearcherRepository {
  search(opts: SearchOptions): Promise<SearchResult>;
  findByCvu(cvu: number): Promise<Researcher | null>;
  facets(year?: number): Promise<FacetCounts>;
  distinctValues(column: "area_conocimiento" | "entidad_final", year?: number): Promise<string[]>;
  countsByState(filters?: { area?: string; year?: number }): Promise<StateCount[]>;
  crossStateLevel(year?: number): Promise<StateLevelRow[]>;
  areaDisciplineBreakdown(year?: number): Promise<AreaDisciplineRow[]>;
  countsByInstitution(year?: number): Promise<InstitutionCount[]>;
}
