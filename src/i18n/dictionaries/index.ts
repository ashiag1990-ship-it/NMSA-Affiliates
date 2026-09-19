import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "../config";
import en from "./en";
import es from "./es";
import type { Dictionary } from "./en";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Reads the locale cookie set by the middleware/LanguageSwitcher for use in Server Components. */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Convenience helper for Server Components: `const { dict, locale } = await getDictionary();` */
export async function getDictionary(): Promise<{ dict: Dictionary; locale: Locale }> {
  const locale = await getServerLocale();
  return { dict: getDictionaryFor(locale), locale };
}
