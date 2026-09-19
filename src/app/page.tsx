import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function HomePage() {
  const { dict } = getDictionary();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-2xl">
        <div className="flex justify-end mb-6">
          <LanguageSwitcher />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-nmsa-navy px-4 py-1.5 mb-8">
          <span className="text-nmsa-gold font-extrabold tracking-wide text-sm">NMSA</span>
          <span className="text-white text-xs font-semibold">{dict.home.badge}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-nmsa-navy leading-tight">
          {dict.home.headline}
        </h1>
        <p className="mt-4 text-nmsa-gray-dark text-lg">{dict.home.description}</p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/affiliate-signup"
            className="rounded-xl bg-nmsa-gold px-8 py-4 font-bold text-nmsa-navy shadow-premium hover:brightness-95 transition"
          >
            {dict.home.becomeAffiliate}
          </Link>
          <Link
            href="/affiliate/login"
            className="rounded-xl border-2 border-nmsa-navy px-8 py-4 font-bold text-nmsa-navy hover:bg-nmsa-navy hover:text-white transition"
          >
            {dict.home.login}
          </Link>
        </div>
      </div>
    </main>
  );
}
