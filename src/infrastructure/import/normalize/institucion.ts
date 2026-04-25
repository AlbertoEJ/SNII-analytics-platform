// Port of the `institucion` cleanup pipeline:
//   migrations 0012 (placeholder→null), 0013 (unaccent+upper, strip trailing
//   "(ACRONYM)" and ", suffix"), 0014 (strip trailing punct), 0015 (drop
//   periods/quotes, normalize hyphens/ampersands to space), and 0016 (slug
//   dedup — handled in slugDedupInstituciones below as a two-pass step).

import { upperUnaccent } from "./unaccent";

const PLACEHOLDERS = new Set([
  "SIN INSTITUCIÓN DE COMISIÓN",
  "Sin Institución de adscripción",
  "SIN INSTITUCIÓN",
  "SIN INSTITUCION",
  "SIN INSTITUCIÓN DE ADSCRIPCIÓN",
  "Sin Institución de Adscripción",
  "SIN INFORMACIÓN COMISIÓN",
  "Sin Institución de Adscripcipción",
]);

/**
 * Apply the per-row institucion cleanup. Returns null for placeholders.
 * Full slug-based deduplication across the corpus is a separate pass —
 * see {@link slugDedupInstituciones}.
 */
export function normalizeInstitucion(value: string | null): string | null {
  if (value == null) return null;
  if (PLACEHOLDERS.has(value)) return null;

  // 0013: upper + unaccent, drop trailing "(ACRONYM)" and ", suffix",
  // collapse whitespace.
  let s = upperUnaccent(value);
  s = s.replace(/\s*\(.*\)$/, "");   // drop trailing "(ACRONYM)"
  s = s.replace(/,.*$/, "");          // drop trailing ", suffix"
  s = s.replace(/\s+/g, " ").trim();

  // 0014: strip trailing dots/whitespace, then collapse whitespace.
  s = s.replace(/[.\s]+$/, "");
  s = s.replace(/\s+/g, " ").trim();

  // 0015: drop periods/quotes/apostrophes, normalize hyphens and ampersands
  // to space, collapse whitespace, trim.
  s = s.replace(/[.''""’‘“”]/g, "");
  s = s.replace(/[&\-]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  return s.length === 0 ? null : s;
}

/**
 * Slug-based deduplication (port of 0016). For each cluster of values whose
 * alphanumeric-only slug is identical, pick the most-common form (ties
 * broken by shortest length) and rewrite all variants to that. Operates on
 * the full set of normalized values across all snapshots.
 *
 * Returns a map from input value → canonical value. Apply by calling
 * `map.get(value) ?? value`.
 */
export function slugDedupInstituciones(values: Iterable<string | null>): Map<string, string> {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const slug = (s: string) => s.replace(/[^A-Z0-9]+/g, "");

  // For each slug, pick a canonical: highest count, then shortest length.
  const bySlug = new Map<string, { canonical: string; bestCount: number; bestLen: number }>();
  for (const [name, count] of counts) {
    const k = slug(name);
    if (k.length === 0) continue;
    const cur = bySlug.get(k);
    if (
      cur === undefined ||
      count > cur.bestCount ||
      (count === cur.bestCount && name.length < cur.bestLen)
    ) {
      bySlug.set(k, { canonical: name, bestCount: count, bestLen: name.length });
    }
  }

  const result = new Map<string, string>();
  for (const name of counts.keys()) {
    const k = slug(name);
    const canon = bySlug.get(k)?.canonical;
    if (canon !== undefined && canon !== name) result.set(name, canon);
  }
  return result;
}
