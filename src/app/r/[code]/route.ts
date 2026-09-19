import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { referralCookie } from "@/lib/referral";

/**
 * Public click-tracking redirect: /r/ABC123 -> logs the click, drops a
 * long-lived attribution cookie, then sends the visitor on to the main
 * NMSA site with ?ref=CODE preserved (so the main site can also read the
 * code directly once it integrates with this system's API).
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code?.toUpperCase();
  const nmsaSite = process.env.NEXT_PUBLIC_NMSA_SITE_URL || "https://nationalmsa.org";
  const fallbackUrl = new URL(nmsaSite);

  const link = await prisma.affiliateReferralLink.findFirst({ where: { code, active: true } });
  if (!link) {
    return NextResponse.redirect(fallbackUrl);
  }

  const cookieId = crypto.randomUUID();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;

  await prisma.affiliateClick.create({
    data: {
      affiliateId: link.affiliateId,
      referralLinkId: link.id,
      referralCode: code,
      cookieId,
      ipHash,
      userAgent: req.headers.get("user-agent") || undefined,
      landingUrl: nmsaSite,
    },
  });

  const destination = new URL(nmsaSite);
  destination.searchParams.set("ref", code);

  const response = NextResponse.redirect(destination);
  response.cookies.set(referralCookie.name, cookieId, {
    maxAge: referralCookie.maxAgeSeconds,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
