import { prisma } from "./prisma";
import { getProgramSettings } from "./settings";
import { logAuditEvent } from "./audit";
import { sendAffiliateEmail } from "./email";
import type { AffiliateReferral, Affiliate, CommissionRule } from "@prisma/client";

/**
 * Finds the best-matching active CommissionRule for a referral.
 *
 * Rules are admin-configured (never hard-coded) and may be scoped by
 * affiliateType / licenseLevel / termType / tier, with `null` on any of
 * those fields meaning "applies broadly." When more than one active rule
 * matches, the one with the highest `priority` wins — admins should give
 * more specific rules a higher priority than general fallback rules.
 */
export async function pickCommissionRule(
  affiliate: Affiliate,
  referral: AffiliateReferral
): Promise<CommissionRule | null> {
  const candidates = await prisma.commissionRule.findMany({
    where: {
      active: true,
      OR: [{ affiliateType: null }, { affiliateType: affiliate.affiliateType }],
    },
    orderBy: { priority: "desc" },
  });

  const match = candidates.find((rule) => {
    if (rule.affiliateType && rule.affiliateType !== affiliate.affiliateType) return false;
    if (rule.licenseLevel && rule.licenseLevel !== referral.licenseLevel) return false;
    if (rule.termType && rule.termType !== referral.termType) return false;
    if (rule.tierId && rule.tierId !== affiliate.tierId) return false;
    return true;
  });

  return match ?? null;
}

export function computeCommissionAmount(
  rule: CommissionRule,
  referral: AffiliateReferral
): number {
  if (rule.fixedAmount != null) {
    return Number(rule.fixedAmount);
  }
  if (rule.percentage != null && referral.purchaseAmount != null) {
    return Math.round(Number(referral.purchaseAmount) * (Number(rule.percentage) / 100) * 100) / 100;
  }
  return 0;
}

/**
 * Creates the cash commission (and, for educator affiliates, the
 * additional educator-credit ledger entry — educators earn BOTH per the
 * program spec) for a referral whose purchase just completed. Idempotent:
 * if a commission already exists for this referral it is returned as-is
 * rather than duplicated (prevents double-commissioning the same
 * qualifying transaction, e.g. if a webhook is retried).
 */
export async function createCommissionForReferral(referralId: string) {
  const referral = await prisma.affiliateReferral.findUnique({
    where: { id: referralId },
    include: { affiliate: true },
  });
  if (!referral) throw new Error("Referral not found");

  const existing = await prisma.affiliateCommission.findFirst({ where: { referralId } });
  if (existing) return existing;

  if (referral.fraudFlag) return null;

  const settings = await getProgramSettings();
  const rule = await pickCommissionRule(referral.affiliate, referral);
  const amount = rule ? computeCommissionAmount(rule, referral) : 0;

  const holdUntil = new Date();
  holdUntil.setDate(holdUntil.getDate() + settings.commissionHoldingDays);

  const commission = await prisma.affiliateCommission.create({
    data: {
      affiliateId: referral.affiliateId,
      referralId: referral.id,
      commissionRuleId: rule?.id,
      amount,
      status: "pending",
      holdUntil,
    },
  });

  // Educators keep their existing educator enrollment credits IN ADDITION
  // to cash commissions — never a replacement.
  if (referral.affiliate.affiliateType === "educator" && referral.licenseLevel && referral.termType) {
    const rate = await prisma.educatorCreditRate.findUnique({
      where: {
        licenseLevel_termType: {
          licenseLevel: referral.licenseLevel,
          termType: referral.termType,
        },
      },
    });
    if (rate?.active) {
      await prisma.educatorCreditLedgerEntry.create({
        data: {
          affiliateId: referral.affiliateId,
          referralId: referral.id,
          licenseLevel: referral.licenseLevel,
          termType: referral.termType,
          amount: rate.creditAmount,
          status: "pending",
        },
      });
    }
  }

  await logAuditEvent({
    affiliateId: referral.affiliateId,
    action: "commission_created",
    newValue: { commissionId: commission.id, amount, referralId: referral.id },
  });

  if (amount > 0) {
    await sendAffiliateEmail(referral.affiliateId, "new_commission", {
      amount,
      referralId: referral.id,
    });
  }

  return commission;
}

/**
 * System job (call from the monthly/daily cron, or manually from admin):
 * moves PENDING commissions whose holding period has elapsed into
 * APPROVED — which, per the program spec, immediately means "available
 * for payout." Skips anything whose underlying referral was cancelled,
 * refunded, or flagged fraudulent — those should be rejected/reversed
 * instead, never silently approved.
 */
