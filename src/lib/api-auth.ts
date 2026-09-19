import { auth } from "./auth";

export async function requireAffiliateSession() {
  const session = await auth();
  if (!session || session.user.userType !== "affiliate") return null;
  return session;
}

export async function requireAdminSession() {
  const session = await auth();
  if (!session || session.user.userType !== "admin") return null;
  return session;
}
