// Diacritic stripping equivalent to Postgres `unaccent()` with the default
// dictionary (which is what migration 0010 et al. assume).
export function unaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function upperUnaccent(s: string): string {
  return unaccent(s).toUpperCase();
}
