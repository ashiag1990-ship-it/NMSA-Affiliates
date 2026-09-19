import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AdminAuditLogPage({ searchParams }: { searchParams: { action?: string; q?: string } }) {
  const { dict } = getDictionary();
  const c = dict.admin.auditLog;

  const where: any = {};
  if (searchParams.action) where.action = { contains: searchParams.action };

  const logs = await prisma.affiliateAuditLog.findMany({
    where,
    include: { admin: true, affiliate: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>
      <p className="text-sm text-nmsa-gray-dark">{c.intro}</p>

      <Card>
        <form method="get" className="flex gap-3 mb-5">
          <input
            type="text"
            name="action"
            defaultValue={searchParams.action}
            placeholder={c.searchPlaceholder}
            className="focus-ring flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
          />
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">{dict.common.filterButton}</button>
        </form>

        <Table>
          <thead><tr><Th>{c.columns.date}</Th><Th>{c.columns.action}</Th><Th>{c.columns.admin}</Th><Th>{c.columns.affiliate}</Th><Th>{c.columns.reason}</Th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <Td className="whitespace-nowrap">{formatDateTime(log.createdAt)}</Td>
                <Td className="capitalize">{log.action.replace(/_/g, " ")}</Td>
                <Td>{log.admin?.name || <span className="text-nmsa-gray-dark">{c.system}</span>}</Td>
                <Td>
                  {log.affiliate ? (
                    <Link href={`/admin/affiliates/${log.affiliateId}`} className="text-nmsa-navy font-semibold underline">
                      {log.affiliate.firstName} {log.affiliate.lastName}
                    </Link>
                  ) : (
                    dict.common.dash
                  )}
                </Td>
                <Td className="text-xs">{log.reason || dict.common.dash}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {logs.length === 0 && <p className="text-center text-sm text-nmsa-gray-dark py-8">{c.empty}</p>}
      </Card>
    </div>
  );
}
