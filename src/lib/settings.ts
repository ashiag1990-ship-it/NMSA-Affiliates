import { prisma } from "./prisma";
import type { ProgramSettings } from "@prisma/client";

/**
 * Program settings are a singleton row (id = 1) so the admin Settings page
 * can change the payout minimum, payout day, commission holding period,
 * etc. without a code change or redeploy. Falls back to sane defaults (and
 * creates the row) if it hasn't been seeded yet.
 */
export async function getProgramSettings(): Promise<ProgramSettings> {
  const existing = await prisma.programSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.programSettings.create({
    data: {
      id: 1,
      payoutMinimum: 200,
      payoutDayOfMonth: 1,
      commissionHoldingDays: 14,
      trainingVersion: "1.0",
      affiliateTermsVersion: "1.0",
    },
  });
}
