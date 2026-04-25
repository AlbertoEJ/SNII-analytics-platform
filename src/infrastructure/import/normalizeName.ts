const OCR_FIXES: Array<[RegExp, string]> = [
  [/Ä/g, "Ñ"],
  [/Ð/g, "Ñ"],
];

export function normalizeName(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw);
  for (const [re, ch] of OCR_FIXES) s = s.replace(re, ch);
  s = s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/,/g, " ")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}
