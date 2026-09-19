import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { createMarketingResource, toggleMarketingResource } from "./actions";
import { getDictionary } from "@/i18n/dictionaries";

const TYPES = ["overview", "marketing_post", "licensing_info", "social_graphic", "social_caption", "email_template", "approved_language", "faq"];

export default async function AdminMarketingPage() {
  const { dict } = getDictionary();
  const c = dict.admin.marketing;

  const resources = await prisma.affiliateMarketingResource.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>

      <Card>
        <CardHeader><CardTitle>{c.publishedTitle}</CardTitle></CardHeader>
        {resources.length === 0 ? (
          <p className="text-sm text-nmsa-gray-dark py-8 text-center">{c.empty}</p>
        ) : (
          <Table>
            <thead><tr><Th>{c.columns.title}</Th><Th>{c.columns.type}</Th><Th>{c.columns.level}</Th><Th>{c.columns.active}</Th><Th></Th></tr></thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <Td>{r.title}</Td>
                  <Td className="capitalize">{r.type.replace(/_/g, " ")}</Td>
                  <Td>{r.licenseLevel || dict.common.dash}</Td>
                  <Td><Badge status={r.active ? "active" : "suspended"} label={r.active ? dict.common.active : dict.common.inactive} /></Td>
                  <Td>
                    <form action={toggleMarketingResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs font-semibold text-nmsa-navy underline">{r.active ? c.unpublish : c.publish}</button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>{c.addTitle}</CardTitle></CardHeader>
        <form action={createMarketingResource} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledInput label={c.fields.title} name="title" required />
          <LabeledSelect label={c.fields.type} name="type" options={TYPES} dash={dict.common.dash} />
          <LabeledSelect label={c.fields.licenseLevel} name="licenseLevel" options={["", "I", "II", "III"]} dash={dict.common.dash} />
          <LabeledInput label={c.fields.ctaLabel} name="ctaLabel" placeholder={c.fields.ctaLabelPlaceholder} />
          <LabeledInput label={c.fields.headline} name="headline" className="sm:col-span-2" />
          <LabeledInput label={c.fields.subheadline} name="subheadline" className="sm:col-span-2" />
          <label className="block sm:col-span-2">
            <span className="block text-xs font-semibold text-nmsa-navy mb-1">{c.fields.bodyText}</span>
            <textarea name="bodyMarkdown" rows={4} className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <LabeledInput label={c.fields.downloadUrl} name="downloadUrl" />
          <LabeledInput
            label={c.fields.ctaUrlTemplate}
            name="ctaUrlTemplate"
            placeholder="{{appUrl}}/r/{{code}}"
            hint={c.fields.ctaUrlHint}
          />
          <div className="sm:col-span-2">
            <button className="rounded-xl bg-nmsa-navy text-white font-bold px-5 py-2.5 text-sm">{c.publishButton}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function LabeledInput({
  label,
  name,
  hint,
  className,
  ...rest
}: { label: string; name: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="block text-xs font-semibold text-nmsa-navy mb-1">{label}</span>
      <input name={name} className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...rest} />
      {hint && <span className="block text-xs text-nmsa-gray-dark mt-1">{hint}</span>}
    </label>
  );
}

function LabeledSelect({ label, name, options, dash }: { label: string; name: string; options: string[]; dash: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-nmsa-navy mb-1">{label}</span>
      <select name={name} className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{o ? o.replace(/_/g, " ") : dash}</option>
        ))}
      </select>
    </label>
  );
}
