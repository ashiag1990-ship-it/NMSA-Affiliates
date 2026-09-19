import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(amount: number | string | null | undefined): string {
  const n = amount == null ? 0 : Number(amount);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function titleCase(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function nextPayoutDate(dayOfMonth: number, from: Date = new Date()): Date {
  const year = from.getFullYear();
  const month = from.getMonth();
  const candidate = new Date(year, month, dayOfMonth);
  if (from.getDate() >= dayOfMonth) {
    return new Date(year, month + 1, dayOfMonth);
  }
  return candidate;
}
