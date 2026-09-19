import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { affiliateSignupSchema } from "@/lib/validation";
import { getProgramSettings } from "@/lib/settings";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = affiliateSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const email = data.email.toLowerCase().trim();
  const existing = await prisma.affiliate.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An affiliate account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const settings = await getProgramSettings();
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

  const affiliate = await prisma.$transaction(async (tx) => {
    const created = await tx.affiliate.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        phone: data.phone.trim(),
        passwordHash,
        affiliateType: data.affiliateType,
        status: "pending",
        cashAppHandle: data.cashAppHandle.trim(),
        cashAppConfirmedAt: new Date(),
        cashAppHandleUpdatedAt: new Date(),
        profile: {
          create: {
            businessName: data.businessName?.trim() || null,
            website: data.website?.trim() || null,
            instagram: data.instagram?.trim() || null,
            facebook: data.facebook?.trim() || null,
            tiktok: data.tiktok?.trim() || null,
            marketingChannels: data.marketingChannels,
            marketingChannelOther: data.marketingChannelOther?.trim() || null,
          },
        },
        training: {
          create: {
            trainingVersion: settings.trainingVersion,
          },
        },
        termsAcceptances: {
          create: {
            termsVersion: settings.affiliateTermsVersion,
            ipAddress,
          },
        },
      },
      include: { profile: true, training: true },
    });

    // Assign the base tier (0 completed referrals) if one is configured.
    const baseTier = await tx.affiliateTier.findFirst({
      where: { minCompletedReferrals: 0 },
      orderBy: { sortOrder: "asc" },
    });
    if (baseTier) {
      await tx.affiliate.update({ where: { id: created.id }, data: { tierId: baseTier.id } });
    }

    return created;
  });

  await logAuditEvent({
    affiliateId: affiliate.id,
    action: "affiliate_created",
    newValue: { email, affiliateType: data.affiliateType },
  });

  return NextResponse.json({ ok: true, affiliateId: affiliate.id });
}
