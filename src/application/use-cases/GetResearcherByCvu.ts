import type { Researcher } from "@/domain/entities/Researcher";
import type { ResearcherRepository } from "@/domain/repositories/ResearcherRepository";

export class GetResearcherByCvu {
  constructor(private readonly repo: ResearcherRepository) {}

  execute(cvu: number): Promise<Researcher | null> {
    return this.repo.findByCvu(cvu);
  }
}
