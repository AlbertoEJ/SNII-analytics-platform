import type { SnapshotRepository, YearLevelCount } from "@/domain/repositories/SnapshotRepository";
export class GetLevelsByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearLevelCount[]> { return this.repo.levelsByYear(); }
}
