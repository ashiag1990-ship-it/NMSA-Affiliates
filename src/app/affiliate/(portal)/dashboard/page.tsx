import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAffiliateBalances } from "@/lib/payouts";
import { getProgramSettings } from "@/lib/settings";
import { formatMoney, nextPayoutDate } from "@/lib/utils";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/interpolate";

const COMPLETED_STATUSES = ["completed", "commission_pending", "commission_approved", "paid"];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");
  const affiliateId = session.user.id;

  const affiliate = await prisma.affiliate.findUniqueOrThrow({
    where: { id: affiliateId },
    include: { tier: true },
  });

  const { dict, locale } = getDictionary();

  const [totalReferrals, completedReferrals, pendingReferrals, monthlyReferrals, balances, settings] =
    await Promise.all([
      prisma.affiliateReferral.count({ where: { affiliateId } }),
      prisma.affiliateReferral.count({ where: { affiliateId, status: { in: COMPLETED_STATUSES } } }),
      prisma.affiliateReferral.count({
        where: { affiliateId, status: { in: ["clicked", "registered", "enrolled", "payment_pending"] } },
      }),
      prisma.affiliateReferral.count({
        where: {
          affiliateId,
          status: { in: COMPLETED_STATUSES },
          purchaseTimestamp: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      getAffiliateBalances(affiliateId),
      getProgramSettings(),
    ]);

  const minimum = Number(settings.payoutMinimum);
  const remaining = Math.max(0, minimum - balances.cashAvailable);
  const nextPayout = nextPayoutDate(settings.payoutDayOfMonth);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.dashboard.welcome}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge status={affiliate.status} />
          <Badge status={affiliate.affiliateType} />
          {affiliate.tier && <Badge status="active" label={affiliate.tier.name} />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatTile label={dict.dashboard.stats.totalReferrals} value={String(totalReferrals)} />
        <StatTile label={dict.dashboard.stats.completedReferrals} value={String(completedReferrals)} />
        <StatTile label={dict.dashboard.stats.pendingReferrals} value={String(pendingReferrals)} />
        <StatTile label={dict.dashboard.stats.monthlyReferrals} value={String(monthlyReferrals)} />
        <StatTile label={dict.dashboard.stats.cashEarned} value={formatMoney(balances.cashEarned)} />
        <StatTile label={dict.dashboard.stats.cashPending} value={formatMoney(balances.cashPending)} />
        <StatTile label={dict.dashboard.stats.cashPaid} value={formatMoney(balances.cashPaid)} />
        <StatTile label={dict.dashboard.stats.lifetimeEarnings} value={formatMoney(balances.cashEarned)} />
      </div>

      <Card className="bg-nmsa-navy text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-nmsa-gold">{dict.dashboard.nextPayout}</div>
            <div className="text-4xl font-extrabold mt-2">{formatMoney(balances.availableForPayout)}</div>
            <div className="text-sm text-white/60 mt-1">{dict.dashboard.availableBalance}</div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-white/50 uppercase">{dict.dashboard.minimumPayout}</div>
              <div className="font-bold mt-1">{formatMoney(minimum)}</div>
            </div>
            <div>
              <div className="text-xs text-white/50 uppercase">{dict.dashboard.nextPayoutDate}</div>
              <div className="font-bold mt-1">
                {nextPayout.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>
        {balances.availableForPayout < minimum ? (
          <p className="mt-5 text-sm text-white/80 bg-white/10 rounded-lg px-4 py-3">
            {interpolate(dict.dashboard.moreNeeded, { amount: formatMoney(remaining), minimum: formatMoney(minimum) })}
          </p>
        ) : (
          <p className="mt-5 text-sm text-white/90 bg-nmsa-gold/20 rounded-lg px-4 py-3 font-medium">
            {dict.dashboard.eligibleNow}
          </p>
        )}
      </Card>

      {affiliate.affiliateType === "educator" && <EducatorCreditsCard affiliateId={affiliateId} />}

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.gettingStarted.title}</CardTitle>
        </CardHeader>
        <ol className="text-sm space-y-2 list-decimal list-inside text-nmsa-navy/80">
          <li>{dict.dashboard.gettingStarted.step1}</li>
          <li>{dict.dashboard.gettingStarted.step2}</li>
          <li>{dict.dashboard.gettingStarted.step3}</li>
          <li>{interpolate(dict.dashboard.gettingStarted.step4, { minimum: formatMoney(minimum) })}</li>
        </ol>
      </Card>
    </div>
  );
}

async function EducatorCreditsCard({ affiliateId }: { affiliateId: string }) {
  const entries = await prisma.educatorCreditLedgerEntry.findMany({ where: { affiliateId } });
  const earned = entries.reduce((s, e) => s + Number(e.amount), 0);
  const available = entries.filter((e) => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0);
  const { dict } = getDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.dashboard.educatorCredits.title}</CardTitle>
      </CardHeader>
      <p className="text-xs text-nmsa-gray-dark mb-4">{dict.dashboard.educatorCredits.subtitle}</p>
      <div className="grid grid-cols-2 gap-4">
        <StatTile label={dict.dashboard.educatorCredits.earned} value={formatMoney(earned)} />
        <StatTile label={dict.dashboard.educatorCredits.available} value={formatMoney(available)} />
      </div>
    </Card>
  );
}
