"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/i18n/context";
import type { Locale } from "@/i18n/config";

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <SessionProvider>
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </SessionProvider>
  );
}
