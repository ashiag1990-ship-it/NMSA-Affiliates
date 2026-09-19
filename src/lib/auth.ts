import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const authConfig: NextAuthConfig = {
  // Required by Auth.js v5 when running behind a reverse proxy (Railway
  // terminates TLS and forwards to the container) — v4 didn't need this.
  // Safe here because NEXTAUTH_URL / the deployment domain is trusted and
  // controlled by us, not user input.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/affiliate/login", error: "/affiliate/login" },
  providers: [
    CredentialsProvider({
      id: "affiliate",
      name: "Affiliate",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const affiliate = await prisma.affiliate.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!affiliate || !affiliate.passwordHash) return null;

        const valid = await bcrypt.compare(password, affiliate.passwordHash);
        if (!valid) return null;

        return {
          id: affiliate.id,
          email: affiliate.email,
          name: `${affiliate.firstName} ${affiliate.lastName}`,
          userType: "affiliate" as const,
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
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const admin = await prisma.admin.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!admin || !admin.passwordHash) return null;

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          userType: "admin" as const,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userType = (user as any).userType;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).userType = token.userType;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
