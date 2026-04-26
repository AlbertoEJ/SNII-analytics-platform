import "server-only";
import { getReadClient } from "@/infrastructure/supabase/client";
import { SupabaseResearcherRepository } from "@/infrastructure/repositories/SupabaseResearcherRepository";
import { SupabaseSnapshotRepository } from "@/infrastructure/repositories/SupabaseSnapshotRepository";
import { SupabaseIdentityRepository } from "@/infrastructure/repositories/SupabaseIdentityRepository";
import { SearchResearchers } from "@/application/use-cases/SearchResearchers";
import { GetResearcherByCvu } from "@/application/use-cases/GetResearcherByCvu";
import { GetStats } from "@/application/use-cases/GetStats";
import { GetCountsByState } from "@/application/use-cases/GetCountsByState";
import { GetAnalysis } from "@/application/use-cases/GetAnalysis";
import { GetTotalsPerYear } from "@/application/use-cases/GetTotalsPerYear";
import { GetLevelsByYear } from "@/application/use-cases/GetLevelsByYear";
import { GetStatesByYear } from "@/application/use-cases/GetStatesByYear";
import { GetStatesByYearAndArea } from "@/application/use-cases/GetStatesByYearAndArea";
import { GetAreasByYear } from "@/application/use-cases/GetAreasByYear";
import { GetInstitutionsByYear } from "@/application/use-cases/GetInstitutionsByYear";
import { GetNetFlowsByYear } from "@/application/use-cases/GetNetFlowsByYear";
import { GetResearcherTimeline } from "@/application/use-cases/GetResearcherTimeline";
import { GetAvailableYears } from "@/application/use-cases/GetAvailableYears";

function build() {
  const client = getReadClient();
  const repo = new SupabaseResearcherRepository(client);
  const snapshotRepo = new SupabaseSnapshotRepository(client);
  const identityRepo = new SupabaseIdentityRepository(client);
  return {
    repo, snapshotRepo, identityRepo,
    searchResearchers: new SearchResearchers(repo),
    getResearcherByCvu: new GetResearcherByCvu(repo),
    getStats: new GetStats(repo),
    getCountsByState: new GetCountsByState(repo),
    getAnalysis: new GetAnalysis(repo),
    getTotalsPerYear: new GetTotalsPerYear(snapshotRepo),
    getLevelsByYear: new GetLevelsByYear(snapshotRepo),
    getStatesByYear: new GetStatesByYear(snapshotRepo),
    getStatesByYearAndArea: new GetStatesByYearAndArea(snapshotRepo),
    getAreasByYear: new GetAreasByYear(snapshotRepo),
    getInstitutionsByYear: new GetInstitutionsByYear(snapshotRepo),
    getNetFlowsByYear: new GetNetFlowsByYear(snapshotRepo),
    getResearcherTimeline: new GetResearcherTimeline(snapshotRepo),
    getAvailableYears: new GetAvailableYears(snapshotRepo),
  };
}

let instance: ReturnType<typeof build> | null = null;
export function container() {
  if (!instance) instance = build();
  return instance;
}
