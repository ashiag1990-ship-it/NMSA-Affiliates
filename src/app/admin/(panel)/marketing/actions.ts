"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logAuditEvent } from "@/lib/audit";

export async function createMarketingResource(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) throw new Error("Unauthorized");

  const resource = await prisma.affiliateMarketingResource.create({
    data: {
      title: String(formData.get("title")),
      type: formData.get("type") as any,
      licenseLevel: (formData.get("licenseLevel") as any) || null,
      headline: String(formData.get("headline") || "") || null,
      subheadline: String(formData.get("subheadline") || "") || null,
      bodyMarkdown: String(formData.get("bodyMarkdown") || "") || null,
      downloadUrl: String(formData.get("downloadUrl") || "") || null,
      ctaLabel: String(formData.get("ctaLabel") || "") || null,
      ctaUrlTemplate: String(formData.get("ctaUrlTemplate") || "") || null,
      active: true,
    },
  });

  await logAuditEvent({ adminId: session.user.id, action: "marketing_resource_created", newValue: { id: resource.id, title: resource.title } });
  revalidatePath("/admin/marketing");
  revalidatePath("/affiliate/marketing");
}

export async function toggleMarketingResource(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) throw new Error("Unauthorized");

  const id = String(formData.get("id"));
  const resource = await prisma.affiliateMarketingResource.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.affiliateMarketingResource.update({ where: { id }, data: { active: !resource.active } });

  await logAuditEvent({
    adminId: session.user.id,
    action: "marketing_resource_toggled",
    previousValue: { active: resource.active },
    newValue: { active: updated.active },
  });
  revalidatePath("/admin/marketing");
  revalidatePath("/affiliate/marketing");
}
