import { auth } from "./auth";
import type { NextRequest } from "next/server";

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

/**
 * Verifies the shared-secret header the main NMSA system (once connected)
 * must send on every call to /api/webhooks/nmsa/*. This is intentionally a
 * simple shared secret rather than session auth — these endpoints are
 * called server-to-server, not from a logged-in browser.
 */
export function verifyNmsaWebhookSecret(req: NextRequest): boolean {
  const provided = req.headers.get("x-nmsa-webhook-secret");
  const expected = process.env.NMSA_WEBHOOK_SECRET;
  if (!expected) return false;
  return provided === expected;
}
