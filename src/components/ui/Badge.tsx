"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/context";

const styles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  approved: "bg-emerald-100 text-emerald-800",
  available: "bg-emerald-100 text-emerald-800",
  awarded: "bg-emerald-100 text-emerald-800",
  paid: "bg-nmsa-navy/10 text-nmsa-navy",
  suspended: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  reversed: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
  clicked: "bg-gray-100 text-gray-700",
  registered: "bg-blue-100 text-blue-800",
  enrolled: "bg-blue-100 text-blue-800",
  payment_pending: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  commission_pending: "bg-amber-100 text-amber-800",
  commission_approved: "bg-emerald-100 text-emerald-800",
  eligible: "bg-emerald-100 text-emerald-800",
  processing: "bg-blue-100 text-blue-800",
  balance_owed: "bg-gray-100 text-gray-700",
  on_hold: "bg-amber-100 text-amber-800",
  default: "bg-gray-100 text-gray-700",
};

/**
 * `label`, when passed, is used verbatim (the caller has already resolved
 * or translated it — e.g. a tier name or a value with no dictionary entry).
 * Without one, the status key is looked up in dict.statuses for the
 * active language, falling back to a humanized version of the raw value.
 */
export function Badge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const { dict } = useTranslation();
  const style = styles[status] ?? styles.default;
  const statusKey = status as keyof typeof dict.statuses;
  const text = label ?? dict.statuses[statusKey] ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize whitespace-nowrap",
        style,
        className
      )}
    >
      {text}
    </span>
  );
}
