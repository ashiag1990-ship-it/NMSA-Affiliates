import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";

const CAMPAIGN_TYPES = ["new_referral", "new_commission", "payout_ready", "payout_completed", "below_minimum", "training_reminder"] as const;

const EMAIL_DICT_KEY = {
  new_referral: "newReferral",
  new_commission: "newCommission",
  payout_ready: "payoutReady",
  payout_completed: "payoutCompleted",
  below_minimum: "belowMinimum",
  training_reminder: "trainingReminder",
} as const;

export default async function AdminEmailCampaignsPage({ searchParams }: { searchParams: { type?: string } }) {
  const { dict } = getDictionary();
  const c = dict.admin.emailCampaigns;

  const CAMPAIGNS = CAMPAIGN_TYPES.map((type) => ({
    type,
    subject: dict.emails[EMAIL_DICT_KEY[type]].subject,
    trigger: c.triggers[type],
  }));

  const where: any = {};
  if (searchParams.type) where.type = searchParams.type;

  const events = await prisma.affiliateEmailEvent.findMany({
    where,
    include: { affiliate: true },
    orderBy: { sentAt: "desc" },
    take: 200,
  });

  const provider = process.env.EMAIL_PROVIDER || "stub";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>

      {provider === "stub" && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900">
          {c.stubNotice} <strong>{c.stubBold}</strong> {c.stubNoticeRest}{" "}
          <code className="text-xs bg-white/60 px-1 rounded">EMAIL_PROVIDER</code> {c.stubNoticeEnd}{" "}
          <code className="text-xs bg-white/60 px-1 rounded">sendViaProvider()</code> {c.stubNoticeIn}{" "}
          <code className="text-xs bg-white/60 px-1 rounded">src/lib/email.ts</code> {c.stubNoticeGoLive}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{c.automatedTitle}</CardTitle></CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CAMPAIGNS.map((camp) => (
            <div key={camp.type} className="rounded-lg border border-gray-200 p-4">
              <div className="text-xs font-bold uppercase text-nmsa-gold bg-nmsa-navy inline-block px-2 py-0.5 rounded-full">
                {camp.type.replace(/_/g, " ")}
              </div>
              <div className="text-sm font-semibold text-nmsa-navy mt-2">{camp.subject}</div>
              <div className="text-xs text-nmsa-gray-dark mt-1">{camp.trigger}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>{c.sendHistoryTitle}</CardTitle></CardHeader>
        <form method="get" className="flex gap-3 mb-5">
          <select name="type" defaultValue={searchParams.type || ""} className="focus-ring rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
            <option value="">{dict.common.allTypes}</option>
            {CAMPAIGNS.map((camp) => <option key={camp.type} value={camp.type}>{camp.type.replace(/_/g, " ")}</option>)}
          </select>
          <button className="rounded-lg bg-nmsa-navy text-white px-5 py-2.5 text-sm font-semibold">{dict.common.filterButton}</button>
        </form>

        <Table>
          <thead><tr><Th>{c.columns.date}</Th><Th>{c.columns.affiliate}</Th><Th>{c.columns.type}</Th><Th>{c.columns.subject}</Th><Th>{c.columns.status}</Th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <Td>{formatDateTime(e.sentAt)}</Td>
                <Td>
                  <Link href={`/admin/affiliates/${e.affiliateId}`} className="text-nmsa-navy font-semibold underline">
                    {e.affiliate.firstName} {e.affiliate.lastName}
                  </Link>
                </Td>
                <Td className="capitalize">{e.type.replace(/_/g, " ")}</Td>
                <Td className="text-xs">{e.subject}</Td>
                <Td><Badge status={e.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {events.length === 0 && <p className="text-center text-sm text-nmsa-gray-dark py-8">{c.empty}</p>}
      </Card>
    </div>
  );
}
