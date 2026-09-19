import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAffiliateBalances } from "@/lib/payouts";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { AffiliateActions } from "@/components/admin/AffiliateActions";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/interpolate";

export default async function AdminAffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dict } = await getDictionary();
  const c = dict.admin.affiliates.detail;

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    include: {
      profile: true,
      training: true,
      tier: true,
      referralLinks: true,
      referrals: { orderBy: { createdAt: "desc" }, take: 50, include: { commissions: true } },
      commissions: { orderBy: { createdAt: "desc" }, take: 50, include: { adjustments: true } },
      payouts: { orderBy: { createdAt: "desc" } },
      bonuses: { orderBy: { createdAt: "desc" } },
      emailEvents: { orderBy: { sentAt: "desc" }, take: 20 },
      cashAppHistory: { orderBy: { changedAt: "desc" } },
      auditLogsAbout: { orderBy: { createdAt: "desc" }, take: 50, include: { admin: true } },
    },
  });
  if (!affiliate) notFound();

  const [balances, tiers] = await Promise.all([
    getAffiliateBalances(affiliate.id),
    prisma.affiliateTier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const link = affiliate.referralLinks.find((l) => l.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-nmsa-navy">
          {affiliate.firstName} {affiliate.lastName}
        </h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge status={affiliate.status} />
          <Badge status={affiliate.affiliateType} />
          {affiliate.tier && <Badge status="active" label={affiliate.tier.name} />}
          {affiliate.training?.trainingCompleted ? (
            <Badge status="completed" label={c.trainingComplete} />
          ) : (
            <Badge status="pending" label={c.trainingIncomplete} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label={dict.earnings.lifetimeEarnings} value={formatMoney(balances.cashEarned)} />
            <StatTile label={dict.earnings.availableBalance} value={formatMoney(balances.cashAvailable)} />
            <StatTile label={dict.earnings.pendingCommissions} value={formatMoney(balances.cashPending)} />
            <StatTile label={dict.earnings.paidCommissions} value={formatMoney(balances.cashPaid)} />
          </div>

          <Card>
            <CardHeader><CardTitle>{c.contactAccount}</CardTitle></CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Info label={c.affiliateId} value={affiliate.id} mono />
              <Info label={dict.common.email} value={affiliate.email} />
              <Info label={dict.common.phone} value={affiliate.phone} />
              <Info label={c.referralLink} value={link?.url || c.notGenerated} />
              <Info label={c.referralCode} value={link?.code || dict.common.dash} mono />
              <Info label={c.cashAppHandle} value={affiliate.cashAppHandle || c.notSet} />
              <Info label={c.businessName} value={affiliate.profile?.businessName || dict.common.dash} />
              <Info label={c.website} value={affiliate.profile?.website || dict.common.dash} />
              <Info label={c.marketingChannels} value={affiliate.profile?.marketingChannels.join(", ") || dict.common.dash} />
              <Info label={c.joined} value={formatDate(affiliate.createdAt)} />
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>{c.referralHistory}</CardTitle></CardHeader>
            {affiliate.referrals.length === 0 ? (
              <Empty text={c.noReferrals} />
            ) : (
              <Table>
                <thead>
                  <tr><Th>{dict.earnings.columns.date}</Th><Th>{dict.earnings.columns.customer}</Th><Th>{dict.common.status}</Th><Th>{dict.common.amount}</Th><Th>{dict.referrals.columns.commission}</Th></tr>
                </thead>
                <tbody>
                  {affiliate.referrals.map((r) => (
                    <tr key={r.id}>
                      <Td>{formatDate(r.createdAt)}</Td>
                      <Td>{r.customerName || r.customerEmail || dict.common.dash}</Td>
                      <Td><Badge status={r.status} /></Td>
                      <Td>{r.purchaseAmount ? formatMoney(r.purchaseAmount as unknown as number) : dict.common.dash}</Td>
                      <Td>{r.commissions[0] ? formatMoney(r.commissions[0].amount as unknown as number) : dict.common.dash}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{c.commissionHistory}</CardTitle></CardHeader>
            {affiliate.commissions.length === 0 ? (
              <Empty text={c.noCommissions} />
            ) : (
              <Table>
                <thead>
                  <tr><Th>{dict.earnings.columns.date}</Th><Th>{dict.common.amount}</Th><Th>{dict.common.status}</Th><Th>{c.adjustments}</Th></tr>
                </thead>
                <tbody>
                  {affiliate.commissions.map((cm) => (
                    <tr key={cm.id}>
                      <Td>{formatDate(cm.createdAt)}</Td>
                      <Td>{formatMoney(cm.amount as unknown as number)}</Td>
                      <Td><Badge status={cm.status} /></Td>
                      <Td>{cm.adjustments.length > 0 ? interpolate(c.adjustmentCount, { n: cm.adjustments.length }) : dict.common.dash}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{c.payoutHistory}</CardTitle></CardHeader>
            {affiliate.payouts.length === 0 ? (
              <Empty text={c.noPayouts} />
            ) : (
              <Table>
                <thead>
                  <tr><Th>{dict.earnings.columns.date}</Th><Th>{dict.common.amount}</Th><Th>{dict.common.status}</Th><Th>{c.cashAppUsed}</Th><Th>{c.reference}</Th></tr>
                </thead>
                <tbody>
                  {affiliate.payouts.map((p) => (
                    <tr key={p.id}>
                      <Td>{p.paymentDate ? formatDate(p.paymentDate) : formatDate(p.createdAt)}</Td>
                      <Td>{formatMoney(p.amount as unknown as number)}</Td>
                      <Td><Badge status={p.status} /></Td>
                      <Td className="text-xs">{p.cashAppHandleUsed || dict.common.dash}</Td>
                      <Td className="text-xs">{p.paymentReference || dict.common.dash}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{c.bonusHistory}</CardTitle></CardHeader>
            {affiliate.bonuses.length === 0 ? (
              <Empty text={c.noBonuses} />
            ) : (
              <Table>
                <thead>
                  <tr><Th>{c.month}</Th><Th>{c.threshold}</Th><Th>{dict.common.amount}</Th><Th>{dict.common.status}</Th></tr>
                </thead>
                <tbody>
                  {affiliate.bonuses.map((b) => (
                    <tr key={b.id}>
                      <Td>{b.bonusMonth}</Td>
                      <Td>{b.threshold}</Td>
                      <Td>{formatMoney(b.bonusAmount as unknown as number)}</Td>
                      <Td><Badge status={b.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{c.emailHistory}</CardTitle></CardHeader>
            {affiliate.emailEvents.length === 0 ? (
              <Empty text={c.noEmails} />
            ) : (
              <Table>
                <thead>
                  <tr><Th>{dict.earnings.columns.date}</Th><Th>{c.type}</Th><Th>{c.subject}</Th><Th>{dict.common.status}</Th></tr>
                </thead>
                <tbody>
                  {affiliate.emailEvents.map((e) => (
                    <tr key={e.id}>
                      <Td>{formatDateTime(e.sentAt)}</Td>
                      <Td className="capitalize">{e.type.replace(/_/g, " ")}</Td>
                      <Td className="text-xs">{e.subject}</Td>
                      <Td><Badge status={e.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{c.auditHistory}</CardTitle></CardHeader>
            {affiliate.auditLogsAbout.length === 0 ? (
              <Empty text={c.noAudit} />
            ) : (
              <Table>
                <thead>
                  <tr><Th>{dict.earnings.columns.date}</Th><Th>{c.action}</Th><Th>{c.admin}</Th><Th>{c.reason}</Th></tr>
                </thead>
                <tbody>
                  {affiliate.auditLogsAbout.map((log) => (
                    <tr key={log.id}>
                      <Td>{formatDateTime(log.createdAt)}</Td>
                      <Td className="capitalize">{log.action.replace(/_/g, " ")}</Td>
                      <Td>{log.admin?.name || c.system}</Td>
                      <Td className="text-xs">{log.reason || dict.common.dash}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>{c.adminActions}</CardTitle></CardHeader>
            <AffiliateActions
              affiliateId={affiliate.id}
              currentStatus={affiliate.status}
              currentType={affiliate.affiliateType}
              currentTierId={affiliate.tierId}
              tiers={tiers}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-nmsa-gray-dark uppercase">{label}</div>
      <div className={`font-medium mt-0.5 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-nmsa-gray-dark py-6 text-center">{text}</p>;
}
