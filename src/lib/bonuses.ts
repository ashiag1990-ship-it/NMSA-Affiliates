import { prisma } from "./prisma";
import { logAuditEvent } from "./audit";

/**
 * Evaluates an affiliate's completed-referral count for a given calendar
 * month against the admin-configured monthly bonus thresholds, and awards
 * any newly-qualified bonuses. The unique constraint on
 * (affiliateId, bonusMonth, bonusRuleId) is the actual duplicate-award
 * guard — this function is safe to call repeatedly (e.g. once per new
 * completed referral) without double-awarding.
 */
export async function evaluateMonthlyBonuses(affiliateId: string, referenceDate: Date = new Date()) {
  const bonusMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  const completedThisMonth = await prisma.affiliateReferral.count({
    where: {
      affiliateId,
      fraudFlag: false,
      status: { in: ["completed", "commission_pending", "commission_approved", "paid"] },
      purchaseTimestamp: { gte: monthStart, lt: monthEnd },
    },
  });

  const rules = await prisma.affiliateBonusRule.findMany({
    where: { active: true, thresholdCount: { lte: completedThisMonth } },
    orderBy: { thresholdCount: "asc" },
  });

  const awarded = [];
  for (const rule of rules) {
    const existing = await prisma.affiliateBonus.findUnique({
      where: {
        affiliateId_bonusMonth_bonusRuleId: {
          affiliateId,
          bonusMonth,
          bonusRuleId: rule.id,
        },
      },
    });
    if (existing) continue;

    const bonus = await prisma.affiliateBonus.create({
      data: {
        affiliateId,
        bonusRuleId: rule.id,
        bonusMonth,
        threshold: rule.thresholdCount,
        bonusAmount: rule.bonusAmount,
        status: "awarded",
        dateAwarded: new Date(),
      },
    });

    await logAuditEvent({
      affiliateId,
      action: "bonus_awarded",
      newValue: { bonusId: bonus.id, bonusMonth, threshold: rule.thresholdCount, amount: rule.bonusAmount },
    });

    awarded.push(bonus);
  }

  return awarded;
}
