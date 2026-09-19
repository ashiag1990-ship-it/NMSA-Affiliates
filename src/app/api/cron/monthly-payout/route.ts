import { NextRequest, NextResponse } from "next/server";
import { runMonthlyPayoutEligibility } from "@/lib/payouts";

/**
 * Hit this on the 1st of every month by your scheduler of choice (a
 * Vercel Cron job, a system crontab curl, GitHub Actions, etc). Protected
 * by a shared secret rather than a session since it's called by a
 * scheduler, not a logged-in user.
 *
 * Example crontab (runs at 06:00 UTC on the 1st):
 *   0 6 1 * * curl -X POST https://your-domain.com/api/cron/monthly-payout \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runMonthlyPayoutEligibility();
  return NextResponse.json({ ok: true, created: results.length, results });
}
