import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CopyButton, ShareButton } from "@/components/affiliate/CopyButton";
import { getDictionary } from "@/i18n/dictionaries";

export default async function MarketingResourcesPage() {
  const session = await auth();
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");
  const { dict } = await getDictionary();

  const [resources, link] = await Promise.all([
    prisma.affiliateMarketingResource.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.affiliateReferralLink.findFirst({ where: { affiliateId: session.user.id, active: true } }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.marketing.title}</h1>

      {resources.length === 0 && (
        <Card>
          <p className="text-sm text-nmsa-gray-dark">{dict.marketing.empty}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {resources.map((r) => {
          const ctaUrl = link
            ? (r.ctaUrlTemplate || "{{appUrl}}/r/{{code}}")
                .replaceAll("{{appUrl}}", appUrl)
                .replaceAll("{{code}}", link.code)
            : undefined;

          // Every affiliate's referral code/link is baked into the copy text
          // automatically — an affiliate never has to add it themselves, and
          // never accidentally shares a link without it.
          const bodyText =
            r.bodyMarkdown && link
              ? r.bodyMarkdown.replaceAll("{{referralUrl}}", ctaUrl || "").replaceAll("{{code}}", link.code)
              : r.bodyMarkdown;

          return (
            <Card key={r.id}>
              <CardHeader>
                <div className="text-xs font-bold uppercase tracking-wide text-nmsa-gold bg-nmsa-navy inline-block px-2.5 py-1 rounded-full mb-2">
                  {r.type.replace(/_/g, " ")}
                  {r.licenseLevel ? ` · Level ${r.licenseLevel}` : ""}
                </div>
                <CardTitle>{r.title}</CardTitle>
              </CardHeader>
              {r.headline && <p className="font-bold text-nmsa-navy">{r.headline}</p>}
              {r.subheadline && <p className="text-sm text-nmsa-gray-dark mt-1">{r.subheadline}</p>}
              {bodyText && (
                <p className="text-sm text-nmsa-navy/80 mt-3 whitespace-pre-line">{bodyText}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {ctaUrl && (
                  <>
                    <CopyButton value={ctaUrl} label={r.ctaLabel || dict.common.copyLink} />
                    <ShareButton value={ctaUrl} title={r.title} />
                  </>
                )}
                {bodyText && <CopyButton value={bodyText} label={dict.common.copyText} />}
                {r.downloadUrl && (
                  
                    href={r.downloadUrl}
                    download
                    className="rounded-xl border-2 border-nmsa-navy text-nmsa-navy px-3 py-1.5 text-sm font-bold hover:bg-nmsa-navy hover:text-white transition"
                  >
                    {dict.common.download}
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
