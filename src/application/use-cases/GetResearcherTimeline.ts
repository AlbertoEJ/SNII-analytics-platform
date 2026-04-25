import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";
import type { ResearcherSnapshot } from "@/domain/entities/ResearcherSnapshot";

export class GetResearcherTimeline {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(canonicalId: number): Promise<ResearcherSnapshot[]> {
    return this.repo.timelineFor(canonicalId);
  }
}
