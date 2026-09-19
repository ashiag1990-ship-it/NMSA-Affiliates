"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AffiliateNav({ name, affiliateType }: { name: string; affiliateType: string }) {
  const pathname = usePathname();
  const { dict } = useTranslation();

  const NAV_ITEMS = [
    { href: "/affiliate/dashboard", label: dict.affiliateNav.dashboard },
    { href: "/affiliate/training", label: dict.affiliateNav.training },
    { href: "/affiliate/referral-link", label: dict.affiliateNav.referralLink },
    { href: "/affiliate/referrals", label: dict.affiliateNav.referrals },
    { href: "/affiliate/earnings", label: dict.affiliateNav.earnings },
    { href: "/affiliate/payouts", label: dict.affiliateNav.payouts },
    { href: "/affiliate/marketing", label: dict.affiliateNav.marketingResources },
    { href: "/affiliate/profile", label: dict.affiliateNav.profile },
    { href: "/affiliate-terms", label: dict.affiliateNav.affiliateTerms },
  ];

  const typeKey = affiliateType as keyof typeof dict.signup.affiliateTypes;
  const typeLabel = dict.signup.affiliateTypes[typeKey]?.label ?? affiliateType;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-nmsa-gold font-extrabold tracking-wide">NMSA</span>
            <span className="text-white text-xs font-semibold">{dict.affiliateNav.portalLabel}</span>
          </div>
        </div>
        <div className="mt-4 text-white text-sm font-semibold truncate">{name}</div>
        <div className="text-white/50 text-xs">
          {typeLabel} {dict.affiliateNav.typeSuffix}
        </div>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-nmsa-gold text-nmsa-navy font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white text-left"
        >
          {dict.common.logOut}
        </button>
      </div>
    </div>
  );
}
