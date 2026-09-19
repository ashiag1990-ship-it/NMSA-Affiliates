import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { bucketByMonth, bucketSumByMonth } from "@/lib/analytics";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { getDictionary } from "@/i18n/dictionaries";

const COMPLETED_STATUSES = ["completed", "commission_pending", "commission_approved", "paid"];
const PENDING_STATUSES = ["clicked", "registered", "enrolled", "payment_pending"];

export default async function AdminOverviewPage() {
  const { dict } = getDictionary();
  const c = dict.admin.overview;

  const [
    totalAffiliates,
    educatorAffiliates,
    practitionerAffiliates,
    generalAffiliates,
    activeAffiliates,
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    commissionAgg,
    payoutsThisMonth,
  ] = await Promise.all([
    prisma.affiliate.count(),
    prisma.affiliate.count({ where: { affiliateType: "educator" } }),
    prisma.affiliate.count({ where: { affiliateType: "practitioner" } }),
    prisma.affiliate.count({ where: { affiliateType: "general" } }),
    prisma.affiliate.count({ where: { status: "active" } }),
    prisma.affiliateReferral.count(),
    prisma.affiliateReferral.count({ where: { status: { in: COMPLETED_STATUSES } } }),
    prisma.affiliateReferral.count({ where: { status: { in: PENDING_STATUSES } } }),
    prisma.affiliateCommission.groupBy({ by: ["status"], _sum: { amount: true } }),
    prisma.affiliatePayout.aggregate({
      where: {
        status: "paid",
        paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [referralsForChart, commissionsForChart, affiliatesForChart, payoutsForChart] = await Promise.all([
    prisma.affiliateReferral.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.affiliateCommission.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true, amount: true } }),
    prisma.affiliate.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.affiliatePayout.findMany({
      where: { status: "paid", paymentDate: { gte: sixMonthsAgo } },
      select: { paymentDate: true, amount: true },
    }),
  ]);

  const referralGrowth = bucketByMonth(referralsForChart.map((r) => ({ date: r.createdAt })));
  const commissionGrowth = bucketSumByMonth(commissionsForChart.map((c) => ({ date: c.createdAt, amount: Number(c.amount) })));
  const affiliateGrowth = bucketByMonth(affiliatesForChart.map((a) => ({ date: a.createdAt })));
  const monthlyPayoutsSeries = bucketSumByMonth(
    payoutsForChart.filter((p) => p.paymentDate).map((p) => ({ date: p.paymentDate as Date, amount: Number(p.amount) }))
  );
  const affiliateTypeDistribution: { key: "educator" | "practitioner" | "general"; value: number }[] = [
    { key: "educator", value: educatorAffiliates },
    { key: "practitioner", value: practitionerAffiliates },
    { key: "general", value: generalAffiliates },
  ];

  const sumFor = (status: string) => Number(commissionAgg.find((cm) => cm.status === status)?._sum.amount ?? 0);
  const totalCommissions = commissionAgg.reduce((s, cm) => s + Number(cm._sum.amount ?? 0), 0);
  const pendingCommissions = sumFor("pending");
  const approvedCommissions = sumFor("approved");
  const totalPaid = sumFor("paid");
  const balanceOwed = pendingCommissions + approvedCommissions;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={c.totalAffiliates} value={String(totalAffiliates)} />
        <StatTile label={c.educatorAffiliates} value={String(educatorAffiliates)} />
        <StatTile label={c.practitionerAffiliates} value={String(practitionerAffiliates)} />
        <StatTile label={c.generalAffiliates} value={String(generalAffiliates)} />
        <StatTile label={c.activeAffiliates} value={String(activeAffiliates)} />
        <StatTile label={c.totalReferrals} value={String(totalReferrals)} />
        <StatTile label={c.completedReferrals} value={String(completedReferrals)} />
        <StatTile label={c.pendingReferrals} value={String(pendingReferrals)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={c.totalCommissions} value={formatMoney(totalCommissions)} />
        <StatTile label={c.pendingCommissions} value={formatMoney(pendingCommissions)} />
        <StatTile label={c.approvedCommissions} value={formatMoney(approvedCommissions)} />
        <StatTile label={c.totalPaid} value={formatMoney(totalPaid)} />
        <StatTile label={c.totalBalanceOwed} value={formatMoney(balanceOwed)} />
        <StatTile
          label={c.payoutsThisMonth}
          value={formatMoney(Number(payoutsThisMonth._sum.amount ?? 0))}
          sublabel={`${payoutsThisMonth._count} ${payoutsThisMonth._count === 1 ? c.payoutSuffix : c.payoutsSuffix}`}
        />
      </div>

      <AdminCharts
        referralGrowth={referralGrowth}
        commissionGrowth={commissionGrowth}
        affiliateGrowth={affiliateGrowth}
        monthlyPayouts={monthlyPayoutsSeries}
        affiliateTypeDistribution={affiliateTypeDistribution}
      />

      <Card>
        <CardHeader>
          <CardTitle>{c.quickLinks}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <a href="/admin/affiliates?status=pending" className="rounded-lg bg-nmsa-navy/5 px-4 py-3 font-semibold text-nmsa-navy hover:bg-nmsa-navy/10">
            {c.reviewPendingAffiliates}
          </a>
          <a href="/admin/commissions?status=pending" className="rounded-lg bg-nmsa-navy/5 px-4 py-3 font-semibold text-nmsa-navy hover:bg-nmsa-navy/10">
            {c.reviewPendingCommissions}
          </a>
          <a href="/admin/payouts?status=eligible" className="rounded-lg bg-nmsa-navy/5 px-4 py-3 font-semibold text-nmsa-navy hover:bg-nmsa-navy/10">
            {c.payoutsEligible}
          </a>
          <a href="/admin/audit-log" className="rounded-lg bg-nmsa-navy/5 px-4 py-3 font-semibold text-nmsa-navy hover:bg-nmsa-navy/10">
            {c.viewAuditLog}
          </a>
        </div>
      </Card>
    </div>
  );
}
