import { prisma } from "./prisma";
import { getAffiliateBalances } from "./balances";
import { getProgramSettings } from "./settings";
import {
  newReferralEmail,
  newCommissionEmail,
  payoutReadyEmail,
  payoutCompletedEmail,
  belowMinimumEmail,
  trainingReminderEmail,
} from "./email-templates";
import type { EmailType } from "@prisma/client";

type EmailPayload = Record<string, unknown>;

/**
 * Single choke point for every outbound affiliate email. Every send — real
 * or stubbed — is logged to affiliate_email_events so there's a full,
 * queryable history in the admin panel regardless of whether a live
 * provider is connected yet.
 *
 * EMAIL_PROVIDER defaults to "stub": the email is rendered and logged but
 * never actually transmitted. To go live, set EMAIL_PROVIDER (e.g.
 * "resend") and fill in sendViaProvider() below with that provider's API
 * call — everything else (triggers, templates, logging) stays the same.
 */
export async function sendAffiliateEmail(affiliateId: string, type: EmailType, payload: EmailPayload = {}) {
  try {
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) return;

    const { subject, html } = await renderTemplate(affiliateId, type, payload);
    const provider = process.env.EMAIL_PROVIDER || "stub";

    if (provider === "stub") {
      await prisma.affiliateEmailEvent.create({
        data: {
          affiliateId,
          type,
          subject,
          status: "stubbed",
          payload: payload as any,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`[email:stub] ${type} -> ${affiliate.email} :: ${subject}`);
      return;
    }

    try {
      await sendViaProvider(affiliate.email, subject, html);
      await prisma.affiliateEmailEvent.create({
        data: { affiliateId, type, subject, status: "sent", payload: payload as any },
      });
    } catch (err) {
      await prisma.affiliateEmailEvent.create({
        data: {
          affiliateId,
          type,
          subject,
          status: "failed",
          payload: payload as any,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  } catch (err) {
    // Email is best-effort — a failure here must never break the referral,
    // commission, or payout flow that triggered it.
    // eslint-disable-next-line no-console
    console.error("sendAffiliateEmail failed", err);
  }
}

async function renderTemplate(affiliateId: string, type: EmailType, payload: EmailPayload) {
  const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId }, select: { locale: true } });
  const locale = affiliate?.locale;

  switch (type) {
    case "new_referral":
      return newReferralEmail({
        referralName: (payload.referralName as string) ?? null,
        referralDate: (payload.referralDate as Date) ?? new Date(),
        status: (payload.status as string) ?? "Registered",
        locale,
      });
    case "new_commission": {
      const balances = await getAffiliateBalances(affiliateId);
      return newCommissionEmail({
        amount: Number(payload.amount ?? 0),
        availableBalance: balances.cashAvailable,
        pendingBalance: balances.cashPending,
        locale,
      });
    }
    case "payout_ready": {
      const settings = await getProgramSettings();
      return payoutReadyEmail({
        amount: Number(payload.amount ?? 0),
        payoutDate: `The ${ordinal(settings.payoutDayOfMonth)} of next month`,
        cashAppHandle: (payload.cashAppHandle as string) ?? null,
        locale,
      });
    }
    case "payout_completed":
      return payoutCompletedEmail({
        amount: Number(payload.amount ?? 0),
        paymentDate: (payload.paymentDate as Date) ?? new Date(),
        paymentReference: (payload.paymentReference as string) ?? null,
        locale,
      });
    case "below_minimum": {
      const settings = await getProgramSettings();
      return belowMinimumEmail({
        balance: Number(payload.balance ?? 0),
        minimum: Number(settings.payoutMinimum),
        locale,
      });
    }
    case "training_reminder":
      return trainingReminderEmail({ locale });
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sendViaProvider(_to: string, _subject: string, _html: string): Promise<void> {
  // Intentionally left as a stub — wire up Resend/SendGrid/Postmark/etc.
  // here when ready. EMAIL_PROVIDER must also be set to something other
  // than "stub" for this to ever be called.
  throw new Error("No live email provider configured — set EMAIL_PROVIDER and implement sendViaProvider().");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
