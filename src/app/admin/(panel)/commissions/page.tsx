import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CommissionActions } from "@/components/admin/CommissionActions";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AdminCommissionsPage({ searchParams }: { searchParams: { status?: string } }) {
  const { dict } = getDictionary();
  const c = dict.admin.commissions;

  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;

  const commissions = await prisma.affiliateCommission.findMany({
    where,
    include: { affiliate: true, referral: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>
      <Card>
        <form method="get" className="flex gap-3 mb-5">
          <select name="status" defaultValue={searchParams.status || ""} className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
            <option value="">{dict.common.allStatuses}</option>
            <option value="pending">{dict.statuses.pending}</option>
            <option value="approved">{dict.statuses.approved}</option>
            <option value="paid">{dict.statuses.paid}</option>
            <option value="rejected">{dict.statuses.rejected}</option>
            <option value="reversed">{dict.statuses.reversed}</option>
          </select>
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">{dict.common.filterButton}</button>
        </form>

        <Table>
          <thead>
            <tr>
              <Th>{c.columns.date}</Th><Th>{c.columns.affiliate}</Th><Th>{c.columns.customer}</Th><Th>{c.columns.amount}</Th><Th>{c.columns.status}</Th><Th>{c.columns.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((cm) => (
              <tr key={cm.id}>
                <Td>{formatDate(cm.createdAt)}</Td>
                <Td>
                  <Link href={`/admin/affiliates/${cm.affiliateId}`} className="text-nmsa-navy font-semibold underline">
                    {cm.affiliate.firstName} {cm.affiliate.lastName}
                  </Link>
                </Td>
                <Td>{cm.referral.customerName || cm.referral.customerEmail || dict.common.dash}</Td>
                <Td className="font-semibold">{formatMoney(cm.amount as unknown as number)}</Td>
                <Td><Badge status={cm.status} /></Td>
                <Td><CommissionActions commissionId={cm.id} status={cm.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {commissions.length === 0 && <p className="text-center text-sm text-nmsa-gray-dark py-8">{c.empty}</p>}
      </Card>
    </div>
  );
}
