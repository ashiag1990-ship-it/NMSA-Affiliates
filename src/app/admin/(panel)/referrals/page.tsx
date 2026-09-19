import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";

const STATUS_OPTIONS = [
  "clicked", "registered", "enrolled", "payment_pending", "completed",
  "commission_pending", "commission_approved", "paid", "cancelled", "refunded",
] as const;

export default async function AdminReferralsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ status?: string; q?: string; fraud?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { dict } = await getDictionary();
  const c = dict.admin.referrals;

  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.fraud === "1") where.fraudFlag = true;
  if (searchParams.q) {
    where.OR = [
      { customerName: { contains: searchParams.q, mode: "insensitive" } },
      { customerEmail: { contains: searchParams.q, mode: "insensitive" } },
      { referralCode: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const referrals = await prisma.affiliateReferral.findMany({
    where,
    include: { affiliate: true, commissions: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>
      <Card>
        <form method="get" className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder={c.searchPlaceholder}
            className="focus-ring flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
          />
          <select name="status" defaultValue={searchParams.status || ""} className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
            <option value="">{dict.common.allStatuses}</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{dict.statuses[s]}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs px-2">
            <input type="checkbox" name="fraud" value="1" defaultChecked={searchParams.fraud === "1"} className="accent-nmsa-navy" />
            {c.flaggedOnly}
          </label>
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">{dict.common.filterButton}</button>
        </form>

        <Table>
          <thead>
            <tr>
              <Th>{c.columns.date}</Th><Th>{c.columns.affiliate}</Th><Th>{c.columns.customer}</Th><Th>{c.columns.status}</Th>
              <Th>{c.columns.amount}</Th><Th>{c.columns.commission}</Th><Th>{c.columns.flag}</Th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id}>
                <Td>{formatDate(r.createdAt)}</Td>
                <Td>
                  <Link href={`/admin/affiliates/${r.affiliateId}`} className="text-nmsa-navy font-semibold underline">
                    {r.affiliate.firstName} {r.affiliate.lastName}
                  </Link>
                </Td>
                <Td>{r.customerName || r.customerEmail || dict.common.dash}</Td>
                <Td><Badge status={r.status} /></Td>
                <Td>{r.purchaseAmount ? formatMoney(r.purchaseAmount as unknown as number) : dict.common.dash}</Td>
                <Td>{r.commissions[0] ? formatMoney(r.commissions[0].amount as unknown as number) : dict.common.dash}</Td>
                <Td>{r.fraudFlag ? <Badge status="suspended" label={r.fraudReason || c.flaggedLabel} /> : dict.common.dash}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {referrals.length === 0 && <p className="text-center text-sm text-nmsa-gray-dark py-8">{c.empty}</p>}
      </Card>
    </div>
  );
}
