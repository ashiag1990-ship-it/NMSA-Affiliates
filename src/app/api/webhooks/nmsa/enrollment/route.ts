import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyNmsaWebhookSecret } from "@/lib/api-auth";
import { logAuditEvent } from "@/lib/audit";

const schema = z.object({
  referralCode: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  enrollmentId: z.string(),
  productLabel: z.string().optional(),
  licenseLevel: z.enum(["I", "II", "III"]).optional(),
  termType: z.enum(["annual", "biennial"]).optional(),
});

/**
 * Called when a registered prospect starts an NMSA enrollment (before
 * payment completes). Advances the referral to "enrolled".
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
  const data = parsed.data;

  const referral = await prisma.affiliateReferral.findFirst({
    where: {
      OR: [
        data.customerEmail ? { customerEmail: data.customerEmail } : undefined,
        data.customerId ? { customerId: data.customerId } : undefined,
        data.referralCode ? { referralCode: data.referralCode.toUpperCase() } : undefined,
      ].filter(Boolean) as any,
      status: { notIn: ["paid", "cancelled", "refunded"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!referral) {
    return NextResponse.json({ error: "No matching in-flight referral found for this customer" }, { status: 404 });
  }

  const updated = await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: {
      status: "enrolled",
      enrollmentTimestamp: new Date(),
      enrollmentId: data.enrollmentId,
      productLabel: data.productLabel ?? referral.productLabel,
      licenseLevel: data.licenseLevel ?? referral.licenseLevel,
      termType: data.termType ?? referral.termType,
    },
  });

  await logAuditEvent({
    affiliateId: referral.affiliateId,
    action: "referral_enrolled",
    newValue: { referralId: referral.id, enrollmentId: data.enrollmentId },
  });

  return NextResponse.json({ ok: true, referralId: updated.id });
}
