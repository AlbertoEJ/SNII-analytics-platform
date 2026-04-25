import type { ResearcherIdentity } from "../entities/ResearcherIdentity";

export interface IdentityRepository {
  findByCanonicalId(id: number): Promise<ResearcherIdentity | null>;
  findByCvu(cvu: number): Promise<ResearcherIdentity | null>;
  search(query: string, opts: { year?: number; limit: number; offset: number }): Promise<ResearcherIdentity[]>;
}
