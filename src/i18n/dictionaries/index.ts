import { cookies } from "next/headers";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from "../config";
import en from "./en";
import es from "./es";

const dictionaries: Record<Locale, typeof en> = { en, es };

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{ dict: typeof en; locale: Locale }> {
  const locale = await getServerLocale();
  return { dict: dictionaries[locale], locale };
}
