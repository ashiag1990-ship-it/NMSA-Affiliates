"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dictionary } from "./dictionaries";
import en from "./dictionaries/en";
import es from "./dictionaries/es";
import { interpolate } from "./interpolate";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, es };

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  /** Interpolation helper for strings containing {{placeholder}} tokens. */
  t: (template: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
    }
    // Persist to the DB for logged-in affiliates/admins and keep the
    // server-rendered cookie in sync; best-effort, never blocks the UI.
    fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {
      /* best-effort */
    });
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dict: dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE],
      setLocale,
      t: (template, vars) => interpolate(template, vars),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Client-side hook: `const { dict, locale, setLocale, t } = useTranslation();` */
export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LocaleProvider");
  }
  return ctx;
}
