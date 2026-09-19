import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyNmsaWebhookSecret } from "@/lib/api-auth";
import { isSelfReferral, flagReferralForFraud } from "@/lib/fraud";
import { sendAffiliateEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

const schema = z.object({
  referralCode: z.string().optional(),
  cookieId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

/**
 * Called by the main NMSA site (once connected) the moment a prospect who
 * arrived through an affiliate link creates an NMSA account. Not a
 * qualifying purchase yet — just advances the referral to "registered" so
 * affiliates can see it moving in their dashboard.
 */
export async function POST(req: NextRequest) {
  if (!verifyNmsaWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (!parsed.data.referralCode && !parsed.data.cookieId)) {
    return NextResponse.json({ error: "referralCode or cookieId is required" }, { status: 400 });
  }
  const data = parsed.data;

  const click = data.cookieId
    ? await prisma.affiliateClick.findUnique({ where: { cookieId: data.cookieId }, include: { referralLink: true } })
    : null;

  const link =
    click?.referralLink ||
    (data.referralCode
      ? await prisma.affiliateReferralLink.findFirst({ where: { code: data.referralCode.toUpperCase(), active: true } })
      : null);

  if (!link) {
    return NextResponse.json({ error: "No matching affiliate referral link found" }, { status: 404 });
  }

  const affiliate = await prisma.affiliate.findUniqueOrThrow({ where: { id: link.affiliateId } });

  // Reuse an existing in-flight referral for this customer/affiliate pair
  // rather than creating a duplicate every time a webhook is retried.
  const existing = data.customerEmail
    ? await prisma.affiliateReferral.findFirst({
        where: {
          affiliateId: affiliate.id,
          customerEmail: data.customerEmail,
          status: { notIn: ["paid", "cancelled", "refunded"] },
        },
      })
    : null;

  const referral = existing
    ? await prisma.affiliateReferral.update({
        where: { id: existing.id },
        data: {
          status: "registered",
          registrationTimestamp: new Date(),
          customerId: data.customerId ?? existing.customerId,
          customerName: data.customerName ?? existing.customerName,
        },
      })
    : await prisma.affiliateReferral.create({
        data: {
          affiliateId: affiliate.id,
          referralLinkId: link.id,
          clickId: click?.id,
          referralCode: link.code,
          customerId: data.customerId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          status: "registered",
          clickTimestamp: click?.clickedAt,
          registrationTimestamp: new Date(),
        },
      });

  if (isSelfReferral(affiliate.email, data.customerEmail)) {
    await flagReferralForFraud(referral.id, "self_referral");
  }

  await logAuditEvent({
    affiliateId: affiliate.id,
    action: "referral_registered",
    newValue: { referralId: referral.id, customerEmail: data.customerEmail },
  });

  await sendAffiliateEmail(affiliate.id, "new_referral", {
    referralName: data.customerName,
    referralDate: new Date(),
    status: "Registered",
  });

  return NextResponse.json({ ok: true, referralId: referral.id });
}
