"use client";

import { useState } from "react";
import { AffiliateNav } from "./AffiliateNav";
import { useTranslation } from "@/i18n/context";
import { LocaleSync } from "@/components/LocaleSync";

export function AffiliatePortalShell({
  name,
  affiliateType,
  locale,
  statusBanner,
  children,
}: {
  name: string;
  affiliateType: string;
  locale?: string | null;
  statusBanner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dict } = useTranslation();

  return (
    <div className="min-h-screen flex">
      <LocaleSync dbLocale={locale} />
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-nmsa-navy shrink-0">
        <div className="fixed w-64 h-screen">
          <AffiliateNav name={name} affiliateType={affiliateType} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-nmsa-navy">
            <AffiliateNav name={name} affiliateType={affiliateType} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-nmsa-navy px-4 py-3 flex items-center justify-between">
          <span className="text-nmsa-gold font-extrabold tracking-wide">
            NMSA {dict.affiliateNav.portalLabel}
          </span>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white p-2 -mr-2"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {statusBanner}

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
