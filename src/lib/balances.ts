import { prisma } from "./prisma";

export interface AffiliateBalances {
  cashEarned: number; // lifetime, excluding rejected/reversed
  cashPending: number; // commissions still in holding period
  cashAvailable: number; // approved commissions + awarded bonuses not yet paid
  cashPaid: number; // lifetime paid out
  availableForPayout: number; // alias of cashAvailable, used on dashboard "Next Payout" card
}

/**
 * Computes an affiliate's cash balances by summing commissions (net of any
 * manual adjustments) and monthly bonuses by status. Pending commissions
 * never count toward the payout minimum — only approved ("available for
 * payout") ones do, exactly per the program's business rules.
 *
 * Lives in its own file (rather than lib/payouts.ts) so lib/email.ts can
 * import it without creating a payouts.ts <-> email.ts circular import —
 * lib/payouts.ts re-exports it for backward compatibility.
 */
export async function getAffiliateBalances(affiliateId: string): Promise<AffiliateBalances> {
  const commissions = await prisma.affiliateCommission.findMany({
    where: { affiliateId },
    include: { adjustments: true },
  });
  const bonuses = await prisma.affiliateBonus.findMany({ where: { affiliateId } });

  const net = (amount: number, adjustments: { amount: unknown }[]) =>
    amount + adjustments.reduce((sum, a) => sum + Number(a.amount), 0);

  let cashPending = 0;
  let cashAvailable = 0;
  let cashPaid = 0;
  let cashEarned = 0;

  for (const c of commissions) {
    const amount = net(Number(c.amount), c.adjustments);
    if (c.status === "pending") {
      cashPending += amount;
      cashEarned += amount;
    } else if (c.status === "approved") {
      cashAvailable += amount;
      cashEarned += amount;
    } else if (c.status === "paid") {
      cashPaid += amount;
      cashEarned += amount;
    }
    // rejected / reversed do not count toward earned, pending, available, or paid
  }

  for (const b of bonuses) {
    const amount = Number(b.bonusAmount);
    if (b.status === "awarded") {
      cashAvailable += amount;
      cashEarned += amount;
    } else if (b.status === "paid") {
      cashPaid += amount;
      cashEarned += amount;
    } else if (b.status === "pending") {
      cashPending += amount;
      cashEarned += amount;
    }
  }

  return {
    cashEarned,
    cashPending,
    cashAvailable,
    cashPaid,
    availableForPayout: cashAvailable,
  };
}
