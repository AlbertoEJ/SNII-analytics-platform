import type { SnapshotRepository, YearStateCount } from "@/domain/repositories/SnapshotRepository";
export class GetStatesByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<YearStateCount[]> { return this.repo.statesByYear(); }
}
