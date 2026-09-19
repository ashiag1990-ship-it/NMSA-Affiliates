import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "admin") redirect("/admin/login");

  const admin = await prisma.admin.findUnique({ where: { id: session.user.id }, select: { locale: true } });

  return (
    <AdminShell name={session.user.name} locale={admin?.locale}>
      {children}
    </AdminShell>
  );
}
