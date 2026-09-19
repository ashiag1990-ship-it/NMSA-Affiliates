import { NextRequest, NextResponse } from "next/server";
import { approveDueCommissions } from "@/lib/commission-engine";
import { prisma } from "@/lib/prisma";
import { sendAffiliateEmail } from "@/lib/email";
import { getProgramSettings } from "@/lib/settings";
import { getAffiliateBalances } from "@/lib/payouts";

/**
 * Run daily (recommended) to move commissions past their holding period
 * into "approved" (available for payout), and to nudge affiliates who are
 * close to the payout minimum. Protected by the same CRON_SECRET as the
 * monthly payout job.
 *
 * Example crontab (runs daily at 05:00 UTC):
 *   0 5 * * * curl -X POST https://your-domain.com/api/cron/approve-commissions \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approvedCount = await approveDueCommissions();

  // Below-minimum nudge: at most once every 25 days per affiliate, for
  // active affiliates with a nonzero balance under the minimum — this
  // cron may run daily, but the email itself is meant to be monthly.
  const settings = await getProgramSettings();
  const minimum = Number(settings.payoutMinimum);
  const affiliates = await prisma.affiliate.findMany({ where: { status: "active" } });
  const reminderCutoff = new Date();
  reminderCutoff.setDate(reminderCutoff.getDate() - 25);

  let remindersSent = 0;
  for (const affiliate of affiliates) {
    const balances = await getAffiliateBalances(affiliate.id);
    if (balances.cashAvailable <= 0 || balances.cashAvailable >= minimum) continue;

    const recentReminder = await prisma.affiliateEmailEvent.findFirst({
      where: { affiliateId: affiliate.id, type: "below_minimum", sentAt: { gte: reminderCutoff } },
    });
    if (recentReminder) continue;

    await sendAffiliateEmail(affiliate.id, "below_minimum", { balance: balances.cashAvailable });
    remindersSent++;
  }

  return NextResponse.json({ ok: true, approvedCount, remindersSent });
}
