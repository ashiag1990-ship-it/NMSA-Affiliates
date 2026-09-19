import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getServerLocale } from "@/i18n/dictionaries";

export const metadata: Metadata = {
  title: "NMSA Affiliate & Referral Program",
  description: "Refer. Earn. Grow. — the National Med Spa Association Affiliate & Referral Program.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-nmsa-gray font-sans antialiased">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
