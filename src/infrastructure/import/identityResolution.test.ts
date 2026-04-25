import { describe, it, expect } from "vitest";
import { resolveIdentities, type RawTuple } from "./identityResolution";

const t = (year: number, name: string, cvu?: string, expediente?: string): RawTuple => ({
  year, name, cvu, expediente,
});

describe("resolveIdentities", () => {
  it("groups same CVU across years into one identity", () => {
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2011, "PEREZ JUAN", "100", "55"),
    ]);
    expect(out.identities.length).toBe(1);
    expect(out.identities[0].cvu).toBe(100);
    expect(out.identities[0].firstYear).toBe(2010);
    expect(out.identities[0].lastYear).toBe(2011);
  });

  it("links pre-2003 expediente to a CVU when CVU appears later with same expediente", () => {
    const out = resolveIdentities([
      t(1990, "PEREZ JUAN", undefined, "55"),
      t(2010, "PEREZ JUAN", "100", "55"),
    ]);
    expect(out.identities.length).toBe(1);
    expect(out.identities[0].cvu).toBe(100);
    expect(out.identities[0].expedientes).toEqual(["55"]);
    expect(out.identities[0].firstYear).toBe(1990);
  });

  it("creates a CVU-less identity when an expediente never appears with a CVU", () => {
    const out = resolveIdentities([
      t(1985, "GARCIA MARIA", undefined, "12"),
    ]);
    expect(out.identities.length).toBe(1);
    expect(out.identities[0].cvu).toBeNull();
    expect(out.identities[0].expedientes).toEqual(["12"]);
  });

  it("flags ambiguous when one CVU appears with multiple expedientes that ALSO appear with another CVU", () => {
    // CVU 100 appears with exp 55 and 56. CVU 200 also appears with exp 56.
    // So exp 56 collides — both CVUs flagged ambiguous.
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2010, "PEREZ JUAN", "100", "56"),
      t(2011, "OTRO USUARIO", "200", "56"),
    ]);
    const flagged = out.identities.filter((i) => i.ambiguous);
    expect(flagged.length).toBeGreaterThanOrEqual(2);
    for (const f of flagged) expect(f.ambiguityNote).toBeTruthy();
  });

  it("each output snapshot row gets a canonical_id linking to its identity", () => {
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2011, "PEREZ JUAN", "100", "55"),
    ]);
    const ids = new Set(out.snapshotMap.values());
    expect(ids.size).toBe(1);
    expect(out.snapshotMap.size).toBe(2);
  });

  it("uses the most recent year's name as canonical_name", () => {
    const out = resolveIdentities([
      t(2010, "PEREZ JUAN", "100", "55"),
      t(2020, "PEREZ JUAN CARLOS", "100", "55"),
    ]);
    expect(out.identities[0].canonicalName).toBe("PEREZ JUAN CARLOS");
  });
});
