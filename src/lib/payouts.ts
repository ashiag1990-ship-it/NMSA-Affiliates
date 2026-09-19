import { prisma } from "./prisma";
import { getProgramSettings } from "./settings";
import { logAuditEvent } from "./audit";
import { sendAffiliateEmail } from "./email";
import { getAffiliateBalances } from "./balances";

// Re-exported so existing `import { getAffiliateBalances } from "@/lib/payouts"`
// call sites keep working — the implementation lives in lib/balances.ts to
// avoid a payouts.ts <-> email.ts circular import (email.ts needs balances
// to render the "new commission" email; payouts.ts needs email.ts to send
// payout emails).
export { getAffiliateBalances };
export type { AffiliateBalances } from "./balances";

/**
 * Runs on the 1st of the month (or on-demand from the admin panel / a cron
 * hitting /api/cron/monthly-payout). For every active affiliate whose
 * available balance meets the configured minimum, creates an "eligible"
 * payout record reserving the underlying commissions/bonuses. Affiliates
 * below the minimum are simply skipped — their balance is never reset, so
 * it naturally rolls forward and gets picked up next run.
 */
export async function runMonthlyPayoutEligibility() {
  const settings = await getProgramSettings();
  const minimum = Number(settings.payoutMinimum);

  const affiliates = await prisma.affiliate.findMany({ where: { status: "active" } });

  const results: { affiliateId: string; amount: number; payoutId?: string }[] = [];

  for (const affiliate of affiliates) {
    // Don't double-reserve into a new payout while a prior one is unresolved.
    const openPayout = await prisma.affiliatePayout.findFirst({
      where: { affiliateId: affiliate.id, status: { in: ["eligible", "processing"] } },
    });
    if (openPayout) continue;

    const eligibleCommissions = await prisma.affiliateCommission.findMany({
      where: { affiliateId: affiliate.id, status: "approved", payoutItems: { none: {} } },
      include: { adjustments: true },
    });
    const eligibleBonuses = await prisma.affiliateBonus.findMany({
      where: { affiliateId: affiliate.id, status: "awarded", payoutItems: { none: {} } },
    });

    const commissionTotal = eligibleCommissions.reduce(
      (sum, c) => sum + Number(c.amount) + c.adjustments.reduce((s, a) => s + Number(a.amount), 0),
      0
    );
    const bonusTotal = eligibleBonuses.reduce((sum, b) => sum + Number(b.bonusAmount), 0);
    const total = Math.round((commissionTotal + bonusTotal) * 100) / 100;

    if (total < minimum || (eligibleCommissions.length === 0 && eligibleBonuses.length === 0)) {
      continue;
    }

    const payout = await prisma.affiliatePayout.create({
      data: {
        affiliateId: affiliate.id,
        amount: total,
        status: "eligible",
        items: {
          create: [
            ...eligibleCommissions.map((c) => ({
              commissionId: c.id,
              amount: Number(c.amount) + c.adjustments.reduce((s, a) => s + Number(a.amount), 0),
            })),
            ...eligibleBonuses.map((b) => ({ bonusId: b.id, amount: Number(b.bonusAmount) })),
          ],
        },
      },
    });

    await logAuditEvent({
      affiliateId: affiliate.id,
      action: "payout_eligible",
      newValue: { payoutId: payout.id, amount: total },
      reason: `Reached the $${minimum} payout minimum`,
    });

    await sendAffiliateEmail(affiliate.id, "payout_ready", {
      amount: total,
      cashAppHandle: affiliate.cashAppHandle,
    });

    results.push({ affiliateId: affiliate.id, amount: total, payoutId: payout.id });
  }

  return results;
}

/**
 * Admin marks a payout as paid after actually sending the Cash App
 * payment. Snapshots the Cash App handle used at this moment — if the
 * affiliate changes their handle later, this historical record must not
 * change retroactively.
 */
export async function markPayoutPaid(
  payoutId: string,
  adminId: string,
  params: { paymentDate: Date; paymentReference?: string; adminNotes?: string }
) {
  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
    include: { affiliate: true, items: true },
  });
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "paid") throw new Error("Payout has already been marked paid");

  await prisma.$transaction(async (tx) => {
    await tx.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: "paid",
        paymentDate: params.paymentDate,
        paymentReference: params.paymentReference,
        adminNotes: params.adminNotes,
        cashAppHandleUsed: payout.affiliate.cashAppHandle,
        createdByAdminId: adminId,
      },
    });

    for (const item of payout.items) {
      if (item.commissionId) {
        // Only the CASH commission is settled here. Educator enrollment
        // credits are a separate reward redeemed against a future
        // enrollment (an admin action elsewhere), not something a Cash
        // App payout ever marks paid.
        const paidCommission = await tx.affiliateCommission.update({
          where: { id: item.commissionId },
          data: { status: "paid", paidAt: params.paymentDate },
        });
        await tx.affiliateReferral.updateMany({
          where: { id: paidCommission.referralId, status: "commission_approved" },
          data: { status: "paid" },
        });
      }
      if (item.bonusId) {
        await tx.affiliateBonus.update({ where: { id: item.bonusId }, data: { status: "paid" } });
      }
    }
  });

  await logAuditEvent({
    adminId,
    affiliateId: payout.affiliateId,
    action: "payout_marked_paid",
    previousValue: { status: payout.status },
    newValue: { status: "paid", amount: Number(payout.amount) },
    reason: params.adminNotes,
  });

  await sendAffiliateEmail(payout.affiliateId, "payout_completed", {
    amount: Number(payout.amount),
    paymentDate: params.paymentDate,
    paymentReference: params.paymentReference,
  });
}
