import type { SnapshotRepository, YearTotal } from "@/domain/repositories/SnapshotRepository";

export class GetTotalsPerYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearTotal[]> { return this.repo.totalsPerYear(); }
}
