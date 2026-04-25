import type { SnapshotRepository, YearNetFlow } from "@/domain/repositories/SnapshotRepository";
export class GetNetFlowsByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearNetFlow[]> { return this.repo.netFlowsByYear(); }
}
