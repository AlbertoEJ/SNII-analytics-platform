import type { SnapshotRepository, YearInstitutionCount } from "@/domain/repositories/SnapshotRepository";
export class GetInstitutionsByYear {
  constructor(private readonly repo: SnapshotRepository) {}
  execute(opts: { topN: number }): Promise<YearInstitutionCount[]> {
    return this.repo.institutionsByYear(opts.topN);
  }
}
