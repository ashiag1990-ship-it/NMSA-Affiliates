import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import {
  manuallyApproveCommission,
  rejectCommission,
  reverseCommission,
  adjustCommission,
} from "@/lib/commission-engine";
import { recalcAffiliateTier } from "@/lib/tiers";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["approve", "reject", "reverse", "adjust"]),
  reason: z.string().optional(),
  amount: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { action, reason, amount } = parsed.data;

  try {
    if (action === "approve") {
      await manuallyApproveCommission(id, session.user.id);
    } else if (action === "reject") {
      if (!reason) return NextResponse.json({ error: "A reason is required to reject a commission." }, { status: 400 });
      await rejectCommission(id, session.user.id, reason);
    } else if (action === "reverse") {
      if (!reason) return NextResponse.json({ error: "A reason is required to reverse a commission." }, { status: 400 });
      await reverseCommission(id, session.user.id, reason);
    } else if (action === "adjust") {
      if (amount == null || !reason) {
        return NextResponse.json({ error: "An amount and reason are required for a manual adjustment." }, { status: 400 });
      }
      await adjustCommission(id, session.user.id, amount, reason);
    }

    const commission = await prisma.affiliateCommission.findUnique({ where: { id } });
    if (commission) await recalcAffiliateTier(commission.affiliateId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 400 });
  }
}
