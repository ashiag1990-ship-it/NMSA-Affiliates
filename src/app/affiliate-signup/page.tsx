import { getDictionary } from "@/i18n/dictionaries";
import { SignupForm } from "./SignupForm";

export default async function AffiliateSignupPage() {
  const { dict } = await getDictionary();
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto rounded-xl2 bg-white shadow-premium-lg p-6 sm:p-10">
        <h1 className="text-2xl font-extrabold text-nmsa-navy mb-2">{dict.signup.title}</h1>
        <p className="text-sm text-nmsa-gray-dark mb-6">{dict.signup.subtitle}</p>
        <SignupForm />
      </div>
    </main>
  );
}
