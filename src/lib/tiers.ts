import { ReferralStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { logAuditEvent } from "./audit";

// A referral counts toward tier progress once its underlying purchase has
// actually completed (not merely clicked/registered) and it isn't flagged
// fraudulent. Later stages (commission_pending/approved/paid) are included
// because the purchase itself already completed by that point.
const COMPLETED_STATUSES: ReferralStatus[] = ["completed", "commission_pending", "commission_approved", "paid"];

export async function countCompletedReferrals(affiliateId: string): Promise<number> {
  return prisma.affiliateReferral.count({
    where: {
      affiliateId,
      status: { in: COMPLETED_STATUSES },
      fraudFlag: false,
    },
  });
}

/**
 * Re-evaluates and, if needed, updates an affiliate's tier based on their
 * completed-referral count against the admin-configured tier thresholds.
 * One completed qualifying referral is enough to become an ACTIVE (paid)
 * affiliate — tiers above that are for bonus/rate purposes only, never a
 * gate on earning commissions at all.
 */
export async function recalcAffiliateTier(affiliateId: string) {
  const completedCount = await countCompletedReferrals(affiliateId);

  const tiers = await prisma.affiliateTier.findMany({ orderBy: { minCompletedReferrals: "desc" } });
  const newTier = tiers.find((t) => completedCount >= t.minCompletedReferrals);

  const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
  if (!affiliate) return;

  if (newTier && newTier.id !== affiliate.tierId) {
    await prisma.affiliate.update({ where: { id: affiliateId }, data: { tierId: newTier.id } });
    await logAuditEvent({
      affiliateId,
      action: "tier_changed",
      previousValue: { tierId: affiliate.tierId },
      newValue: { tierId: newTier.id, tierName: newTier.name, completedReferrals: completedCount },
      reason: "Automatic re-evaluation after referral status change",
    });
  }

  return newTier ?? null;
}

/** Whether an affiliate has at least one completed qualifying referral (i.e. is a paid-eligible affiliate). */
export async function isAffiliatePaidEligible(affiliateId: string): Promise<boolean> {
  const count = await countCompletedReferrals(affiliateId);
  return count >= 1;
}
