import type { FacetCounts, ResearcherRepository } from "@/domain/repositories/ResearcherRepository";

export class GetStats {
  constructor(private readonly repo: ResearcherRepository) {}

  execute(opts?: { year?: number }): Promise<FacetCounts> { return this.repo.facets(opts?.year); }
}
