"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useTranslation } from "@/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Single sign-in form for both affiliates and admins — there is no separate
 * "Admin Login" screen or link anywhere in the app. The form tries the
 * `affiliate` credentials provider first; only if that fails with the
 * generic "no matching account" error does it fall back to the `admin`
 * provider. Each provider still queries its own table (see src/lib/auth.ts),
 * so an affiliate's password can never authenticate as an admin — this
 * component only decides which dashboard to send a successful sign-in to.
 *
 * A provider-specific error (e.g. a suspended affiliate account) is
 * surfaced immediately rather than silently falling through to the admin
 * attempt, so a real account-status message is never masked.
 */
export function UnifiedLoginForm() {
  const router = useRouter();
  const { dict } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const affiliateRes = await signIn("affiliate", { email, password, redirect: false });
    if (affiliateRes && !affiliateRes.error) {
      setSubmitting(false);
      router.push("/affiliate/dashboard");
      router.refresh();
      return;
    }
    if (affiliateRes?.error && affiliateRes.error !== "CredentialsSignin") {
      // A specific error (e.g. suspended account) — this is a real
      // affiliate, so don't mask it by trying the admin provider.
      setSubmitting(false);
      setError(affiliateRes.error);
      return;
    }

    const adminRes = await signIn("admin", { email, password, redirect: false });
    setSubmitting(false);
    if (adminRes && !adminRes.error) {
      router.push("/admin");
      router.refresh();
      return;
    }

    setError(dict.auth.invalidCredentials);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-nmsa-navy px-4 py-1.5 mb-6">
            <span className="text-nmsa-gold font-extrabold tracking-wide text-sm">NMSA</span>
            <span className="text-white text-xs font-semibold">{dict.home.badge}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.auth.loginTitle}</h1>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl2 bg-white shadow-premium-lg p-6 space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
          <Field label={dict.common.email} htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label={dict.common.password} htmlFor="password">
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? dict.auth.signingIn : dict.common.logIn}
          </Button>
        </form>
        <p className="text-center text-sm text-nmsa-gray-dark mt-6">
          {dict.auth.notAffiliateYet}{" "}
          <a href="/affiliate-signup" className="font-semibold text-nmsa-navy underline">
            {dict.auth.signUp}
          </a>
        </p>
      </div>
    </main>
  );
}
