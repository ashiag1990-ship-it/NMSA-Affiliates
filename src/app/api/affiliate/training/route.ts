import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAffiliateSession } from "@/lib/api-auth";
import { trainingProgressSchema } from "@/lib/validation";
import { generateUniqueReferralCode, buildReferralUrl } from "@/lib/referral";
import { getProgramSettings } from "@/lib/settings";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  const session = await requireAffiliateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const training = await prisma.affiliateTraining.findUnique({ where: { affiliateId: session.user.id } });
  return NextResponse.json({ training });
}

export async function POST(req: NextRequest) {
  const session = await requireAffiliateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = trainingProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { slide, action } = parsed.data;
  const affiliateId = session.user.id;

  const training = await prisma.affiliateTraining.findUnique({ where: { affiliateId } });
  if (!training) return NextResponse.json({ error: "Training record not found" }, { status: 404 });

  if (action === "start") {
    const updated = await prisma.affiliateTraining.update({
      where: { affiliateId },
      data: training.trainingStarted ? {} : { trainingStarted: true, trainingStartedAt: new Date() },
    });
    return NextResponse.json({ training: updated });
  }

  if (action === "complete_slide") {
    const slidesCompleted = Array.from(new Set([...training.slidesCompleted, slide])).sort();
    const updated = await prisma.affiliateTraining.update({
      where: { affiliateId },
      data: {
        slidesCompleted,
        currentSlide: Math.min(slide + 1, 4),
      },
    });
    return NextResponse.json({ training: updated });
  }

  if (action === "finish") {
    const slidesCompleted = Array.from(new Set([...training.slidesCompleted, slide])).sort();
    if (slidesCompleted.length < 4) {
      return NextResponse.json({ error: "All 4 training slides must be completed first." }, { status: 400 });
    }

    const settings = await getProgramSettings();

    const result = await prisma.$transaction(async (tx) => {
      const updatedTraining = await tx.affiliateTraining.update({
        where: { affiliateId },
        data: {
          slidesCompleted,
          trainingCompleted: true,
          trainingCompletedAt: new Date(),
          trainingVersion: settings.trainingVersion,
        },
      });

      let link = await tx.affiliateReferralLink.findFirst({ where: { affiliateId, active: true } });
      if (!link) {
        const code = await generateUniqueReferralCode();
        link = await tx.affiliateReferralLink.create({
          data: {
            affiliateId,
            code,
            url: buildReferralUrl(code),
          },
        });
      }

      const affiliate = await tx.affiliate.findUniqueOrThrow({ where: { id: affiliateId } });
      if (affiliate.status === "pending") {
        await tx.affiliate.update({ where: { id: affiliateId }, data: { status: "active" } });
      }

      return { training: updatedTraining, link };
    });

    await logAuditEvent({
      affiliateId,
      action: "training_completed",
      newValue: { trainingVersion: settings.trainingVersion, referralCode: result.link.code },
    });

    return NextResponse.json({ training: result.training, referralLink: result.link });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
