// Port of supabase/migrations/0011_normalize_area.sql.
// Map each known area_conocimiento variant to a canonical form. Unknown
// values pass through untouched so they're visible in QA.

const VARIANTS: Record<string, string> = {};

function add(canonical: string, variants: string[]) {
  for (const v of variants) VARIANTS[v] = canonical;
}

// Roman-prefixed canonical forms.
add("I. FISICO-MATEMATICAS Y CIENCIAS DE LA TIERRA", [
  "I.- FÍSICO-MATEMÁTICAS Y CIENCIAS DE LA TIERRA",
  "I. FISICO-MATEMATICAS Y CIENCIAS DE LA TIERRA",
  // 2024-2025 dropped the prefix.
  "FÍSICO-MATEMÁTICAS Y CIENCIAS DE LA TIERRA",
  "Físico-Matemáticas y Ciencias de la Tierra",
  // Pre-2003 short form, deliberately collapsed for cross-year filter UX.
  "I.- CIENCIAS FÍSICO-MATEMÁTICAS",
]);

add("II. BIOLOGIA Y QUIMICA", [
  "II.- BIOLOGÍA Y QUÍMICA",
  "II. BIOLOGIA Y QUIMICA",
  // Pre-2003 collapse.
  "II.- CIENCIAS BIOLÓGICAS, BIOMÉDICAS Y QUÍMICAS",
  "BIOLOGÍA Y QUÍMICA",
  "Biología y Química",
]);

add("III. MEDICINA Y CIENCIAS DE LA SALUD", [
  "III.- MEDICINA Y CIENCIAS DE LA SALUD",
  "III. MEDICINA Y CIENCIAS DE LA SALUD",
  "MEDICINA Y CIENCIAS DE LA SALUD",
  "Medicina y Ciencias de la Salud",
]);

add("IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACION", [
  "IV.- CIENCIAS DE LA CONDUCTA Y LA EDUCACIÓN",
  "IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACION",
  "IV. CIENCIAS DE LA CONDUCTA Y LA EDUCACIÓN.",
  "IV.- HUMANIDADES Y CIENCIAS DE LA CONDUCTA", // pre-2003 collapse
  "CIENCIAS DE LA CONDUCTA Y LA EDUCACIÓN",
  "Ciencias de la Conducta y la Educación",
]);

add("V. HUMANIDADES", [
  "V.- HUMANIDADES.",
  "V. HUMANIDADES",
  "HUMANIDADES",
  "Humanidades",
]);

add("VI. CIENCIAS SOCIALES", [
  "VI.- CIENCIAS SOCIALES",
  "VI. CIENCIAS SOCIALES",
  "V.- CIENCIAS SOCIALES", // pre-2008 numbering
  "III.- CIENCIAS SOCIALES Y HUMANIDADES", // pre-2003 collapse to social-sciences
  "CIENCIAS SOCIALES",
  "Ciencias Sociales",
]);

add("VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS", [
  "VII.- CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS",
  "VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS",
  "VII. CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS.",
  "VI.- BIOTECNOLOGÍA Y CIENCIAS AGROPECUARIAS", // pre-2008 numbering
  "CIENCIAS DE AGRICULTURA, AGROPECUARIAS, FORESTALES Y DE ECOSISTEMAS",
  "Ciencias de Agricultura, Agropecuarias, Forestales y de Ecosistemas",
]);

add("VIII. INGENIERIAS Y DESARROLLO TECNOLOGICO", [
  "VIII.- INGENIERÍAS Y DESARROLLO TECNOLÓGICO",
  "VIII. INGENIERIAS Y DESARROLLO TECNOLOGICO",
  "VII.- INGENIERÍAS", // pre-2008 numbering
  "IV.- INGENIERÍA Y TECNOLOGÍA", // pre-2003 numbering
  "INGENIERÍAS Y DESARROLLO TECNOLÓGICO",
]);

add("IX. INTERDISCIPLINARIA", [
  "IX.- INTERDISCIPLINARIA",
  "IX. INTERDISCIPLINARIA",
  "IX. INTERDISCIPLINARIA.",
  "INTERDISCIPLINARIA",
  "Interdisciplinaria",
]);

export function normalizeArea(value: string | null): string | null {
  if (value == null) return null;
  return VARIANTS[value] ?? value;
}
