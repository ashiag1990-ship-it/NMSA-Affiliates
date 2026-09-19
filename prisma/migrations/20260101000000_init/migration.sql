-- ============================================================================
-- NMSA Affiliate & Referral Program — initial schema
-- Hand-written to match prisma/schema.prisma exactly (this environment
-- cannot run `prisma migrate dev` to auto-generate migrations because
-- registry.npmjs.org is blocked, so `prisma` itself cannot be installed).
-- Structure follows Prisma's own generated-migration convention:
-- enums -> tables -> indexes -> foreign keys.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE "AffiliateType" AS ENUM ('educator', 'practitioner', 'general');
CREATE TYPE "AffiliateStatus" AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin');
CREATE TYPE "ReferralStatus" AS ENUM ('clicked', 'registered', 'enrolled', 'payment_pending', 'completed', 'commission_pending', 'commission_approved', 'paid', 'cancelled', 'refunded');
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'approved', 'available', 'paid', 'rejected', 'reversed');
CREATE TYPE "CommissionRuleType" AS ENUM ('fixed', 'percentage', 'license_specific', 'annual', 'biennial', 'tier', 'bonus');
CREATE TYPE "LicenseLevel" AS ENUM ('I', 'II', 'III');
CREATE TYPE "TermType" AS ENUM ('annual', 'biennial');
CREATE TYPE "BonusStatus" AS ENUM ('pending', 'awarded', 'paid', 'cancelled');
CREATE TYPE "PayoutStatus" AS ENUM ('balance_owed', 'eligible', 'processing', 'paid', 'on_hold');
CREATE TYPE "EmailType" AS ENUM ('new_referral', 'new_commission', 'payout_ready', 'payout_completed', 'below_minimum', 'training_reminder');
CREATE TYPE "EmailStatus" AS ENUM ('stubbed', 'sent', 'failed');
CREATE TYPE "AdjustmentType" AS ENUM ('manual', 'reversal', 'correction');
CREATE TYPE "MarketingResourceType" AS ENUM ('overview', 'marketing_post', 'licensing_info', 'social_graphic', 'social_caption', 'email_template', 'approved_language', 'faq');
CREATE TYPE "Locale" AS ENUM ('en', 'es');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliates" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "affiliateType" "AffiliateType" NOT NULL DEFAULT 'general',
    "status" "AffiliateStatus" NOT NULL DEFAULT 'pending',
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "tierId" TEXT,
    "cashAppHandle" TEXT,
    "cashAppHandleUpdatedAt" TIMESTAMP(3),
    "cashAppConfirmedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_profiles" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "businessName" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "tiktok" TEXT,
    "marketingChannels" TEXT[],
    "marketingChannelOther" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_training" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "trainingStarted" BOOLEAN NOT NULL DEFAULT false,
    "trainingStartedAt" TIMESTAMP(3),
    "currentSlide" INTEGER NOT NULL DEFAULT 1,
    "slidesCompleted" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "trainingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "trainingCompletedAt" TIMESTAMP(3),
    "trainingVersion" TEXT NOT NULL DEFAULT '1.0',
    "trainingReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_training_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_referral_links" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_referral_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralLinkId" TEXT,
    "referralCode" TEXT NOT NULL,
    "cookieId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "landingUrl" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_referrals" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralLinkId" TEXT,
    "clickId" TEXT,
    "referralCode" TEXT NOT NULL,
    "referralSource" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "enrollmentId" TEXT,
    "orderId" TEXT,
    "purchaseId" TEXT,
    "productLabel" TEXT,
    "licenseLevel" "LicenseLevel",
    "termType" "TermType",
    "purchaseAmount" DECIMAL(10,2),
    "status" "ReferralStatus" NOT NULL DEFAULT 'clicked',
    "clickTimestamp" TIMESTAMP(3),
    "registrationTimestamp" TIMESTAMP(3),
    "enrollmentTimestamp" TIMESTAMP(3),
    "purchaseTimestamp" TIMESTAMP(3),
    "fraudFlag" BOOLEAN NOT NULL DEFAULT false,
    "fraudReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommissionRuleType" NOT NULL,
    "affiliateType" "AffiliateType",
    "licenseLevel" "LicenseLevel",
    "termType" "TermType",
    "tierId" TEXT,
    "fixedAmount" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_commissions" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "commissionRuleId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'pending',
    "holdUntil" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_commission_adjustments" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_commission_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minCompletedReferrals" INTEGER NOT NULL,
    "maxCompletedReferrals" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "affiliate_tiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_bonus_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thresholdCount" INTEGER NOT NULL,
    "bonusAmount" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_bonus_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_bonuses" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "bonusRuleId" TEXT,
    "bonusMonth" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "bonusAmount" DECIMAL(10,2) NOT NULL,
    "status" "BonusStatus" NOT NULL DEFAULT 'pending',
    "dateAwarded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_bonuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_payouts" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'balance_owed',
    "paymentMethod" TEXT NOT NULL DEFAULT 'Cash App',
    "cashAppHandleUsed" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "adminNotes" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_payout_items" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "commissionId" TEXT,
    "bonusId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "affiliate_payout_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "educator_credit_rates" (
    "id" TEXT NOT NULL,
    "licenseLevel" "LicenseLevel" NOT NULL,
    "termType" "TermType" NOT NULL,
    "creditAmount" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "educator_credit_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "educator_credit_ledger" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralId" TEXT,
    "licenseLevel" "LicenseLevel" NOT NULL,
    "termType" "TermType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educator_credit_ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_email_events" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'stubbed',
    "payload" JSONB,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_email_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_marketing_resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MarketingResourceType" NOT NULL,
    "licenseLevel" "LicenseLevel",
    "headline" TEXT,
    "subheadline" TEXT,
    "bodyMarkdown" TEXT,
    "previewUrl" TEXT,
    "downloadUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrlTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_marketing_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_terms_acceptance" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "affiliate_terms_acceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_cash_app_history" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "oldHandle" TEXT,
    "newHandle" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_cash_app_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "affiliateId" TEXT,
    "action" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "payoutMinimum" DECIMAL(10,2) NOT NULL DEFAULT 200.00,
    "payoutDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "commissionHoldingDays" INTEGER NOT NULL DEFAULT 14,
    "trainingVersion" TEXT NOT NULL DEFAULT '1.0',
    "affiliateTermsVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_settings_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Unique indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
CREATE UNIQUE INDEX "affiliates_email_key" ON "affiliates"("email");
CREATE UNIQUE INDEX "affiliate_profiles_affiliateId_key" ON "affiliate_profiles"("affiliateId");
CREATE UNIQUE INDEX "affiliate_training_affiliateId_key" ON "affiliate_training"("affiliateId");
CREATE UNIQUE INDEX "affiliate_referral_links_code_key" ON "affiliate_referral_links"("code");
CREATE UNIQUE INDEX "affiliate_clicks_cookieId_key" ON "affiliate_clicks"("cookieId");
CREATE UNIQUE INDEX "affiliate_referrals_clickId_key" ON "affiliate_referrals"("clickId");
CREATE UNIQUE INDEX "affiliate_referrals_affiliateId_orderId_key" ON "affiliate_referrals"("affiliateId", "orderId");
CREATE UNIQUE INDEX "affiliate_tiers_name_key" ON "affiliate_tiers"("name");
CREATE UNIQUE INDEX "affiliate_bonuses_affiliateId_bonusMonth_bonusRuleId_key" ON "affiliate_bonuses"("affiliateId", "bonusMonth", "bonusRuleId");
CREATE UNIQUE INDEX "affiliate_payout_items_payoutId_commissionId_key" ON "affiliate_payout_items"("payoutId", "commissionId");
CREATE UNIQUE INDEX "affiliate_payout_items_payoutId_bonusId_key" ON "affiliate_payout_items"("payoutId", "bonusId");
CREATE UNIQUE INDEX "educator_credit_rates_licenseLevel_termType_key" ON "educator_credit_rates"("licenseLevel", "termType");

-- ---------------------------------------------------------------------------
-- Non-unique indexes
-- ---------------------------------------------------------------------------
CREATE INDEX "affiliates_affiliateType_idx" ON "affiliates"("affiliateType");
CREATE INDEX "affiliates_status_idx" ON "affiliates"("status");
CREATE INDEX "affiliate_clicks_affiliateId_idx" ON "affiliate_clicks"("affiliateId");
CREATE INDEX "affiliate_clicks_referralCode_idx" ON "affiliate_clicks"("referralCode");
CREATE INDEX "affiliate_referrals_status_idx" ON "affiliate_referrals"("status");
CREATE INDEX "affiliate_referrals_affiliateId_idx" ON "affiliate_referrals"("affiliateId");
CREATE INDEX "affiliate_commissions_affiliateId_status_idx" ON "affiliate_commissions"("affiliateId", "status");
CREATE INDEX "affiliate_payouts_affiliateId_status_idx" ON "affiliate_payouts"("affiliateId", "status");
CREATE INDEX "affiliate_email_events_affiliateId_type_idx" ON "affiliate_email_events"("affiliateId", "type");
CREATE INDEX "affiliate_audit_logs_affiliateId_idx" ON "affiliate_audit_logs"("affiliateId");
CREATE INDEX "affiliate_audit_logs_action_idx" ON "affiliate_audit_logs"("action");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "affiliate_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_profiles" ADD CONSTRAINT "affiliate_profiles_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "affiliate_training" ADD CONSTRAINT "affiliate_training_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "affiliate_referral_links" ADD CONSTRAINT "affiliate_referral_links_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "affiliate_referral_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "affiliate_referral_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_clickId_fkey" FOREIGN KEY ("clickId") REFERENCES "affiliate_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "affiliate_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "affiliate_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "commission_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_commission_adjustments" ADD CONSTRAINT "affiliate_commission_adjustments_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "affiliate_commissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_commission_adjustments" ADD CONSTRAINT "affiliate_commission_adjustments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_bonuses" ADD CONSTRAINT "affiliate_bonuses_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_bonuses" ADD CONSTRAINT "affiliate_bonuses_bonusRuleId_fkey" FOREIGN KEY ("bonusRuleId") REFERENCES "affiliate_bonus_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "affiliate_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "affiliate_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_bonusId_fkey" FOREIGN KEY ("bonusId") REFERENCES "affiliate_bonuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "educator_credit_ledger" ADD CONSTRAINT "educator_credit_ledger_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "educator_credit_ledger" ADD CONSTRAINT "educator_credit_ledger_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "affiliate_referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_email_events" ADD CONSTRAINT "affiliate_email_events_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliate_terms_acceptance" ADD CONSTRAINT "affiliate_terms_acceptance_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliate_cash_app_history" ADD CONSTRAINT "affiliate_cash_app_history_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliate_audit_logs" ADD CONSTRAINT "affiliate_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "affiliate_audit_logs" ADD CONSTRAINT "affiliate_audit_logs_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