export async function approveDueCommissions() {
  const due = await prisma.affiliateCommission.findMany({
    where: {
      status: "pending",
      holdUntil: { lte: new Date() },
    },
    include: { referral: true },
  });

  let approvedCount = 0;
  for (const commission of due) {
    if (["cancelled", "refunded"].includes(commission.referral.status) || commission.referral.fraudFlag) {
      continue;
    }
    await prisma.affiliateCommission.update({
      where: { id: commission.id },
      data: { status: "approved", approvedAt: new Date() },
    });
    await prisma.educatorCreditLedgerEntry.updateMany({
      where: { referralId: commission.referralId, status: "pending" },
      data: { status: "approved" },
    });
    if (commission.referral.status === "commission_pending") {
      await prisma.affiliateReferral.update({
        where: { id: commission.referralId },
        data: { status: "commission_approved" },
      });
    }
    await logAuditEvent({
      affiliateId: commission.affiliateId,
      action: "commission_approved",
      previousValue: { status: "pending" },
      newValue: { status: "approved" },
      reason: "Holding period elapsed",
    });
    approvedCount++;
  }
  return approvedCount;
}

/**
 * Reverses a previously approved/available/paid commission due to a refund
 * or chargeback. `adminId` is null for a system-initiated reversal (e.g.
 * triggered automatically by the refund webhook) and set when an admin
 * reverses a commission manually from the Commissions panel.
 */
export async function reverseCommission(commissionId: string, adminId: string | null, reason: string) {
  const commission = await prisma.affiliateCommission.findUnique({ where: { id: commissionId } });
  if (!commission) throw new Error("Commission not found");

  await prisma.$transaction([
    prisma.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: "reversed" },
    }),
    prisma.affiliateCommissionAdjustment.create({
      data: {
        commissionId,
        amount: Number(commission.amount) * -1,
        type: "reversal",
        reason,
        adminId,
      },
    }),
  ]);

  await logAuditEvent({
    adminId,
    affiliateId: commission.affiliateId,
    action: "commission_reversed",
    previousValue: { status: commission.status },
    newValue: { status: "reversed" },
    reason,
  });
}

/** Admin action: approve a commission immediately, bypassing the remaining holding period. */
export async function manuallyApproveCommission(commissionId: string, adminId: string) {
  const commission = await prisma.affiliateCommission.findUnique({ where: { id: commissionId } });
  if (!commission) throw new Error("Commission not found");
  if (commission.status !== "pending") throw new Error("Only pending commissions can be approved");

  await prisma.affiliateCommission.update({
    where: { id: commissionId },
    data: { status: "approved", approvedAt: new Date() },
  });
  await prisma.educatorCreditLedgerEntry.updateMany({
    where: { referralId: commission.referralId, status: "pending" },
    data: { status: "approved" },
  });
  await prisma.affiliateReferral.updateMany({
    where: { id: commission.referralId, status: "commission_pending" },
    data: { status: "commission_approved" },
  });

  await logAuditEvent({
    adminId,
    affiliateId: commission.affiliateId,
    action: "commission_approved",
    previousValue: { status: "pending" },
    newValue: { status: "approved" },
    reason: "Manually approved by admin",
  });
}

/** Admin action: reject a pending commission — it will never become payable. */
export async function rejectCommission(commissionId: string, adminId: string, reason: string) {
  const commission = await prisma.affiliateCommission.findUnique({ where: { id: commissionId } });
  if (!commission) throw new Error("Commission not found");

  await prisma.affiliateCommission.update({
    where: { id: commissionId },
    data: { status: "rejected" },
  });

  await logAuditEvent({
    adminId,
    affiliateId: commission.affiliateId,
    action: "commission_rejected",
    previousValue: { status: commission.status },
    newValue: { status: "rejected" },
    reason,
  });
}

/** Admin action: manual commission adjustment (correction) — logged, never a silent edit. */
export async function adjustCommission(
  commissionId: string,
  adminId: string,
  amount: number,
  reason: string
) {
  const adjustment = await prisma.affiliateCommissionAdjustment.create({
    data: { commissionId, amount, type: "manual", reason, adminId },
  });
  const target = await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: commissionId } });
  await logAuditEvent({
    adminId,
    affiliateId: target.affiliateId,
    action: "commission_adjusted",
    newValue: { commissionId, amount, reason },
  });
  return adjustment;
}
