import { SignupForm } from "./SignupForm";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const metadata = { title: "Become an NMSA Affiliate" };

export default async function AffiliateSignupPage() {
  const { dict } = await getDictionary();

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-nmsa-navy px-4 py-1.5 mb-6">
            <span className="text-nmsa-gold font-extrabold tracking-wide text-sm">NMSA</span>
            <span className="text-white text-xs font-semibold">{dict.signup.badge}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-nmsa-navy">{dict.signup.headline}</h1>
          <p className="mt-3 text-nmsa-gray-dark">{dict.signup.subheadline}</p>
          <p className="mt-4 text-sm text-nmsa-gray-dark max-w-xl mx-auto">{dict.signup.intro}</p>
        </div>

        <div className="rounded-xl2 bg-white shadow-premium-lg p-6 sm:p-8">
          <SignupForm />
        </div>

        <p className="text-center text-sm text-nmsa-gray-dark mt-6">
          {dict.signup.alreadyAffiliate}{" "}
          <a href="/affiliate/login" className="font-semibold text-nmsa-navy underline">
            {dict.signup.logIn}
          </a>
        </p>
      </div>
    </main>
  );
}
