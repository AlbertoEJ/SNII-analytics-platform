import { describe, it, expect } from "vitest";
import { detectEra } from "./eraDetection";

describe("detectEra", () => {
  it("classifies 1984 era (early)", () => {
    expect(detectEra(["EXPEDIENTE", "NIVEL", "ÁREA DEL CONOCIMIENTO"])).toBe("early");
  });

  it("classifies 1990s era (mid90s)", () => {
    expect(detectEra([
      "EXPEDIENTE", "NIVEL", "ÁREA DEL CONOCIMIENTO",
      "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA", "PAIS",
    ])).toBe("mid90s");
  });

  it("classifies 2000–2014 era (cvu-era)", () => {
    expect(detectEra([
      "AÑO", "CVU (a partir de 2003)", "EXPEDIENTE", "NIVEL",
      "ÁREA DEL CONOCIMIENTO", "DISCIPLINA (a partir de 1991)",
    ])).toBe("cvu-era");
  });

  it("classifies 2015–2020 era (cvu-only)", () => {
    expect(detectEra([
      "CVU", "NOMBRE DE LA INVESTIGADORA O DEL INVESTIGADOR", "NIVEL",
      "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA",
    ])).toBe("cvu-only");
  });

  it("classifies 2025 era", () => {
    expect(detectEra([
      "CVU padrón corregido", "NOMBRE DEL INVESTIGADOR", "NIVEL",
      "INSTITUCIÓN DE ACREDITACIÓN", "ÁREA DE CONOCIMIENTO",
    ])).toBe("2025");
  });

  it("classifies 2026 era", () => {
    expect(detectEra([
      "CVU", "NOMBRE DEL INVESTIGADOR", "NIVEL",
      "INSTITUCION DE ACREDITACION", "INSTITUCION FINAL",
    ])).toBe("2026");
  });

  it("throws for unknown header set", () => {
    expect(() => detectEra(["FOO", "BAR"])).toThrow(/unknown era/i);
  });
});
