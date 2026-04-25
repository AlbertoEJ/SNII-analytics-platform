import type { SnapshotRepository, YearAreaCount } from "@/domain/repositories/SnapshotRepository";
export class GetAreasByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearAreaCount[]> { return this.repo.areasByYear(); }
}
