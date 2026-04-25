import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";
export class GetAvailableYears {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(): Promise<number[]> { return this.repo.availableYears(); }
}
