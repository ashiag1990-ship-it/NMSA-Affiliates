import { z } from "zod";

export const marketingChannelOptions = [
  "Social Media",
  "Professional Network",
  "Students",
  "Colleagues",
  "Email",
  "Website",
  "Word of Mouth",
  "Other",
] as const;

export const affiliateSignupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(7, "Enter a valid phone number").max(30),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    affiliateType: z.enum(["educator", "practitioner", "general"]),
    marketingChannels: z.array(z.enum(marketingChannelOptions)).min(1, "Select at least one marketing channel"),
    marketingChannelOther: z.string().max(200).optional(),
    businessName: z.string().max(200).optional(),
    website: z.string().max(300).optional(),
    instagram: z.string().max(200).optional(),
    facebook: z.string().max(200).optional(),
    tiktok: z.string().max(200).optional(),
    cashAppHandle: z
      .string()
      .min(2, "Enter your Cash App $Cashtag")
      .refine((v) => v.trim().startsWith("$"), "Cash App handle must start with $"),
    confirmCashAppHandle: z.string().min(2, "Confirm your Cash App $Cashtag"),
    cashAppAccurateConfirmed: z.literal(true, {
      errorMap: () => ({ message: "You must confirm your Cash App information is accurate" }),
    }),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the NMSA Affiliate Program Terms" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.cashAppHandle.trim() === data.confirmCashAppHandle.trim(), {
    message: "Cash App handles do not match",
    path: ["confirmCashAppHandle"],
  });

export type AffiliateSignupInput = z.infer<typeof affiliateSignupSchema>;

export const cashAppUpdateSchema = z
  .object({
    cashAppHandle: z.string().min(2).refine((v) => v.trim().startsWith("$"), "Must start with $"),
    confirmCashAppHandle: z.string().min(2),
  })
  .refine((data) => data.cashAppHandle.trim() === data.confirmCashAppHandle.trim(), {
    message: "Cash App handles do not match",
    path: ["confirmCashAppHandle"],
  });

export const trainingProgressSchema = z.object({
  slide: z.number().int().min(1).max(4),
  action: z.enum(["start", "complete_slide", "finish"]),
});

export const commissionRuleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["fixed", "percentage", "license_specific", "annual", "biennial", "tier", "bonus"]),
  affiliateType: z.enum(["educator", "practitioner", "general"]).nullable().optional(),
  licenseLevel: z.enum(["I", "II", "III"]).nullable().optional(),
  termType: z.enum(["annual", "biennial"]).nullable().optional(),
  tierId: z.string().nullable().optional(),
  fixedAmount: z.number().nonnegative().nullable().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  active: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export const webhookReferralSchema = z.object({
  referralCode: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  enrollmentId: z.string().optional(),
  orderId: z.string().optional(),
  purchaseId: z.string().optional(),
  productLabel: z.string().optional(),
  licenseLevel: z.enum(["I", "II", "III"]).optional(),
  termType: z.enum(["annual", "biennial"]).optional(),
  purchaseAmount: z.number().nonnegative().optional(),
});
