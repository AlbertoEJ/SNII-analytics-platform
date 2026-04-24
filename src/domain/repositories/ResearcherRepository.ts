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

export interface ResearcherRepository {
  search(opts: SearchOptions): Promise<SearchResult>;
  findByCvu(cvu: number): Promise<Researcher | null>;
  facets(): Promise<FacetCounts>;
  distinctValues(column: "area_conocimiento" | "entidad_final"): Promise<string[]>;
  countsByState(filters?: { area?: string }): Promise<StateCount[]>;
}
