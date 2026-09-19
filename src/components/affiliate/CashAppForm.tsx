"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useTranslation } from "@/i18n/context";

export function CashAppForm({ currentHandle }: { currentHandle: string | null }) {
  const { dict } = useTranslation();
  const [handle, setHandle] = useState("");
  const [confirmHandle, setConfirmHandle] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mismatch = handle.length > 0 && confirmHandle.length > 0 && handle.trim() !== confirmHandle.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const res = await fetch("/api/affiliate/cashapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashAppHandle: handle, confirmCashAppHandle: confirmHandle }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || dict.common.somethingWentWrong);
      return;
    }
    setMessage(json.message);
    setHandle("");
    setConfirmHandle("");
    setConfirmed(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-nmsa-gray-dark">
        {dict.profile.currentHandle}{" "}
        <span className="font-semibold text-nmsa-navy">{currentHandle || dict.common.notSet}</span>
      </div>

      {message && <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={dict.profile.newHandle} htmlFor="handle">
          <Input id="handle" placeholder="$ExampleName" value={handle} onChange={(e) => setHandle(e.target.value)} required />
        </Field>
        <Field
          label={dict.profile.confirmHandle}
          htmlFor="confirmHandle"
          error={mismatch ? dict.profile.mismatch : undefined}
        >
          <Input
            id="confirmHandle"
            placeholder="$ExampleName"
            value={confirmHandle}
            onChange={(e) => setConfirmHandle(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-xs text-amber-900">
        <strong>{dict.profile.warningTitle}</strong> {dict.profile.warningBody}
      </div>

      <label className="flex items-start gap-2.5 text-xs text-nmsa-gray-dark">
        <input type="checkbox" className="mt-0.5 accent-nmsa-navy" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>{dict.profile.accurateConfirm}</span>
      </label>

      <Button type="submit" disabled={submitting || mismatch || !confirmed || !handle || !confirmHandle}>
        {submitting ? dict.profile.updating : dict.profile.updateButton}
      </Button>
    </form>
  );
}
