"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/context";

export function RunPayoutEligibilityButton() {
  const router = useRouter();
  const { dict, t } = useTranslation();
  const c = dict.admin.payouts;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/payouts/run-eligibility", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (res.ok) {
      setMessage(t(c.createdResult, { n: json.created }));
      router.refresh();
    } else {
      setMessage(json.error || dict.common.somethingWentWrong);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-nmsa-gray-dark">{message}</span>}
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        {busy ? c.running : c.runEligibilityNow}
      </Button>
    </div>
  );
}
