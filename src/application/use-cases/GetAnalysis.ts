import type { AreaDisciplineRow, InstitutionCount, ResearcherRepository, StateLevelRow } from "@/domain/repositories/ResearcherRepository";

export class GetAnalysis {
  constructor(private readonly repo: ResearcherRepository) {}

  crossStateLevel(year?: number): Promise<StateLevelRow[]> { return this.repo.crossStateLevel(year); }
  areaDisciplineBreakdown(year?: number): Promise<AreaDisciplineRow[]> { return this.repo.areaDisciplineBreakdown(year); }
  countsByInstitution(year?: number): Promise<InstitutionCount[]> { return this.repo.countsByInstitution(year); }
}
