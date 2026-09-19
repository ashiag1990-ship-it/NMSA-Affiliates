import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Guards /affiliate/* (excluding the public login/signup pages) to
// authenticated affiliates, and /admin/* (excluding its login page) to
// authenticated admins. Cross-role access (an affiliate hitting /admin, or
// vice versa) is redirected rather than allowed through.
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      if (!token || token.userType !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    if (
      pathname.startsWith("/affiliate") &&
      !["/affiliate/login", "/affiliate-signup"].includes(pathname)
    ) {
      if (!token || token.userType !== "affiliate") {
        return NextResponse.redirect(new URL("/affiliate/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Always run the middleware function above ourselves; it decides
      // pass/redirect per-path so public sub-paths (login/signup) aren't
      // blocked by the default "must have any token" behavior.
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/affiliate/:path*", "/admin/:path*"],
};
