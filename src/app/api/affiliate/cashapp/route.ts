import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAffiliateSession } from "@/lib/api-auth";
import { cashAppUpdateSchema } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { getDictionary } from "@/i18n/dictionaries";

export async function POST(req: NextRequest) {
  const session = await requireAffiliateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = cashAppUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const newHandle = parsed.data.cashAppHandle.trim();

  try {
    const affiliate = await prisma.affiliate.findUniqueOrThrow({ where: { id: session.user.id } });

    await prisma.$transaction([
      prisma.affiliate.update({
        where: { id: session.user.id },
        data: { cashAppHandle: newHandle, cashAppHandleUpdatedAt: new Date(), cashAppConfirmedAt: new Date() },
      }),
      prisma.affiliateCashAppHistory.create({
        data: {
          affiliateId: session.user.id,
          oldHandle: affiliate.cashAppHandle,
          newHandle,
        },
      }),
    ]);

    await logAuditEvent({
      affiliateId: session.user.id,
      action: "cash_app_updated",
      previousValue: { cashAppHandle: affiliate.cashAppHandle },
      newValue: { cashAppHandle: newHandle },
    });

    const { dict } = await getDictionary();
    return NextResponse.json({
      ok: true,
      message: dict.profile.successMessage,
    });
  } catch (err) {
    console.error("cash app update failed", err);
    return NextResponse.json(
      { error: "We couldn't update your Cash App handle just now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
