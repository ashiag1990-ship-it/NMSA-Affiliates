import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { getAffiliateBalances } from "@/lib/payouts";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affiliates = await prisma.affiliate.findMany({
    include: { tier: true, _count: { select: { referrals: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Affiliate Name", "Email", "Affiliate Type", "Status", "Tier", "Total Referrals",
    "Cash Earned", "Cash Pending", "Cash Available", "Cash Paid", "Cash App", "Created At",
  ];

  const rows: string[] = [headers.join(",")];

  for (const a of affiliates) {
    const balances = await getAffiliateBalances(a.id);
    rows.push(
      [
        csvEscape(`${a.firstName} ${a.lastName}`),
        csvEscape(a.email),
        csvEscape(a.affiliateType),
        csvEscape(a.status),
        csvEscape(a.tier?.name ?? ""),
        csvEscape(a._count.referrals),
        csvEscape(balances.cashEarned.toFixed(2)),
        csvEscape(balances.cashPending.toFixed(2)),
        csvEscape(balances.cashAvailable.toFixed(2)),
        csvEscape(balances.cashPaid.toFixed(2)),
        csvEscape(a.cashAppHandle ?? ""),
        csvEscape(a.createdAt.toISOString()),
      ].join(",")
    );
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nmsa-affiliates-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
