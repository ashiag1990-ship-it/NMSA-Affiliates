import { customAlphabet } from "nanoid";
import { prisma } from "./prisma";

// Uppercase letters + digits, no ambiguous characters (0/O, 1/I) — easy for
// an affiliate to read aloud or type from a business card.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(ALPHABET, 6);

/** Generates a unique referral code, retrying on the (very rare) collision. */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generate();
    const existingLink = await prisma.affiliateReferralLink.findUnique({ where: { code } });
    if (!existingLink) return code;
  }
  throw new Error("Could not generate a unique referral code after 10 attempts");
}

export function buildReferralUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_NMSA_SITE_URL || "https://nationalmsa.org";
  return `${base}/?ref=${code}`;
}

export function buildTrackingRedirectUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/r/${code}`;
}

const COOKIE_NAME = "nmsa_ref_cookie";
const CLICK_ATTRIBUTION_DAYS = 60;

export const referralCookie = {
  name: COOKIE_NAME,
  maxAgeSeconds: CLICK_ATTRIBUTION_DAYS * 24 * 60 * 60,
};
