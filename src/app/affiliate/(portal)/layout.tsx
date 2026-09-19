import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AffiliatePortalShell } from "@/components/affiliate/AffiliatePortalShell";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: session.user.id },
    include: { training: true },
  });
  if (!affiliate) redirect("/affiliate/login");

  const { dict } = await getDictionary();

  let banner: React.ReactNode = null;
  if (affiliate.status === "suspended") {
    banner = (
      <div className="bg-red-600 text-white text-sm px-4 py-2.5 text-center">
        {dict.affiliateBanner.suspended}
      </div>
    );
  } else if (!affiliate.training?.trainingCompleted) {
    banner = (
      <div className="bg-amber-400 text-nmsa-navy text-sm px-4 py-2.5 text-center font-semibold">
        {dict.affiliateBanner.trainingIncomplete}
      </div>
    );
  }

  return (
    <AffiliatePortalShell
      name={`${affiliate.firstName} ${affiliate.lastName}`}
      affiliateType={affiliate.affiliateType}
      locale={affiliate.locale}
      statusBanner={banner}
    >
      {children}
    </AffiliatePortalShell>
  );
}
