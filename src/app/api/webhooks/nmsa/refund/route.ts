import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyNmsaWebhookSecret } from "@/lib/api-auth";
import { reverseCommission } from "@/lib/commission-engine";
import { recalcAffiliateTier } from "@/lib/tiers";
import { logAuditEvent } from "@/lib/audit";

const schema = z.object({
  orderId: z.string(),
  type: z.enum(["refunded", "cancelled", "chargeback", "disputed"]),
  reason: z.string().optional(),
});

/**
 * Called when a previously-completed NMSA transaction is refunded,
 * cancelled, charged back, or disputed. Reverses any commission tied to
 * that order (never deletes it — a commission_adjustment + audit entry
 * record why) and marks the referral so it no longer counts toward tier
 * or bonus thresholds.
 */
export async function POST(req: NextRequest) {
  if (!verifyNmsaWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { orderId, type, reason } = parsed.data;

  const referral = await prisma.affiliateReferral.findFirst({
    where: { orderId },
    include: { commissions: true },
  });
  if (!referral) {
    return NextResponse.json({ error: "No referral found for this orderId" }, { status: 404 });
  }

  const newStatus = type === "cancelled" ? "cancelled" : "refunded";

  await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: { status: newStatus },
  });

  for (const commission of referral.commissions) {
    // Reverse anything not already reversed/rejected — including an
    // already-PAID commission, which still gets flagged via an audited
    // adjustment even though the Cash App payment itself was already
    // sent; recovering it is a manual admin/collections matter.
    if (["pending", "approved", "paid"].includes(commission.status)) {
      await reverseCommission(commission.id, null, reason || `Order ${type}`);
    }
  }

  await recalcAffiliateTier(referral.affiliateId);

  await logAuditEvent({
    affiliateId: referral.affiliateId,
    action: "referral_" + newStatus,
    newValue: { referralId: referral.id, orderId, type, reason },
  });

  return NextResponse.json({ ok: true, referralId: referral.id });
}
