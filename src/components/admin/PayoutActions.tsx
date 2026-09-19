"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/context";

export function PayoutActions({ payoutId, cashAppHandle }: { payoutId: string; cashAppHandle: string | null }) {
  const router = useRouter();
  const { dict, t } = useTranslation();
  const c = dict.admin.payouts;
  const [open, setOpen] = useState(false);
  const [confirmedHandle, setConfirmedHandle] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/payouts/${payoutId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark_paid",
        paymentDate: new Date().toISOString(),
        paymentReference,
        adminNotes,
        confirmedCashAppHandle: confirmedHandle,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error || dict.common.somethingWentWrong);
    }
  }

  async function putOnHold() {
    setBusy(true);
    await fetch(`/api/admin/payouts/${payoutId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "on_hold" }),
    });
    setBusy(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => setOpen(true)}>{c.markPaid}</Button>
        <Button size="sm" variant="ghost" onClick={putOnHold} disabled={busy}>{c.hold}</Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-nmsa-navy/20 bg-nmsa-navy/5 p-3 space-y-2 min-w-[260px]">
      <div className="text-xs font-bold text-nmsa-navy">{c.payingTo}: {cashAppHandle || c.noHandleOnFile}</div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <input
        placeholder={t(c.confirmHandlePlaceholder, { handle: cashAppHandle || "$handle" })}
        value={confirmedHandle}
        onChange={(e) => setConfirmedHandle(e.target.value)}
        className="focus-ring w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
      />
      <input
        placeholder={c.paymentReferencePlaceholder}
        value={paymentReference}
        onChange={(e) => setPaymentReference(e.target.value)}
        className="focus-ring w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
      />
      <input
        placeholder={c.adminNotesPlaceholder}
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        className="focus-ring w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
      />
      <div className="flex gap-1.5">
        <Button size="sm" disabled={busy || !confirmedHandle} onClick={markPaid}>
          {c.confirmPaymentSent}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{dict.common.cancel}</Button>
      </div>
    </div>
  );
}
