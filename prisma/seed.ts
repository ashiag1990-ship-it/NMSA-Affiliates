import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding NMSA Affiliate Program database…");

  // ---- Program settings (singleton) ----
  await prisma.programSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      payoutMinimum: 200,
      payoutDayOfMonth: 1,
      commissionHoldingDays: 14,
      trainingVersion: "1.0",
      affiliateTermsVersion: "1.0",
    },
  });

  // ---- Bootstrap admin ----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@nationalmsa.org").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        name: "NMSA Program Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "super_admin",
      },
    });
    console.log(`Created admin ${adminEmail} — CHANGE THIS PASSWORD after first login.`);
  } else {
    // Keep the seeded admin's password in sync with SEED_ADMIN_PASSWORD, so
    // changing that variable and redeploying actually takes effect instead
    // of silently being ignored because the admin row already exists.
    await prisma.admin.update({
      where: { id: existingAdmin.id },
      data: { passwordHash: await bcrypt.hash(adminPassword, 12) },
    });
    console.log(`Synced admin ${adminEmail} password from SEED_ADMIN_PASSWORD.`);
  }

  // ---- Affiliate tiers ----
  const tiers: { name: string; min: number; max: number | null; sort: number }[] = [
    { name: "NEW AFFILIATE", min: 0, max: 0, sort: 0 },
    { name: "ACTIVE AFFILIATE", min: 1, max: 4, sort: 1 },
    { name: "GROWTH AFFILIATE", min: 5, max: 9, sort: 2 },
    { name: "PARTNER AFFILIATE", min: 10, max: null, sort: 3 },
  ];
  for (const t of tiers) {
    await prisma.affiliateTier.upsert({
      where: { name: t.name },
      update: { minCompletedReferrals: t.min, maxCompletedReferrals: t.max, sortOrder: t.sort },
      create: { name: t.name, minCompletedReferrals: t.min, maxCompletedReferrals: t.max, sortOrder: t.sort },
    });
  }

  // ---- Default commission rule ----
  // A single broad fallback rule so commissions work out of the box.
  // Admins can add more specific rules (by affiliate type / license level /
  // term / tier) from Admin > Settings — more specific rules should be
  // given a higher `priority` so they win over this fallback.
  const existingDefaultRule = await prisma.commissionRule.findFirst({ where: { name: "Default Qualifying Referral Commission" } });
  if (!existingDefaultRule) {
    await prisma.commissionRule.create({
      data: {
        name: "Default Qualifying Referral Commission",
        type: "fixed",
        fixedAmount: 50,
        priority: 0,
        active: true,
      },
    });
  }

  // ---- Monthly referral bonus rules ----
  const bonusRules = [
    { name: "5 Referral Bonus", thresholdCount: 5, bonusAmount: 200 },
    { name: "10 Referral Bonus", thresholdCount: 10, bonusAmount: 500 },
    { name: "20 Referral Bonus", thresholdCount: 20, bonusAmount: 1200 },
  ];
  for (const b of bonusRules) {
    const existing = await prisma.affiliateBonusRule.findFirst({ where: { name: b.name } });
    if (!existing) {
      await prisma.affiliateBonusRule.create({ data: { ...b, active: true } });
    }
  }

  // ---- Educator credit rates ----
  const educatorRates: { level: "I" | "II" | "III"; term: "annual" | "biennial"; amount: number }[] = [
    { level: "I", term: "annual", amount: 50 },
    { level: "I", term: "biennial", amount: 75 },
    { level: "II", term: "annual", amount: 75 },
    { level: "II", term: "biennial", amount: 100 },
    { level: "III", term: "annual", amount: 100 },
    { level: "III", term: "biennial", amount: 150 },
  ];
  for (const r of educatorRates) {
    await prisma.educatorCreditRate.upsert({
      where: { licenseLevel_termType: { licenseLevel: r.level, termType: r.term } },
      update: { creditAmount: r.amount, active: true },
      create: { licenseLevel: r.level, termType: r.term, creditAmount: r.amount, active: true },
    });
  }

  // ---- Marketing resources ----
  const resources = [
    {
      title: "NMSA Overview",
      type: "overview" as const,
      headline: "Discover NMSA",
      subheadline: "Professional licensing, aesthetic education & accreditation",
      bodyMarkdown:
        "NMSA provides professional licensing, aesthetic education, accreditation, professional development, compliance resources, and industry networking for aesthetic professionals nationwide. Learn more or apply here: {{referralUrl}}",
      ctaLabel: "Learn More",
      ctaUrlTemplate: "{{appUrl}}/r/{{code}}",
    },
    {
      title: "Level I Marketing Post",
      type: "marketing_post" as const,
      licenseLevel: "I" as const,
      headline: "GET YOUR LEVEL I LICENSE",
      subheadline: "FOR ENTRY-LEVEL AESTHETIC PROFESSIONALS",
      bodyMarkdown:
        "Services include but are not limited to: Body Sculpting, LED Light Therapy, Cavitation, Low Level Laser Lipo, Low Level RF, Body Wrapping, Vacuum Therapy Enhancements, Wood Therapy, Ice Sculpting, Infrared Therapy, Vaginal Steaming, Lymphatic Stimulation, Brow Lamination, Brow Threading, Lash Extensions, Basic Tanning, and Thermal Auricular Therapy. Get started here: {{referralUrl}}",
      ctaLabel: "GET STARTED TODAY",
      ctaUrlTemplate: "{{appUrl}}/r/{{code}}",
    },
    {
      title: "Level II Marketing Post",
      type: "marketing_post" as const,
      licenseLevel: "II" as const,
      headline: "GET YOUR LEVEL II LICENSE",
      subheadline: "FOR MASTER LEVEL AESTHETIC PROFESSIONALS",
      bodyMarkdown:
        "Master Level Professionals who offer basic services or trainings including but not limited to: Body Sculpting, LED Light Therapy, Cavitation, Low Level Laser Lipo, Low Level RF, Body Wrapping, Vacuum Therapy Enhancements, Wood Therapy, Ice Sculpting, Infrared Therapy, Vaginal Steaming, Lymphatic Stimulation, Brow Lamination, Brow Threading, Lash Extensions, Basic Tanning, Thermal Auricular Therapy, Mobile Oral Care, Em-Sculpting, Cool Sculpting, Cryotherapy, Cryopen, Vaginal & Facial HIFU, Hyaluronic Pen, Fat Dissolvers, Body Piercing, Areola Micropigmentation, PMU, Microblading, Scalp Pigmentation, Carbon Laser Facial, Plasma Fibroblast, Advanced Spray Tanning, Chemical Peels, and Hair Removal. Get started here: {{referralUrl}}",
      ctaLabel: "GET STARTED TODAY",
      ctaUrlTemplate: "{{appUrl}}/r/{{code}}",
    },
    {
      title: "Level III Marketing Post",
      type: "marketing_post" as const,
      licenseLevel: "III" as const,
      headline: "GET YOUR LEVEL III LICENSE",
      subheadline: "ADVANCED & MEDICAL-ADJACENT AESTHETIC SERVICES",
      bodyMarkdown:
        "For appropriately qualified applicants holding a valid, unexpired certification or license such as CCMA, CMA, Phlebotomy Certification, or a higher-level medical credential (RN, LPN, MD, etc.). Level III covers advanced and medical-adjacent services including Cosmetic Injections (Botox, Neurotoxins, Mesotherapy), Dermal Fillers, Fat Dissolvers, IV Hydration, and Wellness-based treatments. A medical director is only required when administering medications, anesthesia, or prescription-based treatments. Eligibility and authorization depend on the applicant's qualifications, applicable requirements, and scope of practice. Get started here: {{referralUrl}}",
      ctaLabel: "GET STARTED TODAY",
      ctaUrlTemplate: "{{appUrl}}/r/{{code}}",
    },
    {
      title: "Approved Marketing Language",
      type: "approved_language" as const,
      bodyMarkdown:
        "Eligibility, licensing requirements, and scope of practice may vary. NMSA determines applicant eligibility. Never guarantee licensing approval, eligibility, or legal authority to perform a procedure. Share your link with prospects: {{referralUrl}}",
    },
    {
      title: "Official NMSA Marketing Graphic",
      type: "social_graphic" as const,
      headline: "The only image currently approved for affiliate marketing",
      subheadline: "Download and share this graphic as-is — do not edit, crop, or create your own version.",
      bodyMarkdown:
        "This is the only image currently approved by NMSA for affiliate marketing use. Do not create your own marketing materials, imagery, or campaigns without NMSA's approval — best practice is to only use what's provided here on the Affiliate Portal. Share it with your referral link: {{referralUrl}}",
      downloadUrl: "/marketing/nmsa-approved-graphic.jpg",
      previewUrl: "/marketing/nmsa-approved-graphic.jpg",
    },
    {
      title: "Affiliate FAQ",
      type: "faq" as const,
      bodyMarkdown:
        "How many referrals do I need to start earning? Just one completed qualifying referral. When do I get paid? Cash App, on the 1st of every month, once your available balance reaches $200. What if I'm under $200? Your balance automatically rolls over — it's never reset to zero.",
    },
  ];
  for (const r of resources) {
    const existing = await prisma.affiliateMarketingResource.findFirst({ where: { title: r.title } });
    if (!existing) {
      await prisma.affiliateMarketingResource.create({ data: { ...r, active: true } as any });
    } else {
      // Re-running the seed (e.g. after a content update) keeps existing
      // resources in sync rather than silently leaving stale copy in place.
      await prisma.affiliateMarketingResource.update({ where: { id: existing.id }, data: { ...r } as any });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
