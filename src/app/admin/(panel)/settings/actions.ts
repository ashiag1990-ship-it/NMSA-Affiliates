"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logAuditEvent } from "@/lib/audit";

async function requireAdmin() {
  const session = await requireAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function updateProgramSettings(formData: FormData) {
  const session = await requireAdmin();
  const before = await prisma.programSettings.findUnique({ where: { id: 1 } });

  const data = {
    payoutMinimum: Number(formData.get("payoutMinimum")),
    payoutDayOfMonth: Number(formData.get("payoutDayOfMonth")),
    commissionHoldingDays: Number(formData.get("commissionHoldingDays")),
    trainingVersion: String(formData.get("trainingVersion") || "1.0"),
    affiliateTermsVersion: String(formData.get("affiliateTermsVersion") || "1.0"),
  };

  await prisma.programSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  await logAuditEvent({
    adminId: session.user.id,
    action: "program_settings_updated",
    previousValue: before,
    newValue: data,
  });

  revalidatePath("/admin/settings");
}

export async function createCommissionRule(formData: FormData) {
  const session = await requireAdmin();
  const fixedAmount = formData.get("fixedAmount");
  const percentage = formData.get("percentage");

  const rule = await prisma.commissionRule.create({
    data: {
      name: String(formData.get("name")),
      type: formData.get("type") as any,
      affiliateType: (formData.get("affiliateType") as any) || null,
      licenseLevel: (formData.get("licenseLevel") as any) || null,
      termType: (formData.get("termType") as any) || null,
      fixedAmount: fixedAmount ? Number(fixedAmount) : null,
      percentage: percentage ? Number(percentage) : null,
      priority: Number(formData.get("priority") || 0),
      active: true,
    },
  });

  await logAuditEvent({ adminId: session.user.id, action: "commission_rule_created", newValue: rule });
  revalidatePath("/admin/settings");
}

export async function toggleCommissionRule(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const rule = await prisma.commissionRule.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.commissionRule.update({ where: { id }, data: { active: !rule.active } });
  await logAuditEvent({
    adminId: session.user.id,
    action: "commission_rule_toggled",
    previousValue: { active: rule.active },
    newValue: { active: updated.active },
  });
  revalidatePath("/admin/settings");
}

export async function createTier(formData: FormData) {
  const session = await requireAdmin();
  const max = formData.get("maxCompletedReferrals");
  const tier = await prisma.affiliateTier.create({
    data: {
      name: String(formData.get("name")),
      minCompletedReferrals: Number(formData.get("minCompletedReferrals")),
      maxCompletedReferrals: max ? Number(max) : null,
      sortOrder: Number(formData.get("sortOrder") || 0),
    },
  });
  await logAuditEvent({ adminId: session.user.id, action: "tier_created", newValue: tier });
  revalidatePath("/admin/settings");
}

export async function updateTierThreshold(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const before = await prisma.affiliateTier.findUniqueOrThrow({ where: { id } });
  const max = formData.get("maxCompletedReferrals");
  const updated = await prisma.affiliateTier.update({
    where: { id },
    data: {
      minCompletedReferrals: Number(formData.get("minCompletedReferrals")),
      maxCompletedReferrals: max ? Number(max) : null,
    },
  });
  await logAuditEvent({
    adminId: session.user.id,
    action: "tier_thresholds_updated",
    previousValue: { min: before.minCompletedReferrals, max: before.maxCompletedReferrals },
    newValue: { min: updated.minCompletedReferrals, max: updated.maxCompletedReferrals },
  });
  revalidatePath("/admin/settings");
}

export async function createBonusRule(formData: FormData) {
  const session = await requireAdmin();
  const rule = await prisma.affiliateBonusRule.create({
    data: {
      name: String(formData.get("name")),
      thresholdCount: Number(formData.get("thresholdCount")),
      bonusAmount: Number(formData.get("bonusAmount")),
      active: true,
    },
  });
  await logAuditEvent({ adminId: session.user.id, action: "bonus_rule_created", newValue: rule });
  revalidatePath("/admin/settings");
}

export async function toggleBonusRule(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const rule = await prisma.affiliateBonusRule.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.affiliateBonusRule.update({ where: { id }, data: { active: !rule.active } });
  await logAuditEvent({
    adminId: session.user.id,
    action: "bonus_rule_toggled",
    previousValue: { active: rule.active },
    newValue: { active: updated.active },
  });
  revalidatePath("/admin/settings");
}

export async function updateEducatorCreditRate(formData: FormData) {
  const session = await requireAdmin();
  const licenseLevel = formData.get("licenseLevel") as any;
  const termType = formData.get("termType") as any;
  const creditAmount = Number(formData.get("creditAmount"));

  const updated = await prisma.educatorCreditRate.upsert({
    where: { licenseLevel_termType: { licenseLevel, termType } },
    update: { creditAmount, active: true },
    create: { licenseLevel, termType, creditAmount, active: true },
  });

  await logAuditEvent({
    adminId: session.user.id,
    action: "educator_credit_rate_updated",
    newValue: updated,
  });
  revalidatePath("/admin/settings");
}
