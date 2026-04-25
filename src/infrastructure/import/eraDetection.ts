export type Era = "early" | "mid90s" | "cvu-era" | "cvu-only" | "2025" | "2026";

interface EraRule {
  era: Era;
  match: (h: Set<string>) => boolean;
}

const has = (h: Set<string>, ...keys: string[]) => keys.every((k) => h.has(k));
const lacks = (h: Set<string>, ...keys: string[]) => keys.every((k) => !h.has(k));

// Order matters: most-specific first.
const RULES: EraRule[] = [
  { era: "2026", match: (h) => has(h, "INSTITUCION DE ACREDITACION", "INSTITUCION FINAL") },
  { era: "2025", match: (h) => has(h, "CVU padrón corregido", "INSTITUCIÓN DE ACREDITACIÓN") },
  { era: "cvu-only", match: (h) => has(h, "CVU") && lacks(h, "EXPEDIENTE") && has(h, "INSTITUCIÓN DE ADSCRIPCIÓN") },
  { era: "cvu-era", match: (h) => has(h, "EXPEDIENTE") && Array.from(h).some((k) => /CVU/i.test(k)) && Array.from(h).some((k) => /^DISCIPLINA/i.test(k)) },
  { era: "mid90s", match: (h) => has(h, "EXPEDIENTE", "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA") && lacks(h, "DISCIPLINA") },
  { era: "early", match: (h) => has(h, "EXPEDIENTE", "ÁREA DEL CONOCIMIENTO") && lacks(h, "INSTITUCIÓN DE ADSCRIPCIÓN") },
];

export function detectEra(headers: string[]): Era {
  const h = new Set(headers);
  for (const r of RULES) if (r.match(h)) return r.era;
  throw new Error(`unknown era for headers: ${headers.join(", ")}`);
}
