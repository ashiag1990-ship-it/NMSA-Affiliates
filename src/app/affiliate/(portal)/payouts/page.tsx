import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAffiliateBalances } from "@/lib/payouts";
import { getProgramSettings } from "@/lib/settings";
import { formatDate, formatMoney, nextPayoutDate } from "@/lib/utils";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";

export default async function PayoutsPage() {
  const session = await auth();
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");
  const affiliateId = session.user.id;
  const { dict, locale } = await getDictionary();

  const [payouts, balances, settings] = await Promise.all([
    prisma.affiliatePayout.findMany({ where: { affiliateId }, orderBy: { createdAt: "desc" } }),
    getAffiliateBalances(affiliateId),
    getProgramSettings(),
  ]);

  const minimum = Number(settings.payoutMinimum);
  const nextPayout = nextPayoutDate(settings.payoutDayOfMonth);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.payouts.title}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label={dict.payouts.availableBalance} value={formatMoney(balances.cashAvailable)} />
        <StatTile label={dict.payouts.minimumPayout} value={formatMoney(minimum)} />
        <StatTile
          label={dict.payouts.nextPayoutDate}
          value={nextPayout.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { month: "long", day: "numeric" })}
        />
        <StatTile label={dict.payouts.lifetimePaid} value={formatMoney(balances.cashPaid)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.payouts.historyTitle}</CardTitle>
        </CardHeader>
        {payouts.length === 0 ? (
          <p className="text-sm text-nmsa-gray-dark py-8 text-center">{dict.payouts.empty}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{dict.payouts.columns.payoutDate}</Th>
                <Th>{dict.payouts.columns.amount}</Th>
                <Th>{dict.payouts.columns.paymentMethod}</Th>
                <Th>{dict.payouts.columns.status}</Th>
                <Th>{dict.payouts.columns.reference}</Th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <Td>{p.paymentDate ? formatDate(p.paymentDate) : dict.common.dash}</Td>
                  <Td className="font-semibold">{formatMoney(p.amount as unknown as number)}</Td>
                  <Td>{p.paymentMethod}</Td>
                  <Td>
                    <Badge status={p.status} />
                  </Td>
                  <Td className="text-xs">{p.paymentReference || dict.common.dash}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
