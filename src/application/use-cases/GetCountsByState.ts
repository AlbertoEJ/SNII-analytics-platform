import type { ResearcherRepository, StateCount } from "@/domain/repositories/ResearcherRepository";

export class GetCountsByState {
  constructor(private readonly repo: ResearcherRepository) {}

  execute(filters?: { area?: string }): Promise<StateCount[]> {
    return this.repo.countsByState(filters);
  }
}
