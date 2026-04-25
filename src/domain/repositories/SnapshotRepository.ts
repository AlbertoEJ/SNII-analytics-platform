import type { ResearcherSnapshot } from "../entities/ResearcherSnapshot";

export interface YearTotal { year: number; count: number }
export interface YearLevelCount { year: number; nivel: string; count: number }
export interface YearStateCount { year: number; entidad: string; count: number }
export interface YearAreaCount { year: number; area: string; count: number }
export interface YearInstitutionCount { year: number; institucion: string; count: number; rank: number }
export interface YearNetFlow { year: number; entrants: number; departures: number }
export interface YearStateCountFiltered { entidad: string; count: number }

export interface SnapshotRepository {
  availableYears(): Promise<number[]>;
  countsByState(year: number, filters?: { area?: string }): Promise<YearStateCountFiltered[]>;
  totalsPerYear(): Promise<YearTotal[]>;
  levelsByYear(): Promise<YearLevelCount[]>;
  statesByYear(): Promise<YearStateCount[]>;
  areasByYear(): Promise<YearAreaCount[]>;
  institutionsByYear(topN: number): Promise<YearInstitutionCount[]>;
  netFlowsByYear(): Promise<YearNetFlow[]>;
  timelineFor(canonicalId: number): Promise<ResearcherSnapshot[]>;
}
