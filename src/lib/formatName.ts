/**
 * Format a padrón name from "APELLIDO PATERNO APELLIDO MATERNO, NOMBRE(S)"
 * to "Nombres Apellido Apellido". Title-cases each word and lower-cases
 * Spanish particles ("de", "la", "del", etc). Accents cannot be recovered
 * from the uppercase source.
 */
const PARTICLES = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "e",
  "da",
  "do",
  "dos",
  "das",
]);

export function formatName(raw: string): string {
  if (!raw) return raw;
  const parts = raw.split(",");
  const surnames = (parts[0] ?? "").trim();
  const given = (parts[1] ?? "").trim();
  const ordered = given ? `${given} ${surnames}` : surnames;
  return titleCase(ordered);
}

/** Initials from the first one or two surnames (still alphabetical). */
export function nameInitials(raw: string): string {
  if (!raw) return "?";
  const surnames = raw.split(",")[0].trim().split(/\s+/);
  return (
    surnames
      .filter((p) => !PARTICLES.has(p.toLowerCase()))
      .slice(0, 2)
      .map((p) => p[0])
      .join("") || "?"
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/) // keep separators (spaces, hyphens) so we can rejoin
    .map((token, i) => {
      if (/^\s+$/.test(token) || token === "-") return token;
      // Particles stay lowercase unless they are the first word.
      if (i > 0 && PARTICLES.has(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join("");
}
