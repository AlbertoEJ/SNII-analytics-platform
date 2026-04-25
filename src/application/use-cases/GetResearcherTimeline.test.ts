import { describe, it, expect } from "vitest";
import { GetResearcherTimeline } from "./GetResearcherTimeline";
import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";
import type { ResearcherSnapshot } from "@/domain/entities/ResearcherSnapshot";

const stub = (snaps: Partial<ResearcherSnapshot>[]): SnapshotRepository =>
  ({
    availableYears: async () => [],
    countsByState: async () => [],
    totalsPerYear: async () => [],
    levelsByYear: async () => [],
    statesByYear: async () => [],
    areasByYear: async () => [],
    institutionsByYear: async () => [],
    netFlowsByYear: async () => [],
    timelineFor: async () => snaps as ResearcherSnapshot[],
  } satisfies SnapshotRepository);

describe("GetResearcherTimeline", () => {
  it("returns snapshots ordered by year (repo guarantees this)", async () => {
    const uc = new GetResearcherTimeline(stub([
      { canonicalId: 1, year: 2010, nivel: "1" },
      { canonicalId: 1, year: 2011, nivel: "1" },
    ]));
    const out = await uc.execute(1);
    expect(out.map((s) => s.year)).toEqual([2010, 2011]);
  });

  it("returns empty array if researcher has no snapshots", async () => {
    const uc = new GetResearcherTimeline(stub([]));
    expect(await uc.execute(99)).toEqual([]);
  });
});
