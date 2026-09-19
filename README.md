# NMSA Affiliate & Referral Program

A standalone Next.js + PostgreSQL application implementing the National Med Spa
Association Affiliate & Referral Program: **REFER. EARN. GROW.**

This is a **brand-new, self-contained system**. It does not modify, read, or
write to the existing NMSA website, practitioner portal, educator portal,
licensing workflows, payment processing, or any existing customer data. It is
designed to integrate with the main NMSA system later through the webhook API
described below.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **PostgreSQL** via **Prisma ORM**
- **NextAuth** (credentials-based) — two separate account kinds: Affiliates and Admins
- **Tailwind CSS** with the NMSA brand palette (`#120670` navy, `#FFDE00` gold)

## Getting started

```bash
npm install
cp .env.example .env
# edit .env — at minimum set DATABASE_URL, NEXTAUTH_SECRET, NMSA_WEBHOOK_SECRET, CRON_SECRET

npx prisma migrate dev --name init
npm run seed        # creates the bootstrap admin, tiers, commission rule,
                     # bonus rules, educator credit rates, marketing resources

npm run dev
```

The seed script creates an admin login from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` in your `.env` (defaults to
`admin@nationalmsa.org` / `ChangeMe123!`) — **change this password
immediately** after your first login at `/admin/login`.

Affiliates sign up at `/affiliate-signup` and log in at `/affiliate/login`.

> **A note on this build:** this codebase was written by hand in a sandboxed
> environment without npm registry access, so `npm install` / `npm run build`
> have not been run here. Everything has been carefully cross-checked for
> consistency (Prisma field names, imports, route signatures), but please run
> `npm run build` yourself as a first step and report anything that surfaces.

## How money moves through the system

1. An affiliate completes signup (Cash App double-entry + confirmation, terms
   acceptance) and the mandatory 4-slide training. Completing training
   activates their unique referral link/code.
2. A prospect clicks `/r/CODE` → a click is logged and a 60-day attribution
   cookie is set → they land on the main NMSA site.
3. The main NMSA site (once connected) calls this system's webhook API as the
   prospect moves through registration → enrollment → completed purchase.
4. A completed, non-fraudulent purchase creates a commission (amount decided
   by the admin-configurable Commission Rules in Admin → Settings — never
   hard-coded) and, for educator affiliates, an additional educator credit
   ledger entry.
5. A commission sits as `pending` for the configurable holding period, then
   becomes `approved` (= available for payout) via the daily
   `approve-commissions` cron job (or an admin can approve it early).
6. On the 1st of each month, the `monthly-payout` cron job reserves each
   affiliate's approved balance into a payout once it reaches the $200
   minimum (configurable). Balances under the minimum are never reset — they
   roll forward automatically.
7. An admin reviews the payout in Admin → Payouts, re-confirms the Cash App
   handle on screen, sends the money in Cash App themselves, then marks the
   payout paid here (recording the reference and snapshotting the handle
   used).

## Integrating with the main NMSA site

This system exposes a small webhook API, authenticated with a shared secret
(`NMSA_WEBHOOK_SECRET`, sent as the `x-nmsa-webhook-secret` header). Call
these from the main NMSA site/backend as the corresponding events happen
there:

- `POST /api/webhooks/nmsa/registration` — a referred prospect creates an
  NMSA account. Body: `{ referralCode?, cookieId?, customerId?, customerName?, customerEmail? }`
- `POST /api/webhooks/nmsa/enrollment` — a registered prospect starts an
  enrollment. Body: `{ referralCode?, customerEmail?, customerId?, enrollmentId, productLabel?, licenseLevel?, termType? }`
- `POST /api/webhooks/nmsa/purchase` — payment completes. This is what
  creates the commission. Body: `{ referralCode?, customerEmail?, customerId?, orderId, purchaseId?, productLabel?, licenseLevel?, termType?, purchaseAmount }`
- `POST /api/webhooks/nmsa/refund` — a completed transaction is refunded,
  cancelled, charged back, or disputed. Reverses any related commission
  (never deletes it). Body: `{ orderId, type: "refunded"|"cancelled"|"chargeback"|"disputed", reason? }`

`cookieId` is the value of the `nmsa_ref_cookie` cookie this system sets when
someone clicks an affiliate's `/r/CODE` link — pass it through if the main
site can read it, for the most precise click-level attribution. Otherwise
`referralCode` (from the `?ref=CODE` query param this system appends when
redirecting to the main site) is enough.

`orderId` is the durable duplicate-commission guard: the first webhook call
for a given `orderId` wins; retries or a second affiliate's link for the same
order are safely no-ops.

## Scheduled jobs

Three endpoints are meant to be hit by a scheduler (cron, a Vercel Cron job,
GitHub Actions, etc), authenticated with `Authorization: Bearer $CRON_SECRET`:

| Endpoint | Suggested schedule | What it does |
|---|---|---|
| `POST /api/cron/approve-commissions` | daily | Moves commissions past their holding period to `approved`; sends below-minimum reminder emails (at most every ~25 days per affiliate) |
| `POST /api/cron/monthly-payout` | 1st of the month | Reserves each eligible affiliate's approved balance into a payout |
| `POST /api/cron/training-reminders` | daily | Reminds affiliates who signed up but haven't finished training after 24h |

Admins can also trigger the monthly payout sweep on demand from Admin →
Payouts → "Run Payout Eligibility Now".

## Email

Every outbound email (all 6 types from the spec: new referral, new
commission, payout ready, payout completed, below minimum, training
reminder) is rendered from branded HTML templates in
`src/lib/email-templates.ts` and logged to `affiliate_email_events` —
viewable in Admin → Email Campaigns.

**Sending is stubbed by default** (`EMAIL_PROVIDER=stub` in `.env`): emails
are rendered and logged but not transmitted. To go live, set
`EMAIL_PROVIDER` to your provider's name and implement `sendViaProvider()` in
`src/lib/email.ts` with that provider's API call (Resend, SendGrid, Postmark,
etc. all work fine here) — everything else stays the same.

## Configuring the program without touching code

Admin → Settings covers everything the spec calls out as admin-configurable:

- Payout minimum, payout day of month, commission holding period
- Commission Rules (fixed / percentage / license-specific / annual /
  biennial / tier-based — scoped by affiliate type, license level, term, and
  tier, with a priority for resolving overlaps)
- Affiliate Tier thresholds
- Monthly referral bonus thresholds and amounts
- Educator credit rates by license level and term

## Project structure

```
prisma/schema.prisma        Full relational schema (see the DATABASE ARCHITECTURE
                             section of the spec — every suggested table is here)
