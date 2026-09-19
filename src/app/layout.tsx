import type { Metadata } from "next";
import "./globals.css";
import { getServerLocale } from "@/i18n/dictionaries";

export const metadata: Metadata = {
  title: "NMSA Affiliate Program",
  description: "National MSA Affiliate & Referral Program",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
