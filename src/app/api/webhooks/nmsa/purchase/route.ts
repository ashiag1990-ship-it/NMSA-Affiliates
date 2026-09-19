import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyNmsaWebhookSecret } from "@/lib/api-auth";
import { isSelfReferral, findExistingReferralForOrder, flagReferralForFraud } from "@/lib/fraud";
import { createCommissionForReferral } from "@/lib/commission-engine";
import { recalcAffiliateTier } from "@/lib/tiers";
import { evaluateMonthlyBonuses } from "@/lib/bonuses";
import { logAuditEvent } from "@/lib/audit";

const schema = z.object({
  referralCode: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  orderId: z.string(),
  purchaseId: z.string().optional(),
  productLabel: z.string().optional(),
  licenseLevel: z.enum(["I", "II", "III"]).optional(),
  termType: z.enum(["annual", "biennial"]).optional(),
  purchaseAmount: z.number().nonnegative(),
});

/**
 * The critical event: called when a referred prospect's payment
 * successfully completes. This is what turns a referral into a qualifying
 * referral and triggers commission creation. `orderId` is the
 * duplicate-commission guard — first attribution for a given order wins,
 * a retried or duplicated webhook call for the same order is a no-op.
 */
export async function POST(req: NextRequest) {
  if (!verifyNmsaWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const alreadyProcessed = await findExistingReferralForOrder(data.orderId);
  if (alreadyProcessed && alreadyProcessed.purchaseTimestamp) {
    return NextResponse.json({ ok: true, referralId: alreadyProcessed.id, note: "Order already processed" });
  }

  const referral =
    alreadyProcessed ||
    (await prisma.affiliateReferral.findFirst({
      where: {
        OR: [
          data.customerEmail ? { customerEmail: data.customerEmail } : undefined,
          data.customerId ? { customerId: data.customerId } : undefined,
          data.referralCode ? { referralCode: data.referralCode.toUpperCase() } : undefined,
        ].filter(Boolean) as any,
        status: { notIn: ["paid", "cancelled", "refunded"] },
      },
      orderBy: { createdAt: "desc" },
    }));

  if (!referral) {
    return NextResponse.json({ error: "No matching in-flight referral found for this customer" }, { status: 404 });
  }

  const affiliate = await prisma.affiliate.findUniqueOrThrow({ where: { id: referral.affiliateId } });
  const selfReferral = isSelfReferral(affiliate.email, data.customerEmail ?? referral.customerEmail);

  const updated = await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: {
      orderId: data.orderId,
      purchaseId: data.purchaseId,
      productLabel: data.productLabel ?? referral.productLabel,
      licenseLevel: data.licenseLevel ?? referral.licenseLevel,
      termType: data.termType ?? referral.termType,
      purchaseAmount: data.purchaseAmount,
      purchaseTimestamp: new Date(),
      status: "completed",
    },
  });

  if (selfReferral) {
    await flagReferralForFraud(updated.id, "self_referral");
    await logAuditEvent({
      affiliateId: affiliate.id,
      action: "purchase_recorded_no_commission",
      newValue: { referralId: updated.id, reason: "self_referral" },
    });
    return NextResponse.json({ ok: true, referralId: updated.id, commission: null, flagged: "self_referral" });
  }

  const commission = await createCommissionForReferral(updated.id);
  if (commission) {
    await prisma.affiliateReferral.update({ where: { id: updated.id }, data: { status: "commission_pending" } });
  }

  await recalcAffiliateTier(affiliate.id);
  await evaluateMonthlyBonuses(affiliate.id);

  return NextResponse.json({ ok: true, referralId: updated.id, commissionId: commission?.id ?? null });
}
