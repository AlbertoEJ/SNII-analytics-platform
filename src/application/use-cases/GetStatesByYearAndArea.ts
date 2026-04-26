import type { SnapshotRepository, YearStateAreaCount } from "@/domain/repositories/SnapshotRepository";
export class GetStatesByYearAndArea {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearStateAreaCount[]> { return this.repo.statesByYearAndArea(); }
}
