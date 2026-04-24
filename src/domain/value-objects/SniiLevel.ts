export type SniiLevelCode = "C" | "1" | "2" | "3" | "E";

export const SNII_LEVELS: SniiLevelCode[] = ["C", "1", "2", "3", "E"];

export const SNII_LEVEL_LABELS: Record<SniiLevelCode, { es: string; en: string }> = {
  C: { es: "Candidato/a", en: "Candidate" },
  "1": { es: "Nivel 1", en: "Level 1" },
  "2": { es: "Nivel 2", en: "Level 2" },
  "3": { es: "Nivel 3", en: "Level 3" },
  E: { es: "Emérito/a", en: "Emeritus" },
};

export const SNII_LEVEL_COLORS: Record<SniiLevelCode, string> = {
  C: "#f59e0b",
  "1": "#0ea5e9",
  "2": "#8b5cf6",
  "3": "#10b981",
  E: "#f43f5e",
};

export function isValidSniiLevel(v: string | null | undefined): v is SniiLevelCode {
  return v != null && (SNII_LEVELS as string[]).includes(v);
}
