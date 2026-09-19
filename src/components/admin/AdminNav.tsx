"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const { dict } = useTranslation();

  const NAV_ITEMS = [
    { href: "/admin", label: dict.adminNav.overview },
    { href: "/admin/affiliates", label: dict.adminNav.affiliates },
    { href: "/admin/referrals", label: dict.adminNav.referrals },
    { href: "/admin/commissions", label: dict.adminNav.commissions },
    { href: "/admin/payouts", label: dict.adminNav.payouts },
    { href: "/admin/bonuses", label: dict.adminNav.bonuses },
    { href: "/admin/marketing", label: dict.adminNav.marketing },
    { href: "/admin/email-campaigns", label: dict.adminNav.emailCampaigns },
    { href: "/admin/settings", label: dict.adminNav.settings },
    { href: "/admin/audit-log", label: dict.adminNav.auditLog },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <span className="text-nmsa-gold font-extrabold tracking-wide">NMSA</span>
        <div className="text-white/60 text-xs font-semibold mt-1">{dict.adminNav.panelLabel}</div>
        <div className="mt-4 text-white text-sm font-semibold truncate">{name}</div>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
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
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white text-left"
        >
          {dict.common.logOut}
        </button>
      </div>
    </div>
  );
}
