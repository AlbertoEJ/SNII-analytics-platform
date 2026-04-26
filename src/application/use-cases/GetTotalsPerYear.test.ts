import { describe, it, expect } from "vitest";
import { GetTotalsPerYear } from "./GetTotalsPerYear";
import type { SnapshotRepository } from "@/domain/repositories/SnapshotRepository";

const makeRepo = (totals: { year: number; count: number }[]): SnapshotRepository =>
  ({
    availableYears: async () => [],
    countsByState: async () => [],
    totalsPerYear: async () => totals,
    levelsByYear: async () => [],
    statesByYear: async () => [],
    statesByYearAndArea: async () => [],
    areasByYear: async () => [],
    institutionsByYear: async () => [],
    netFlowsByYear: async () => [],
    timelineFor: async () => [],
  } satisfies SnapshotRepository);

describe("GetTotalsPerYear", () => {
  it("delegates to the repository", async () => {
    const uc = new GetTotalsPerYear(makeRepo([{ year: 1984, count: 1396 }]));
    expect(await uc.execute()).toEqual([{ year: 1984, count: 1396 }]);
  });
});
