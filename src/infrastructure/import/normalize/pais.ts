// Port of the `pais` block of supabase/migrations/0012_normalize_misc.sql.
// Null out placeholders, uppercase + unaccent, then apply manual synonym map.

import { upperUnaccent } from "./unaccent";

const PLACEHOLDERS = new Set([
  "SIN INSTITUCIÓN",
  "Sin Institución de adscripción",
  "Sin Institución de Adscripción",
  "SIN INSTITUCIÓN DE ADSCRIPCIÓN",
]);

const SYNONYMS: Record<string, string> = {
  USA: "ESTADOS UNIDOS",
  "GRAN BRETANA": "REINO UNIDO",
  INGLATERRA: "REINO UNIDO",
  ESCOCIA: "REINO UNIDO",
  HOLANDA: "PAISES BAJOS",
  KOREA: "COREA DEL SUR",
  SINGAPORE: "SINGAPUR",
  "EMIRATOS ARABES": "EMIRATOS ARABES UNIDOS",
  "OMAN": "OMAN", // already canonical post-unaccent
};

export function normalizePais(value: string | null): string | null {
  if (value == null) return null;
  if (PLACEHOLDERS.has(value)) return null;
  const canonical = upperUnaccent(value);
  return SYNONYMS[canonical] ?? canonical;
}
