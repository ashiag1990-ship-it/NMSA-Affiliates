"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/context";
import type { Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = { en: "English", es: "Español" };

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useTranslation();
  const router = useRouter();

  function handleChange(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    // Server Components (pages, layouts) read the locale cookie directly,
    // so force them to re-render in the new language right away.
    router.refresh();
  }

  return (
    <div className={`inline-flex items-center rounded-full border border-nmsa-navy/20 bg-white p-0.5 text-xs font-semibold ${className}`}>
      {(Object.keys(LABELS) as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => handleChange(code)}
          aria-pressed={locale === code}
          className={`rounded-full px-3 py-1 transition ${
            locale === code ? "bg-nmsa-navy text-white" : "text-nmsa-navy hover:bg-nmsa-navy/10"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
