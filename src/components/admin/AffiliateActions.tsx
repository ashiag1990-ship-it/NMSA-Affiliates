"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/context";

type Tier = { id: string; name: string };

export function AffiliateActions({
  affiliateId,
  currentStatus,
  currentType,
  currentTierId,
  tiers,
}: {
  affiliateId: string;
  currentStatus: string;
  currentType: string;
  currentTierId: string | null;
  tiers: Tier[];
}) {
  const router = useRouter();
  const { dict } = useTranslation();
  const c = dict.admin.affiliates.detail;
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  async function patch(data: Record<string, unknown>) {
    setSubmitting(true);
    await fetch(`/api/admin/affiliates/${affiliateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase text-nmsa-gray-dark mb-2">{c.statusLabel}</div>
        <div className="flex flex-wrap gap-2">
          {currentStatus !== "active" && (
            <Button size="sm" disabled={submitting} onClick={() => patch({ status: "active" })}>
              {c.activate}
            </Button>
          )}
          {currentStatus !== "suspended" && (
            <Button size="sm" variant="danger" disabled={submitting} onClick={() => patch({ status: "suspended", suspendedReason: reason })}>
              {c.suspend}
            </Button>
          )}
          {currentStatus !== "pending" && (
            <Button size="sm" variant="ghost" disabled={submitting} onClick={() => patch({ status: "pending" })}>
              {c.setPending}
            </Button>
          )}
        </div>
        {currentStatus !== "suspended" && (
          <input
            type="text"
            placeholder={c.suspensionReasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="focus-ring mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
          />
        )}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-nmsa-gray-dark mb-2">{c.affiliateTypeLabel}</div>
        <select
          defaultValue={currentType}
          disabled={submitting}
          onChange={(e) => patch({ affiliateType: e.target.value })}
          className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="educator">{dict.statuses.educator}</option>
          <option value="practitioner">{dict.statuses.practitioner}</option>
          <option value="general">{dict.statuses.general}</option>
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-nmsa-gray-dark mb-2">{c.affiliateTierLabel}</div>
        <select
          defaultValue={currentTierId ?? ""}
          disabled={submitting}
          onChange={(e) => patch({ tierId: e.target.value || null })}
          className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{c.noTier}</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
