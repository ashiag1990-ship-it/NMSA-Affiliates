import { prisma } from "./prisma";
import { logAuditEvent } from "./audit";

/**
 * An affiliate must never be able to attribute a purchase to themselves.
 * Compared against the affiliate's own account email (case-insensitive) —
 * the strongest signal available to a standalone system that doesn't yet
 * share a customer database with the main NMSA site.
 */
export function isSelfReferral(affiliateEmail: string, customerEmail?: string | null): boolean {
  if (!customerEmail) return false;
  return affiliateEmail.trim().toLowerCase() === customerEmail.trim().toLowerCase();
}

/**
 * First attribution wins: if an orderId has already been recorded against
 * ANY affiliate, a second referral for the same order must never be
 * created (prevents duplicate commissions for the same qualifying
 * transaction, whether from a retried webhook or a manipulated referral
 * code on a second visit).
 */
export async function findExistingReferralForOrder(orderId: string) {
  return prisma.affiliateReferral.findFirst({ where: { orderId } });
}

/** Flags a referral as suspicious for administrator review. Never auto-deletes anything. */
export async function flagReferralForFraud(referralId: string, reason: string) {
  const referral = await prisma.affiliateReferral.update({
    where: { id: referralId },
    data: { fraudFlag: true, fraudReason: reason },
  });
  await logAuditEvent({
    affiliateId: referral.affiliateId,
    action: "referral_flagged_fraud",
    newValue: { referralId, reason },
  });
  return referral;
}
