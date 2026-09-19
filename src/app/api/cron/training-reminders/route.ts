import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAffiliateEmail } from "@/lib/email";

/**
 * Run daily. Reminds any affiliate whose signup is complete but whose
 * training isn't, at least 24 hours after signup, and only once (tracked
 * via trainingReminderSentAt) so it doesn't nag daily forever.
 *
 * Example crontab (runs daily at 14:00 UTC):
 *   0 14 * * * curl -X POST https://your-domain.com/api/cron/training-reminders \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 24);

  const pending = await prisma.affiliateTraining.findMany({
    where: {
      trainingCompleted: false,
      trainingReminderSentAt: null,
      createdAt: { lte: cutoff },
    },
    include: { affiliate: true },
  });

  let sent = 0;
  for (const t of pending) {
    if (t.affiliate.status === "suspended") continue;
    await sendAffiliateEmail(t.affiliateId, "training_reminder");
    await prisma.affiliateTraining.update({ where: { affiliateId: t.affiliateId }, data: { trainingReminderSentAt: new Date() } });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
