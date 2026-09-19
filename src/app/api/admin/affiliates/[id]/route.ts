import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logAuditEvent } from "@/lib/audit";

const patchSchema = z.object({
  status: z.enum(["pending", "active", "suspended"]).optional(),
  affiliateType: z.enum(["educator", "practitioner", "general"]).optional(),
  tierId: z.string().nullable().optional(),
  suspendedReason: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: params.id },
    include: {
      profile: true,
      training: true,
      tier: true,
      referrals: { orderBy: { createdAt: "desc" }, take: 50 },
      commissions: { orderBy: { createdAt: "desc" }, take: 50, include: { adjustments: true } },
      payouts: { orderBy: { createdAt: "desc" } },
      bonuses: { orderBy: { createdAt: "desc" } },
      emailEvents: { orderBy: { sentAt: "desc" }, take: 30 },
      cashAppHistory: { orderBy: { changedAt: "desc" } },
      auditLogsAbout: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ affiliate });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const before = await prisma.affiliate.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "suspended") {
    data.suspendedAt = new Date();
  } else if (parsed.data.status) {
    data.suspendedAt = null;
    data.suspendedReason = null;
  }

  const updated = await prisma.affiliate.update({ where: { id: params.id }, data });

  const action =
    parsed.data.status === "suspended"
      ? "affiliate_suspended"
      : parsed.data.status === "active" && before.status !== "active"
      ? "affiliate_activated"
      : parsed.data.tierId !== undefined
      ? "tier_changed"
      : parsed.data.affiliateType
      ? "affiliate_type_changed"
      : "affiliate_updated";

  await logAuditEvent({
    adminId: session.user.id,
    affiliateId: params.id,
    action,
    previousValue: before,
    newValue: parsed.data,
    reason: parsed.data.suspendedReason,
  });

  return NextResponse.json({ affiliate: updated });
}
