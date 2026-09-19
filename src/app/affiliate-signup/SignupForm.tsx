"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { marketingChannelOptions } from "@/lib/validation";
import { useTranslation } from "@/i18n/context";

type AffiliateType = "educator" | "practitioner" | "general";

export function SignupForm() {
  const router = useRouter();
  const { dict } = useTranslation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const AFFILIATE_TYPES: { value: AffiliateType; label: string; blurb: string }[] = [
    { value: "educator", ...dict.signup.affiliateTypes.educator },
    { value: "practitioner", ...dict.signup.affiliateTypes.practitioner },
    { value: "general", ...dict.signup.affiliateTypes.general },
  ];

  const STEPS = [dict.signup.steps.yourInfo, dict.signup.steps.affiliateType, dict.signup.steps.cashAppTerms];

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    affiliateType: "general" as AffiliateType,
    marketingChannels: [] as string[],
    marketingChannelOther: "",
    businessName: "",
    website: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    cashAppHandle: "",
    confirmCashAppHandle: "",
    cashAppAccurateConfirmed: false,
    termsAccepted: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleChannel(channel: string) {
    setForm((f) => ({
      ...f,
      marketingChannels: f.marketingChannels.includes(channel)
        ? f.marketingChannels.filter((c) => c !== channel)
        : [...f.marketingChannels, channel],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.issues?.fieldErrors) {
          const errs: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.issues.fieldErrors)) {
            if (Array.isArray(v) && v[0]) errs[k] = v[0] as string;
          }
          setFieldErrors(errs);
          // jump back to the step containing the first error
          if (errs.email || errs.phone || errs.password || errs.confirmPassword || errs.firstName || errs.lastName) {
            setStep(0);
          } else if (errs.cashAppHandle || errs.confirmCashAppHandle) {
            setStep(2);
          }
        }
        setFormError(json.error || dict.signup.errors.validationFailed);
        setSubmitting(false);
        return;
      }

      const signInResult = await signIn("affiliate", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/affiliate/login");
        return;
      }
      router.push("/affiliate/training");
    } catch (err) {
      setFormError(dict.common.somethingWentWrong);
      setSubmitting(false);
    }
  }

  const cashAppMismatch =
    form.cashAppHandle.length > 0 &&
    form.confirmCashAppHandle.length > 0 &&
    form.cashAppHandle.trim() !== form.confirmCashAppHandle.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-nmsa-gold" : "bg-gray-200"}`} />
            <div className="mt-1.5 text-xs font-semibold text-nmsa-gray-dark">{label}</div>
          </div>
        ))}
      </div>

      {formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {formError}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={dict.signup.fields.firstName} htmlFor="firstName" error={fieldErrors.firstName}>
              <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </Field>
            <Field label={dict.signup.fields.lastName} htmlFor="lastName" error={fieldErrors.lastName}>
              <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </Field>
          </div>
          <Field label={dict.signup.fields.email} htmlFor="email" error={fieldErrors.email}>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </Field>
          <Field label={dict.signup.fields.phone} htmlFor="phone" error={fieldErrors.phone}>
            <Input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={dict.signup.fields.password} htmlFor="password" error={fieldErrors.password} hint={dict.signup.fields.passwordHint}>
              <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
            </Field>
            <Field label={dict.signup.fields.confirmPassword} htmlFor="confirmPassword" error={fieldErrors.confirmPassword}>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setStep(1)}>
              {dict.common.continue}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <Label>{dict.signup.affiliateTypeLabel}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              {AFFILIATE_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => set("affiliateType", t.value)}
                  className={`text-left rounded-xl border-2 p-4 transition ${
                    form.affiliateType === t.value ? "border-nmsa-navy bg-nmsa-navy/5" : "border-gray-200"
                  }`}
                >
                  <div className="font-bold text-nmsa-navy">{t.label}</div>
                  <div className="text-xs text-nmsa-gray-dark mt-1">{t.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{dict.signup.marketingChannelsLabel}</Label>
            {fieldErrors.marketingChannels && (
              <p className="text-xs text-red-600 mb-1">{fieldErrors.marketingChannels}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {marketingChannelOptions.map((channel) => (
                <label
                  key={channel}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    form.marketingChannels.includes(channel) ? "border-nmsa-navy bg-nmsa-navy/5" : "border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-nmsa-navy"
                    checked={form.marketingChannels.includes(channel)}
                    onChange={() => toggleChannel(channel)}
                  />
                  {dict.signup.marketingChannels[channel]}
                </label>
              ))}
            </div>
            {form.marketingChannels.includes("Other") && (
              <Input
                className="mt-2"
                placeholder={dict.signup.marketingChannelOtherPlaceholder}
                value={form.marketingChannelOther}
                onChange={(e) => set("marketingChannelOther", e.target.value)}
              />
            )}
          </div>

          <details className="rounded-lg border border-gray-200 p-4">
            <summary className="text-sm font-semibold text-nmsa-navy cursor-pointer">
              {dict.signup.optionalBusinessInfo}
            </summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={dict.signup.businessName} htmlFor="businessName">
                <Input id="businessName" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
              </Field>
              <Field label={dict.signup.website} htmlFor="website">
                <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} />
              </Field>
              <Field label={dict.signup.instagram} htmlFor="instagram">
                <Input id="instagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
              </Field>
              <Field label={dict.signup.facebook} htmlFor="facebook">
                <Input id="facebook" value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
              </Field>
              <Field label={dict.signup.tiktok} htmlFor="tiktok">
                <Input id="tiktok" value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} />
              </Field>
            </div>
          </details>

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              {dict.common.back}
            </Button>
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={form.marketingChannels.length === 0}
            >
              {dict.common.continue}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-xl border-2 border-nmsa-navy/20 p-5 bg-nmsa-navy/5">
            <h3 className="font-bold text-nmsa-navy">{dict.signup.cashApp.title}</h3>
            <p className="text-xs text-nmsa-gray-dark mt-1">{dict.signup.cashApp.subtitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label={dict.signup.cashApp.handle} htmlFor="cashAppHandle" error={fieldErrors.cashAppHandle}>
                <Input
                  id="cashAppHandle"
                  placeholder="$ExampleName"
                  value={form.cashAppHandle}
                  onChange={(e) => set("cashAppHandle", e.target.value)}
                  required
                />
              </Field>
              <Field
                label={dict.signup.cashApp.confirmHandle}
                htmlFor="confirmCashAppHandle"
                error={fieldErrors.confirmCashAppHandle || (cashAppMismatch ? dict.signup.cashApp.mismatch : undefined)}
              >
                <Input
                  id="confirmCashAppHandle"
                  placeholder="$ExampleName"
                  value={form.confirmCashAppHandle}
                  onChange={(e) => set("confirmCashAppHandle", e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-xs text-amber-900">
              <strong>{dict.signup.cashApp.warningTitle}</strong> {dict.signup.cashApp.warningBody}
            </div>

            <label className="mt-4 flex items-start gap-2.5 text-xs text-nmsa-gray-dark">
              <input
                type="checkbox"
                className="mt-0.5 accent-nmsa-navy"
                checked={form.cashAppAccurateConfirmed}
                onChange={(e) => set("cashAppAccurateConfirmed", e.target.checked)}
                required
              />
              <span>{dict.signup.cashApp.accurateConfirm}</span>
            </label>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-nmsa-navy">
            <input
              type="checkbox"
              className="mt-0.5 accent-nmsa-navy"
              checked={form.termsAccepted}
              onChange={(e) => set("termsAccepted", e.target.checked)}
              required
            />
            <span>
              {dict.signup.termsAgree}{" "}
              <a href="/affiliate-terms" target="_blank" className="underline font-semibold">
                {dict.signup.termsLinkLabel}
              </a>{" "}
              {dict.signup.termsAgreeSuffix}
            </span>
          </label>

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              {dict.common.back}
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                !form.cashAppAccurateConfirmed ||
                !form.termsAccepted ||
                cashAppMismatch ||
                !form.cashAppHandle ||
                !form.confirmCashAppHandle
              }
            >
              {submitting ? dict.signup.creatingAccount : dict.signup.createAccount}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
