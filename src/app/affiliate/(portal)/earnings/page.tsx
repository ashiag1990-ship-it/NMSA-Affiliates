import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAffiliateBalances } from "@/lib/payouts";
import { formatDate, formatMoney } from "@/lib/utils";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";

export default async function EarningsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");
  const affiliateId = session.user.id;
  const { dict } = getDictionary();

  const [balances, commissions] = await Promise.all([
    getAffiliateBalances(affiliateId),
    prisma.affiliateCommission.findMany({
      where: { affiliateId },
      include: { referral: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.earnings.title}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label={dict.earnings.lifetimeEarnings} value={formatMoney(balances.cashEarned)} />
        <StatTile label={dict.earnings.availableBalance} value={formatMoney(balances.cashAvailable)} />
        <StatTile label={dict.earnings.pendingCommissions} value={formatMoney(balances.cashPending)} />
        <StatTile label={dict.earnings.paidCommissions} value={formatMoney(balances.cashPaid)} />
      </div>

      <Card>
        {commissions.length === 0 ? (
          <p className="text-sm text-nmsa-gray-dark py-8 text-center">{dict.earnings.empty}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{dict.earnings.columns.date}</Th>
                <Th>{dict.earnings.columns.customer}</Th>
                <Th>{dict.earnings.columns.product}</Th>
                <Th>{dict.earnings.columns.purchaseAmount}</Th>
                <Th>{dict.earnings.columns.commission}</Th>
                <Th>{dict.earnings.columns.status}</Th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id}>
                  <Td>{formatDate(c.createdAt)}</Td>
                  <Td>{c.referral.customerName || c.referral.customerEmail || dict.common.dash}</Td>
                  <Td>{c.referral.productLabel || (c.referral.licenseLevel ? `Level ${c.referral.licenseLevel}` : dict.common.dash)}</Td>
                  <Td>{c.referral.purchaseAmount ? formatMoney(c.referral.purchaseAmount as unknown as number) : dict.common.dash}</Td>
                  <Td className="font-semibold">{formatMoney(c.amount as unknown as number)}</Td>
                  <Td>
                    <Badge status={c.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
