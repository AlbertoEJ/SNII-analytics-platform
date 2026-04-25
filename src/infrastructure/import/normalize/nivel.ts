// Port of the `nivel` block of supabase/migrations/0012_normalize_misc.sql.
// Collapse long-form to canonical single-character codes (C / 1 / 2 / 3 / E).

const MAP: Record<string, string> = {
  "Candidato(a) a Investigador(a) Nacional": "C",
  "Candidato(a) a Investigador Nacional": "C",
  "Investigador(a) Nacional Nivel I": "1",
  "Investigador(a) Nacional Nivel II": "2",
  "Investigador(a) Nacional Nivel III": "3",
  "Emérito": "E",
};

export function normalizeNivel(value: string | null): string | null {
  if (value == null) return null;
  return MAP[value] ?? value;
}
