import { Card } from "./Card";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "gold" | "navy";
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-nmsa-gray-dark">{label}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-extrabold",
          accent === "gold" ? "text-nmsa-navy" : "text-nmsa-navy"
        )}
      >
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-nmsa-gray-dark">{sublabel}</div>}
    </Card>
  );
}
