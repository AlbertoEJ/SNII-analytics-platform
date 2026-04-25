import { describe, it, expect } from "vitest";
import { normalizeName } from "./normalizeName";

describe("normalizeName", () => {
  it("uppercases and removes accents", () => {
    expect(normalizeName("José María Pérez")).toBe("JOSE MARIA PEREZ");
  });

  it("collapses whitespace and strips commas", () => {
    expect(normalizeName("ABREU GROBOIS, FEDERICO ALBERTO"))
      .toBe(normalizeName("ABREU GROBOIS,FEDERICO ALBERTO"));
    expect(normalizeName("ABREU GROBOIS, FEDERICO ALBERTO"))
      .toBe(normalizeName("ABREU GROBOIS FEDERICO ALBERTO"));
  });

  it("repairs OCR artifacts Ä and Ð back to Ñ", () => {
    expect(normalizeName("ALLEN ARMIÄO")).toBe(normalizeName("ALLEN ARMIÑO"));
    expect(normalizeName("ALLEN ARMIÐO")).toBe(normalizeName("ALLEN ARMIÑO"));
  });

  it("strips punctuation other than letters/digits/spaces", () => {
    expect(normalizeName("O'BRIEN-SMITH, J.")).toBe("OBRIENSMITH J");
  });

  it("returns empty string for nullish inputs", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName("")).toBe("");
  });

  it("does NOT match a real typo cluster (ECEVES vs ACEVES)", () => {
    expect(normalizeName("ECEVES TORRES, RAUL"))
      .not.toBe(normalizeName("ACEVES TORRES, RAUL"));
  });
});
