"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/context";

export function CommissionActions({ commissionId, status }: { commissionId: string; status: string }) {
  const router = useRouter();
  const { dict } = useTranslation();
  const c = dict.admin.commissions;
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showReverse, setShowReverse] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/admin/commissions/${commissionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setShowReject(false);
      setShowReverse(false);
      setShowAdjust(false);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error || dict.common.somethingWentWrong);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {status === "pending" && (
          <>
            <Button size="sm" disabled={busy} onClick={() => act({ action: "approve" })}>{c.approve}</Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => setShowReject(!showReject)}>{c.reject}</Button>
          </>
        )}
        {(status === "approved" || status === "paid") && (
          <Button size="sm" variant="danger" disabled={busy} onClick={() => setShowReverse(!showReverse)}>{c.reverse}</Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowAdjust(!showAdjust)}>{c.adjust}</Button>
      </div>

      {showReject && (
        <div className="flex gap-2">
          <input placeholder={c.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} className="focus-ring rounded-lg border border-gray-300 px-2 py-1 text-xs flex-1" />
          <Button size="sm" variant="danger" disabled={busy || !reason} onClick={() => act({ action: "reject", reason })}>{c.confirmButton}</Button>
        </div>
      )}
      {showReverse && (
        <div className="flex gap-2">
          <input placeholder={c.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} className="focus-ring rounded-lg border border-gray-300 px-2 py-1 text-xs flex-1" />
          <Button size="sm" variant="danger" disabled={busy || !reason} onClick={() => act({ action: "reverse", reason })}>{c.confirmButton}</Button>
        </div>
      )}
      {showAdjust && (
        <div className="flex gap-2">
          <input placeholder={c.amountPlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)} className="focus-ring rounded-lg border border-gray-300 px-2 py-1 text-xs w-28" />
          <input placeholder={c.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} className="focus-ring rounded-lg border border-gray-300 px-2 py-1 text-xs flex-1" />
          <Button size="sm" disabled={busy || !amount || !reason} onClick={() => act({ action: "adjust", amount: Number(amount), reason })}>{c.confirmButton}</Button>
        </div>
      )}
    </div>
  );
}
