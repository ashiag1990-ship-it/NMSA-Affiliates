import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const metadata = { title: "NMSA Affiliate Program Terms" };

export default async function AffiliateTermsPage() {
  const { dict } = await getDictionary();

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h1 className="text-3xl font-extrabold text-nmsa-navy">{dict.terms.title}</h1>
        <p className="text-sm text-nmsa-gray-dark mt-2">{dict.terms.intro}</p>

        <div className="mt-8 space-y-8">
          {dict.terms.sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-nmsa-navy">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-nmsa-navy/80 mt-2 leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
