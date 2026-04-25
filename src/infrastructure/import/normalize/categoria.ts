// Port of the `categoria` block of supabase/migrations/0012_normalize_misc.sql.

const MAP: Record<string, string> = {
  "EXTENSIÓN 15 AÑOS": "EXTENSION 15 ANOS",
  "EXTENSION 15 AÑOS": "EXTENSION 15 ANOS",
  "EMÉRITO": "EMERITO",
  "EMERITO": "EMERITO",
};

export function normalizeCategoria(value: string | null): string | null {
  if (value == null) return null;
  return MAP[value] ?? value;
}
