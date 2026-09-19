import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAffiliateBalances } from "@/lib/payouts";
import { formatMoney } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; q?: string };
}) {
  const { dict } = getDictionary();
  const c = dict.admin.affiliates;

  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.affiliateType = searchParams.type;
  if (searchParams.q) {
    where.OR = [
      { firstName: { contains: searchParams.q, mode: "insensitive" } },
      { lastName: { contains: searchParams.q, mode: "insensitive" } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const affiliates = await prisma.affiliate.findMany({
    where,
    include: { tier: true, _count: { select: { referrals: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const rows = await Promise.all(
    affiliates.map(async (a) => ({
      affiliate: a,
      balances: await getAffiliateBalances(a.id),
      completedCount: await prisma.affiliateReferral.count({
        where: { affiliateId: a.id, status: { in: ["completed", "commission_pending", "commission_approved", "paid"] } },
      }),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>
        <a href="/api/admin/export/affiliates">
          <Button variant="outline" size="sm">{c.exportCsv}</Button>
        </a>
      </div>

      <Card>
        <form method="get" className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder={c.searchPlaceholder}
            className="focus-ring flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
          />
          <select name="type" defaultValue={searchParams.type || ""} className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
            <option value="">{dict.common.allTypes}</option>
            <option value="educator">{dict.statuses.educator}</option>
            <option value="practitioner">{dict.statuses.practitioner}</option>
            <option value="general">{dict.statuses.general}</option>
          </select>
          <select name="status" defaultValue={searchParams.status || ""} className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
            <option value="">{dict.common.allStatuses}</option>
            <option value="pending">{dict.statuses.pending}</option>
            <option value="active">{dict.statuses.active}</option>
            <option value="suspended">{dict.statuses.suspended}</option>
          </select>
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">{dict.common.filterButton}</button>
        </form>

        <Table>
          <thead>
            <tr>
              <Th>{c.columns.name}</Th>
              <Th>{c.columns.type}</Th>
              <Th>{c.columns.status}</Th>
              <Th>{c.columns.total}</Th>
              <Th>{c.columns.completed}</Th>
              <Th>{c.columns.lifetimeEarnings}</Th>
              <Th>{c.columns.balanceOwed}</Th>
              <Th>{c.columns.paid}</Th>
              <Th>{c.columns.cashApp}</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ affiliate: a, balances, completedCount }) => {
              const typeKey = a.affiliateType as keyof typeof dict.statuses;
              return (
                <tr key={a.id}>
                  <Td className="font-semibold whitespace-nowrap">{a.firstName} {a.lastName}<div className="text-xs font-normal text-nmsa-gray-dark">{a.email}</div></Td>
                  <Td>{dict.statuses[typeKey] ?? a.affiliateType}</Td>
                  <Td><Badge status={a.status} /></Td>
                  <Td>{a._count.referrals}</Td>
                  <Td>{completedCount}</Td>
                  <Td>{formatMoney(balances.cashEarned)}</Td>
                  <Td className="font-semibold">{formatMoney(balances.cashAvailable + balances.cashPending)}</Td>
                  <Td>{formatMoney(balances.cashPaid)}</Td>
                  <Td className="text-xs">{a.cashAppHandle || dict.common.dash}</Td>
                  <Td>
                    <Link href={`/admin/affiliates/${a.id}`} className="text-nmsa-navy font-semibold underline text-xs">
                      {dict.common.view}
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {rows.length === 0 && <p className="text-center text-sm text-nmsa-gray-dark py-8">{c.empty}</p>}
      </Card>
    </div>
  );
}
