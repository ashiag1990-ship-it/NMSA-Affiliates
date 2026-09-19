"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/context";
import { isLocale } from "@/i18n/config";

/**
 * Renders nothing. On mount, if the logged-in user's saved `locale` (from
 * the Affiliate/Admin DB record) differs from the locale currently active
 * in the browser (e.g. they last switched language on a different device),
 * it adopts the account's saved preference so language follows the person,
 * not just the browser cookie.
 */
export function LocaleSync({ dbLocale }: { dbLocale: string | null | undefined }) {
  const { locale, setLocale } = useTranslation();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    if (isLocale(dbLocale) && dbLocale !== locale) {
      setLocale(dbLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbLocale]);

  return null;
}
