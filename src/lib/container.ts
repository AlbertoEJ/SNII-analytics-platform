import "server-only";
import { getReadClient } from "@/infrastructure/supabase/client";
import { SupabaseResearcherRepository } from "@/infrastructure/repositories/SupabaseResearcherRepository";
import { SearchResearchers } from "@/application/use-cases/SearchResearchers";
import { GetResearcherByCvu } from "@/application/use-cases/GetResearcherByCvu";
import { GetStats } from "@/application/use-cases/GetStats";
import { GetCountsByState } from "@/application/use-cases/GetCountsByState";
import { GetAnalysis } from "@/application/use-cases/GetAnalysis";

function build() {
  const repo = new SupabaseResearcherRepository(getReadClient());
  return {
    repo,
    searchResearchers: new SearchResearchers(repo),
    getResearcherByCvu: new GetResearcherByCvu(repo),
    getStats: new GetStats(repo),
    getCountsByState: new GetCountsByState(repo),
    getAnalysis: new GetAnalysis(repo),
  };
}

let instance: ReturnType<typeof build> | null = null;
export function container() {
  if (!instance) instance = build();
  return instance;
}
