import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AdminBonusesPage() {
  const { dict } = await getDictionary();
  const c = dict.admin.bonuses;

  const bonuses = await prisma.affiliateBonus.findMany({
    include: { affiliate: true, bonusRule: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>
      <p className="text-sm text-nmsa-gray-dark">
        {c.intro}{" "}
        <Link href="/admin/settings" className="underline font-semibold">
          {c.settingsLink}
        </Link>
        .
      </p>

      <Card>
        <CardHeader><CardTitle>{c.awardedTitle}</CardTitle></CardHeader>
        {bonuses.length === 0 ? (
          <p className="text-sm text-nmsa-gray-dark py-8 text-center">{c.empty}</p>
        ) : (
          <Table>
            <thead>
              <tr><Th>{c.columns.affiliate}</Th><Th>{c.columns.month}</Th><Th>{c.columns.rule}</Th><Th>{c.columns.threshold}</Th><Th>{c.columns.amount}</Th><Th>{c.columns.status}</Th></tr>
            </thead>
            <tbody>
              {bonuses.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <Link href={`/admin/affiliates/${b.affiliateId}`} className="text-nmsa-navy font-semibold underline">
                      {b.affiliate.firstName} {b.affiliate.lastName}
                    </Link>
                  </Td>
                  <Td>{b.bonusMonth}</Td>
                  <Td>{b.bonusRule?.name || dict.common.dash}</Td>
                  <Td>{b.threshold} {c.referralsSuffix}</Td>
                  <Td className="font-semibold">{formatMoney(b.bonusAmount as unknown as number)}</Td>
                  <Td><Badge status={b.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
