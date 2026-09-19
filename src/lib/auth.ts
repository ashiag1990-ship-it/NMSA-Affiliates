import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

/**
 * Single NextAuth instance serving two distinct account kinds — affiliates
 * (the portal at /affiliate) and admins (the panel at /admin). Each has its
 * own credentials provider (separate id) so the sign-in forms stay simple
 * and a compromised affiliate login can never resolve to an admin account.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/affiliate/login",
    error: "/affiliate/login",
  },
  providers: [
    CredentialsProvider({
      id: "affiliate",
      name: "Affiliate",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const affiliate = await prisma.affiliate.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!affiliate) return null;
        const valid = await verifyPassword(credentials.password, affiliate.passwordHash);
        if (!valid) return null;
        if (affiliate.status === "suspended") {
          throw new Error("Your affiliate account has been suspended. Contact NMSA support.");
        }
        return {
          id: affiliate.id,
          userType: "affiliate",
          email: affiliate.email,
          name: `${affiliate.firstName} ${affiliate.lastName}`,
          affiliateType: affiliate.affiliateType,
          status: affiliate.status,
        };
      },
    }),
    CredentialsProvider({
      id: "admin",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!admin) return null;
        const valid = await verifyPassword(credentials.password, admin.passwordHash);
        if (!valid) return null;
        return {
          id: admin.id,
          userType: "admin",
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userType = user.userType;
        token.affiliateType = user.affiliateType;
        token.status = user.status;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.userType = token.userType;
      session.user.affiliateType = token.affiliateType;
      session.user.status = token.status;
      session.user.role = token.role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
