function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function lastNMonths(n: number): { start: Date; end: Date; label: string }[] {
  const months: { start: Date; end: Date; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({ start, end, label: monthLabel(start) });
  }
  return months;
}

/** Buckets a list of { date, amount? } records into monthly counts (or summed amounts) for the last N months. */
export function bucketByMonth(
  records: { date: Date }[],
  months = 6
): { month: string; value: number }[] {
  const buckets = lastNMonths(months);
  return buckets.map(({ start, end, label }) => ({
    month: label,
    value: records.filter((r) => r.date >= start && r.date < end).length,
  }));
}

export function bucketSumByMonth(
  records: { date: Date; amount: number }[],
  months = 6
): { month: string; value: number }[] {
  const buckets = lastNMonths(months);
  return buckets.map(({ start, end, label }) => ({
    month: label,
    value: Math.round(records.filter((r) => r.date >= start && r.date < end).reduce((s, r) => s + r.amount, 0) * 100) / 100,
  }));
}
