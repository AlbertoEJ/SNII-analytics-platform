export type Era = "early" | "mid90s" | "pre-cvu" | "cvu-era" | "cvu-only" | "2022" | "2023" | "2024" | "2025" | "2026";

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
  // 2024: CVU (plain) + INSTITUCIÓN DE ACREDITACIÓN + CATEGORÍA (with accent) + no CVU padrón
  { era: "2024", match: (h) => has(h, "CVU", "NOMBRE DEL INVESTIGADOR", "INSTITUCIÓN DE ACREDITACIÓN") && lacks(h, "CVU padrón corregido") },
  // 2023: CVU + GRADO ACADÉMICO + NOMBRE DEL INVESTIGADOR + INSTITUCIÓN DE ADSCRIPCIÓN
  { era: "2023", match: (h) => has(h, "CVU", "GRADO ACADÉMICO", "NOMBRE DEL INVESTIGADOR") },
  // 2022: CVU + NOMBRE (short form, no "DEL INVESTIGADOR") + INSTITUCION DE ADSCRIPCIÓN (no tilde on N)
  { era: "2022", match: (h) => has(h, "CVU", "NOMBRE") && lacks(h, "EXPEDIENTE", "NOMBRE DEL INVESTIGADOR", "GRADO ACADÉMICO") },
  { era: "cvu-only", match: (h) => has(h, "CVU") && lacks(h, "EXPEDIENTE") && has(h, "INSTITUCIÓN DE ADSCRIPCIÓN") },
  { era: "cvu-era", match: (h) => has(h, "EXPEDIENTE") && Array.from(h).some((k) => /CVU/i.test(k)) && Array.from(h).some((k) => /^DISCIPLINA/i.test(k)) },
  // pre-cvu: EXPEDIENTE + INSTITUCIÓN DE ADSCRIPCIÓN + DISCIPLINA but no CVU (1991-1999)
  { era: "pre-cvu", match: (h) => has(h, "EXPEDIENTE", "INSTITUCIÓN DE ADSCRIPCIÓN") && Array.from(h).some((k) => /^DISCIPLINA/i.test(k.trim())) && lacks(h, "CVU") },
  { era: "mid90s", match: (h) => has(h, "EXPEDIENTE", "INSTITUCIÓN DE ADSCRIPCIÓN", "ENTIDAD FEDERATIVA") && lacks(h, "DISCIPLINA") },
  { era: "early", match: (h) => has(h, "EXPEDIENTE", "ÁREA DEL CONOCIMIENTO") && lacks(h, "INSTITUCIÓN DE ADSCRIPCIÓN") },
];

export function detectEra(headers: string[]): Era {
  // Trim headers before matching so trailing-space variants (1995-1999) are handled.
  const h = new Set(headers.map((k) => k.trim()));
  for (const r of RULES) if (r.match(h)) return r.era;
  throw new Error(`unknown era for headers: ${headers.join(", ")}`);
}
