import { AffiliateStatus, AffiliateType, AdminRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// Two distinct account kinds share one NextAuth instance, distinguished by
// `userType`. Admin sessions never carry affiliate fields and vice versa —
// route guards in middleware.ts and each route handler check `userType`
// before trusting anything else on the session.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userType: "affiliate" | "admin";
      email: string;
      name: string;
      // affiliate-only
      affiliateType?: AffiliateType;
      status?: AffiliateStatus;
      // admin-only
      role?: AdminRole;
    };
  }

  interface User {
    id: string;
    userType: "affiliate" | "admin";
    email: string;
    name: string;
    affiliateType?: AffiliateType;
    status?: AffiliateStatus;
    role?: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: "affiliate" | "admin";
    affiliateType?: AffiliateType;
    status?: AffiliateStatus;
    role?: AdminRole;
  }
}
