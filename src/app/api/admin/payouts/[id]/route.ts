import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { markPayoutPaid } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const markPaidSchema = z.object({
  action: z.literal("mark_paid"),
  paymentDate: z.string(),
  paymentReference: z.string().optional(),
  adminNotes: z.string().optional(),
  confirmedCashAppHandle: z.string().min(1, "You must confirm the Cash App handle before marking this paid."),
});

const holdSchema = z.object({
  action: z.literal("on_hold"),
  reason: z.string().optional(),
});

const schema = z.union([markPaidSchema, holdSchema]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });

  const payout = await prisma.affiliatePayout.findUnique({ where: { id: params.id }, include: { affiliate: true } });
  if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

  if (parsed.data.action === "mark_paid") {
    // Require the admin to explicitly re-confirm the exact Cash App handle
    // being paid — the Cash App payment-safety check from the spec.
    if (parsed.data.confirmedCashAppHandle.trim() !== (payout.affiliate.cashAppHandle || "").trim()) {
      return NextResponse.json(
        { error: "The confirmed Cash App handle doesn't match the handle on file. Double-check before marking this paid." },
        { status: 400 }
      );
    }
    try {
      await markPayoutPaid(params.id, session.user.id, {
        paymentDate: new Date(parsed.data.paymentDate),
        paymentReference: parsed.data.paymentReference,
        adminNotes: parsed.data.adminNotes,
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 400 });
    }
  }

  if (parsed.data.action === "on_hold") {
    await prisma.affiliatePayout.update({ where: { id: params.id }, data: { status: "on_hold" } });
    await logAuditEvent({
      adminId: session.user.id,
      affiliateId: payout.affiliateId,
      action: "payout_on_hold",
      reason: parsed.data.reason,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
