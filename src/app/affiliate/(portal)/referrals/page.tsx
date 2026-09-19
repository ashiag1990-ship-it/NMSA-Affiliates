import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatMoney } from "@/lib/utils";
import { getDictionary } from "@/i18n/dictionaries";

const STATUS_OPTIONS = [
  "clicked", "registered", "enrolled", "payment_pending", "completed",
  "commission_pending", "commission_approved", "paid", "cancelled", "refunded",
] as const;

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");

  const { dict } = getDictionary();

  const where: any = { affiliateId: session.user.id };
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { customerName: { contains: searchParams.q, mode: "insensitive" } },
      { customerEmail: { contains: searchParams.q, mode: "insensitive" } },
      { referralCode: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const referrals = await prisma.affiliateReferral.findMany({
    where,
    include: { commissions: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.referrals.title}</h1>

      <Card>
        <form className="flex flex-col sm:flex-row gap-3 mb-5" method="get">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder={dict.referrals.searchPlaceholder}
            className="focus-ring flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
          />
          <select
            name="status"
            defaultValue={searchParams.status || ""}
            className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
          >
            <option value="">{dict.common.allStatuses}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {dict.statuses[s]}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">
            {dict.common.filterButton}
          </button>
        </form>

        {referrals.length === 0 ? (
          <p className="text-sm text-nmsa-gray-dark py-8 text-center">{dict.referrals.empty}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{dict.referrals.columns.customer}</Th>
                <Th>{dict.referrals.columns.referralDate}</Th>
                <Th>{dict.referrals.columns.referralCode}</Th>
                <Th>{dict.referrals.columns.product}</Th>
                <Th>{dict.referrals.columns.purchaseAmount}</Th>
                <Th>{dict.referrals.columns.referralStatus}</Th>
                <Th>{dict.referrals.columns.commission}</Th>
                <Th>{dict.referrals.columns.commissionStatus}</Th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <Td>{r.customerName || r.customerEmail || dict.common.dash}</Td>
                  <Td>{formatDate(r.createdAt)}</Td>
                  <Td className="font-mono text-xs">{r.referralCode}</Td>
                  <Td>{r.productLabel || (r.licenseLevel ? `Level ${r.licenseLevel}` : dict.common.dash)}</Td>
                  <Td>{r.purchaseAmount ? formatMoney(r.purchaseAmount as unknown as number) : dict.common.dash}</Td>
                  <Td>
                    <Badge status={r.status} />
                  </Td>
                  <Td>{r.commissions[0] ? formatMoney(r.commissions[0].amount as unknown as number) : dict.common.dash}</Td>
                  <Td>{r.commissions[0] ? <Badge status={r.commissions[0].status} /> : dict.common.dash}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