prisma/seed.ts               Bootstrap admin, tiers, default commission rule,
                             bonus rules, educator credit rates, marketing resources
src/lib/                    Commission engine, tiers, bonuses, payouts, fraud
                             checks, email, auth, audit logging — all the
                             business logic, framework-agnostic of the UI
src/app/affiliate-signup/   Public signup flow
src/app/affiliate/login/    Affiliate login (public)
src/app/affiliate/(portal)/ Guarded affiliate portal (dashboard, training,
                             referral link, referrals, earnings, payouts,
                             marketing, profile)
src/app/admin/login/        Admin login (public)
src/app/admin/(panel)/      Guarded admin panel (overview, affiliates,
                             referrals, commissions, payouts, bonuses,
                             marketing, email campaigns, settings, audit log)
src/app/api/webhooks/nmsa/  The integration surface described above
src/app/api/cron/           Scheduled job endpoints
src/app/r/[code]/           Public click-tracking redirect
```

## Security notes

- Passwords are hashed with bcrypt (12 rounds).
- All commission and payout math happens server-side in `src/lib/` —
  nothing is calculated in the browser.
- Admin actions (approve/reject/reverse/adjust commissions, mark payouts
  paid, suspend/activate affiliates, change tiers, etc.) are all written to
  `affiliate_audit_logs` — nothing is silently modified or deleted.
- Webhook and cron endpoints are protected by shared secrets, not sessions,
  since they're called server-to-server.
- Cash App handles are double-entered + explicitly confirmed at signup and
  on every change; the handle used for a payout is permanently snapshotted
  on that payout record even if the affiliate changes their handle later.
