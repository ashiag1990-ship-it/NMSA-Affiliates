import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { PayoutActions } from "@/components/admin/PayoutActions";
import { RunPayoutEligibilityButton } from "@/components/admin/RunPayoutEligibilityButton";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AdminPayoutsPage({ searchParams }: { searchParams: { status?: string } }) {
  const { dict } = getDictionary();
  const c = dict.admin.payouts;

  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;

  const payouts = await prisma.affiliatePayout.findMany({
    where,
    include: { affiliate: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>
        <RunPayoutEligibilityButton />
      </div>

      <Card>
        <CardHeader><CardTitle>{c.allPayouts}</CardTitle></CardHeader>
        <form method="get" className="flex gap-3 mb-5">
          <select name="status" defaultValue={searchParams.status || ""} className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
            <option value="">{dict.common.allStatuses}</option>
            <option value="eligible">{c.eligible}</option>
            <option value="processing">{c.processing}</option>
            <option value="paid">{c.paid}</option>
            <option value="on_hold">{c.onHold}</option>
          </select>
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">{dict.common.filterButton}</button>
        </form>

        <Table>
          <thead>
            <tr>
              <Th>{c.columns.affiliate}</Th><Th>{c.columns.amount}</Th><Th>{c.columns.status}</Th><Th>{c.columns.cashApp}</Th><Th>{c.columns.created}</Th><Th>{c.columns.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/admin/affiliates/${p.affiliateId}`} className="text-nmsa-navy font-semibold underline">
                    {p.affiliate.firstName} {p.affiliate.lastName}
                  </Link>
                </Td>
                <Td className="font-semibold">{formatMoney(p.amount as unknown as number)}</Td>
                <Td><Badge status={p.status} /></Td>
                <Td className="text-xs">{p.affiliate.cashAppHandle || dict.common.dash}</Td>
                <Td>{formatDate(p.createdAt)}</Td>
                <Td>
                  {p.status === "paid" ? (
                    <span className="text-xs text-nmsa-gray-dark">
                      {c.paidOn} {p.paymentDate ? formatDate(p.paymentDate) : ""}
                    </span>
                  ) : (
                    <PayoutActions payoutId={p.id} cashAppHandle={p.affiliate.cashAppHandle} />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {payouts.length === 0 && <p className="text-center text-sm text-nmsa-gray-dark py-8">{c.empty}</p>}
      </Card>
    </div>
  );
}
