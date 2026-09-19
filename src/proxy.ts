import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.user.userType !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (pathname.startsWith("/affiliate") && !["/affiliate/login", "/affiliate-signup"].includes(pathname)) {
    if (!session || session.user.userType !== "affiliate") {
      return NextResponse.redirect(new URL("/affiliate/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/affiliate/:path*", "/admin/:path*"],
};
