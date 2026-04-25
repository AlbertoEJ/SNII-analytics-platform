// Port of the `dependencia` block of supabase/migrations/0012_normalize_misc.sql.

const PLACEHOLDERS = new Set([
  "No Disponible",
  "NO DISPONIBLE",
  "NO ESPECIFICADO",
  "Sin Institución de adscripción",
  "SIN INFORMACIÓN",
  "Sin Información",
  "SIN INSTITUCION",
  "SIN INSTITUCIÓN",
  "SIN INSTITUCIÓN REGISTRADA EN EL SNII",
  "SIN INSTITUCIÓN DE ADSCRIPCIÓN",
]);

export function normalizeDependencia(value: string | null): string | null {
  if (value == null) return null;
  if (PLACEHOLDERS.has(value)) return null;
  return value;
}
