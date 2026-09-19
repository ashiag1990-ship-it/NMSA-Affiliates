import { cn } from "@/lib/utils";
import type { TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className={cn("w-full text-sm border-collapse", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left text-xs font-semibold uppercase tracking-wide text-nmsa-gray-dark px-3 py-2.5 border-b border-gray-200 whitespace-nowrap",
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-3 py-3 border-b border-gray-100 text-nmsa-navy", className)} {...rest}>
      {children}
    </td>
  );
}
