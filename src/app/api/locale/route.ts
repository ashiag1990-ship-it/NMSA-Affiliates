import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const locale = body?.locale;

  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const session = await auth();
  if (session?.user?.id) {
    if (session.user.userType === "affiliate") {
      await prisma.affiliate.update({ where: { id: session.user.id }, data: { locale } }).catch(() => {});
    } else if (session.user.userType === "admin") {
      await prisma.admin.update({ where: { id: session.user.id }, data: { locale } }).catch(() => {});
    }
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
