import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomePage() {
  const { dict } = await getDictionary();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-extrabold text-nmsa-navy">{dict.home.title}</h1>
      <p className="text-sm text-nmsa-gray-dark mt-3 max-w-md">{dict.home.subtitle}</p>
      <div className="flex gap-4 mt-8">
        <Link href="/affiliate/login" className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">
          {dict.home.affiliateLogin}
        </Link>
        <Link href="/affiliate-signup" className="rounded-lg border-2 border-nmsa-navy text-nmsa-navy px-5 py-2.5 text-sm font-semibold">
          {dict.home.becomeAffiliate}
        </Link>
      </div>
    </main>
  );
}
