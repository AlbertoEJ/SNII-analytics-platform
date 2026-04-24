import type {
  AreaDisciplineRow,
  InstitutionCount,
  ResearcherRepository,
  StateLevelRow,
} from "@/domain/repositories/ResearcherRepository";

export class GetAnalysis {
  constructor(private readonly repo: ResearcherRepository) {}

  crossStateLevel(): Promise<StateLevelRow[]> {
    return this.repo.crossStateLevel();
  }

  areaDisciplineBreakdown(): Promise<AreaDisciplineRow[]> {
    return this.repo.areaDisciplineBreakdown();
  }

  countsByInstitution(): Promise<InstitutionCount[]> {
    return this.repo.countsByInstitution();
  }
}
