// Branded NMSA email templates (navy #120670 / gold #FFDE00). Kept as plain
// functions returning { subject, html } so lib/email.ts can hand them
// straight to a real provider once one is wired up — nothing here assumes
// a particular ESP's template syntax.
//
// Every template takes a `locale` and renders from the matching dictionary
// (src/i18n/dictionaries) so an affiliate who has chosen Spanish receives
// Spanish transactional emails, regardless of the admin's own language.

import { getDictionaryFor } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/interpolate";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

const wrapper = (dict: ReturnType<typeof getDictionaryFor>, bodyHtml: string) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F4F5F8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F5F8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(18,6,112,0.08);">
            <tr>
              <td style="background-color:#120670;padding:28px 32px;">
                <span style="color:#FFDE00;font-size:20px;font-weight:800;letter-spacing:0.5px;">NMSA</span>
                <span style="color:#ffffff;font-size:14px;font-weight:600;margin-left:8px;">${dict.home.badge}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#120670;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F4F5F8;color:#6B7280;font-size:12px;">
                ${dict.emails.footer}<br/>
                ${dict.emails.tagline}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const money = (n: number) => `$${n.toFixed(2)}`;

function resolveLocale(locale?: Locale | string | null): Locale {
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function newReferralEmail(params: {
  referralName?: string | null;
  referralDate: Date;
  status: string;
  locale?: Locale | string | null;
}) {
  const dict = getDictionaryFor(resolveLocale(params.locale));
  const e = dict.emails.newReferral;
  return {
    subject: e.subject,
    html: wrapper(
      dict,
      `
      <h1 style="font-size:22px;margin:0 0 12px;">${e.heading}</h1>
      <p style="font-size:15px;line-height:1.6;">${e.intro}</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.referral}</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.referralName || e.newProspect}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.date}</td><td style="padding:8px 0;text-align:right;">${params.referralDate.toLocaleDateString()}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.status}</td><td style="padding:8px 0;text-align:right;">${params.status}</td></tr>
      </table>
      <p style="font-size:13px;color:#6B7280;">${e.footer}</p>
    `
    ),
  };
}

export function newCommissionEmail(params: {
  amount: number;
  availableBalance: number;
  pendingBalance: number;
  locale?: Locale | string | null;
}) {
  const dict = getDictionaryFor(resolveLocale(params.locale));
  const e = dict.emails.newCommission;
  return {
    subject: e.subject,
    html: wrapper(
      dict,
      `
      <h1 style="font-size:22px;margin:0 0 12px;">${e.heading}</h1>
      <p style="font-size:15px;line-height:1.6;">${interpolate(e.intro, { amount: money(params.amount) })}</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.availableBalance}</td><td style="padding:8px 0;text-align:right;font-weight:700;">${money(params.availableBalance)}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.pendingBalance}</td><td style="padding:8px 0;text-align:right;">${money(params.pendingBalance)}</td></tr>
      </table>
    `
    ),
  };
}

export function payoutReadyEmail(params: {
  amount: number;
  payoutDate: string;
  cashAppHandle?: string | null;
  locale?: Locale | string | null;
}) {
  const dict = getDictionaryFor(resolveLocale(params.locale));
  const e = dict.emails.payoutReady;
  return {
    subject: e.subject,
    html: wrapper(
      dict,
      `
      <h1 style="font-size:22px;margin:0 0 12px;">${e.heading}</h1>
      <p style="font-size:15px;line-height:1.6;">${e.intro}</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.availablePayout}</td><td style="padding:8px 0;text-align:right;font-weight:700;">${money(params.amount)}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.scheduledDate}</td><td style="padding:8px 0;text-align:right;">${params.payoutDate}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.cashAppOnFile}</td><td style="padding:8px 0;text-align:right;">${params.cashAppHandle || e.notSet}</td></tr>
      </table>
      <p style="font-size:13px;color:#6B7280;">${e.footer}</p>
    `
    ),
  };
}

export function payoutCompletedEmail(params: {
  amount: number;
  paymentDate: Date;
  paymentReference?: string | null;
  locale?: Locale | string | null;
}) {
  const dict = getDictionaryFor(resolveLocale(params.locale));
  const e = dict.emails.payoutCompleted;
  return {
    subject: e.subject,
    html: wrapper(
      dict,
      `
      <h1 style="font-size:22px;margin:0 0 12px;">${e.heading}</h1>
      <p style="font-size:15px;line-height:1.6;">${interpolate(e.intro, { amount: money(params.amount) })}</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.paymentDate}</td><td style="padding:8px 0;text-align:right;">${params.paymentDate.toLocaleDateString()}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.paymentMethod}</td><td style="padding:8px 0;text-align:right;">${e.cashApp}</td></tr>
        ${params.paymentReference ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:13px;">${e.reference}</td><td style="padding:8px 0;text-align:right;">${params.paymentReference}</td></tr>` : ""}
      </table>
    `
    ),
  };
}

export function belowMinimumEmail(params: { balance: number; minimum: number; locale?: Locale | string | null }) {
  const dict = getDictionaryFor(resolveLocale(params.locale));
  const e = dict.emails.belowMinimum;
  const remaining = Math.max(0, params.minimum - params.balance);
  return {
    subject: e.subject,
    html: wrapper(
      dict,
      `
      <h1 style="font-size:22px;margin:0 0 12px;">${e.heading}</h1>
      <p style="font-size:15px;line-height:1.6;">${interpolate(e.intro, { balance: money(params.balance), minimum: money(params.minimum) })}</p>
      <p style="font-size:15px;line-height:1.6;">${interpolate(e.body, { remaining: money(remaining) })}</p>
    `
    ),
  };
}

export function trainingReminderEmail(params: { locale?: Locale | string | null } = {}) {
  const dict = getDictionaryFor(resolveLocale(params.locale));
  const e = dict.emails.trainingReminder;
  return {
    subject: e.subject,
    html: wrapper(
      dict,
      `
      <h1 style="font-size:22px;margin:0 0 12px;">${e.heading}</h1>
      <p style="font-size:15px;line-height:1.6;">${e.body}</p>
    `
    ),
  };
}
