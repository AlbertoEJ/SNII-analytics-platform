import type { ResearcherRepository, SearchOptions, SearchResult } from "@/domain/repositories/ResearcherRepository";

export class SearchResearchers {
  constructor(private readonly repo: ResearcherRepository) {}

  execute(opts: SearchOptions): Promise<SearchResult> {
    const limit = Math.min(Math.max(opts.limit, 1), 100);
    const offset = Math.max(opts.offset, 0);
    return this.repo.search({ ...opts, limit, offset });
  }
}
