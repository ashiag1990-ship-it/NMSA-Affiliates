import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CopyButton, ShareButton } from "@/components/affiliate/CopyButton";
import { StatTile } from "@/components/ui/StatTile";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ReferralLinkPage() {
  const session = await auth();
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");

  const { dict } = await getDictionary();

  const training = await prisma.affiliateTraining.findUnique({ where: { affiliateId: session.user.id } });
  const link = await prisma.affiliateReferralLink.findFirst({
    where: { affiliateId: session.user.id, active: true },
  });

  if (!training?.trainingCompleted || !link) {
    return (
      <Card>
        <CardTitle>{dict.referralLink.notActiveTitle}</CardTitle>
        <p className="text-sm text-nmsa-gray-dark mt-2">{dict.referralLink.notActiveBody}</p>
        <a href="/affiliate/training" className="inline-block mt-4 text-sm font-semibold text-nmsa-navy underline">
          {dict.referralLink.goToTraining}
        </a>
      </Card>
    );
  }

  const clickCount = await prisma.affiliateClick.count({ where: { affiliateId: session.user.id } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.referralLink.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{dict.referralLink.yourLink}</CardTitle>
        </CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 rounded-lg bg-nmsa-gray px-4 py-3 text-sm font-mono text-nmsa-navy break-all">
            {link.url}
          </div>
          <div className="flex gap-2 shrink-0">
            <CopyButton value={link.url} />
            <ShareButton value={link.url} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.referralLink.yourCode}</CardTitle>
        </CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 rounded-lg bg-nmsa-gray px-4 py-3 text-2xl font-extrabold tracking-widest text-nmsa-navy">
            {link.code}
          </div>
          <div className="flex gap-2 shrink-0">
            <CopyButton value={link.code} />
            <ShareButton value={link.code} />
          </div>
        </div>
      </Card>

      <StatTile label={dict.referralLink.totalClicks} value={String(clickCount)} />

      <Card>
        <CardHeader>
          <CardTitle>{dict.referralLink.howItWorksTitle}</CardTitle>
        </CardHeader>
        <p className="text-sm text-nmsa-gray-dark">{dict.referralLink.howItWorksBody}</p>
      </Card>
    </div>
  );
}
