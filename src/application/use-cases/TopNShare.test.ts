import { describe, it, expect } from "vitest";
import { topNShare } from "./TopNShare";

describe("topNShare", () => {
  const items = [
    { label: "CDMX", count: 8000 },
    { label: "Jalisco", count: 4000 },
    { label: "Nuevo León", count: 3000 },
    { label: "Puebla", count: 2000 },
    { label: "Querétaro", count: 1000 },
    { label: "Other", count: 2000 },
  ];

  it("returns top-N entities, their combined count, and share of total", () => {
    const result = topNShare(items, 3);
    expect(result.n).toBe(3);
    expect(result.total).toBe(20000);
    expect(result.topCount).toBe(15000);
    expect(result.share).toBeCloseTo(0.75, 5);
    expect(result.entities.map((e) => e.label)).toEqual([
      "CDMX",
      "Jalisco",
      "Nuevo León",
    ]);
  });

  it("handles n greater than list length by capping at list length", () => {
    const result = topNShare(items, 10);
    expect(result.n).toBe(items.length);
    expect(result.topCount).toBe(20000);
    expect(result.share).toBeCloseTo(1, 5);
  });

  it("returns zeros and empty entities for an empty list", () => {
    const result = topNShare([], 5);
    expect(result).toEqual({ n: 0, total: 0, topCount: 0, share: 0, entities: [] });
  });

  it("does not mutate the input array", () => {
    const input = [
      { label: "B", count: 1 },
      { label: "A", count: 2 },
    ];
    const snapshot = [...input];
    topNShare(input, 1);
    expect(input).toEqual(snapshot);
    expect(input[0]).toBe(snapshot[0]);
    expect(input[1]).toBe(snapshot[1]);
  });

  it("treats n <= 0 as zero-length top", () => {
    const result = topNShare(items, 0);
    expect(result.n).toBe(0);
    expect(result.topCount).toBe(0);
    expect(result.share).toBe(0);
    expect(result.entities).toEqual([]);
  });
});
