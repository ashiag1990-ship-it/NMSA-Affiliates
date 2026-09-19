import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CashAppForm } from "@/components/affiliate/CashAppForm";
import { formatDateTime } from "@/lib/utils";
import { Table, Th, Td } from "@/components/ui/Table";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");
  const { dict } = getDictionary();

  const affiliate = await prisma.affiliate.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { profile: true },
  });
  const cashAppHistory = await prisma.affiliateCashAppHistory.findMany({
    where: { affiliateId: session.user.id },
    orderBy: { changedAt: "desc" },
    take: 10,
  });

  const typeKey = affiliate.affiliateType as keyof typeof dict.signup.affiliateTypes;
  const typeLabel = dict.signup.affiliateTypes[typeKey]?.label ?? affiliate.affiliateType;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{dict.profile.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{dict.profile.accountInfo}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.name}</div>
            <div className="font-medium mt-0.5">{affiliate.firstName} {affiliate.lastName}</div>
          </div>
          <div>
            <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.email}</div>
            <div className="font-medium mt-0.5">{affiliate.email}</div>
          </div>
          <div>
            <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.phone}</div>
            <div className="font-medium mt-0.5">{affiliate.phone}</div>
          </div>
          <div>
            <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.affiliateType}</div>
            <div className="font-medium mt-0.5">{typeLabel}</div>
          </div>
          {affiliate.profile?.businessName && (
            <div>
              <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.businessName}</div>
              <div className="font-medium mt-0.5">{affiliate.profile.businessName}</div>
            </div>
          )}
          {affiliate.profile?.website && (
            <div>
              <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.website}</div>
              <div className="font-medium mt-0.5">{affiliate.profile.website}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-nmsa-gray-dark uppercase">{dict.profile.languagePreference}</div>
            <div className="mt-1.5">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.profile.cashAppSettings}</CardTitle>
        </CardHeader>
        <CashAppForm currentHandle={affiliate.cashAppHandle} />
      </Card>

      {cashAppHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.profile.cashAppHistory}</CardTitle>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>{dict.profile.columns.dateChanged}</Th>
                <Th>{dict.profile.columns.previousHandle}</Th>
                <Th>{dict.profile.columns.newHandle}</Th>
              </tr>
            </thead>
            <tbody>
              {cashAppHistory.map((h) => (
                <tr key={h.id}>
                  <Td>{formatDateTime(h.changedAt)}</Td>
                  <Td>{h.oldHandle || dict.common.dash}</Td>
                  <Td>{h.newHandle}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
