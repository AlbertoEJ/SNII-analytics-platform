import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./messages";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("locale")?.value;
  return (LOCALES as string[]).includes(v ?? "") ? (v as Locale) : DEFAULT_LOCALE;
}
