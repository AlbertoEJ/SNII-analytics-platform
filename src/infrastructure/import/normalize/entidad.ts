// Port of supabase/migrations/0010_normalize_entidad.sql.
// Canonicalizes the `entidad` column: collapse long-form variants, strip
// diacritics + uppercase, null out non-state placeholders.

import { upperUnaccent } from "./unaccent";

const PRE_NORMALIZE_ALIASES = new Map<string, string>([
  ["MEXICO", "ESTADO DE MEXICO"],
  ["MÉXICO", "ESTADO DE MEXICO"],
  ["VERACRUZ DE IGNACIO DE LA LLAVE", "VERACRUZ"],
  ["COAHUILA DE ZARAGOZA", "COAHUILA"],
  ["MICHOACAN DE OCAMPO", "MICHOACAN"],
  ["MICHOACÁN DE OCAMPO", "MICHOACAN"],
]);

const PLACEHOLDERS_TO_NULL = new Set([
  "SIN ENTIDAD DE ACREDITACION",
  "SIN INFORMACION COMISION",
  "SIN INSTITUCION",
  "SIN INSTITUCION DE ADSCRIPCION",
  "SIN UBICACION DE COMISION",
  "EXTERIOR",
]);

export function normalizeEntidad(value: string | null): string | null {
  if (value == null) return null;
  const aliased = PRE_NORMALIZE_ALIASES.get(value) ?? value;
  const canonical = upperUnaccent(aliased);
  if (PLACEHOLDERS_TO_NULL.has(canonical)) return null;
  return canonical;
}
