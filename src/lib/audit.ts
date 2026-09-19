import { prisma } from "./prisma";

/**
 * Every significant administrative action must be logged per the program
 * spec (affiliate created/suspended/activated, commission approved/
 * rejected/adjusted/reversed, payout created/marked paid, Cash App changed,
 * tier changed, bonus awarded, etc). Never silently modify or delete
 * history — this is the append-only trail admins and affiliates can review.
 */
export async function logAuditEvent(params: {
  adminId?: string | null;
  affiliateId?: string | null;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}) {
  return prisma.affiliateAuditLog.create({
    data: {
      adminId: params.adminId ?? null,
      affiliateId: params.affiliateId ?? null,
      action: params.action,
      previousValue: params.previousValue === undefined ? undefined : (params.previousValue as any),
      newValue: params.newValue === undefined ? undefined : (params.newValue as any),
      reason: params.reason ?? null,
    },
  });
}
