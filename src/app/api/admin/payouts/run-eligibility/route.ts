import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { runMonthlyPayoutEligibility } from "@/lib/payouts";

/** Lets an admin manually trigger the payout-eligibility sweep on demand, rather than waiting for the 1st of the month. */
export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await runMonthlyPayoutEligibility();
  return NextResponse.json({ ok: true, created: results.length, results });
}
