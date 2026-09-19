import { prisma } from "@/lib/prisma";
import { getProgramSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/i18n/dictionaries";
import {
  updateProgramSettings,
  createCommissionRule,
  toggleCommissionRule,
  createTier,
  updateTierThreshold,
  createBonusRule,
  toggleBonusRule,
  updateEducatorCreditRate,
} from "./actions";

export default async function AdminSettingsPage() {
  const { dict } = getDictionary();
  const c = dict.admin.settings;

  const [settings, rules, tiers, bonusRules, educatorRates] = await Promise.all([
    getProgramSettings(),
    prisma.commissionRule.findMany({ orderBy: { priority: "desc" } }),
    prisma.affiliateTier.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.affiliateBonusRule.findMany({ orderBy: { thresholdCount: "asc" } }),
    prisma.educatorCreditRate.findMany(),
  ]);

  const rateFor = (level: string, term: string) =>
    educatorRates.find((r) => r.licenseLevel === level && r.termType === term);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-nmsa-navy">{c.title}</h1>

      <Card>
        <CardHeader><CardTitle>{c.payoutCommissionTitle}</CardTitle></CardHeader>
        <form action={updateProgramSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LabeledInput label={c.payoutMinimum} name="payoutMinimum" type="number" step="0.01" defaultValue={settings.payoutMinimum.toString()} />
          <LabeledInput label={c.payoutDay} name="payoutDayOfMonth" type="number" min={1} max={28} defaultValue={String(settings.payoutDayOfMonth)} />
          <LabeledInput label={c.holdingPeriod} name="commissionHoldingDays" type="number" defaultValue={String(settings.commissionHoldingDays)} />
          <LabeledInput label={c.trainingVersion} name="trainingVersion" defaultValue={settings.trainingVersion} />
          <LabeledInput label={c.termsVersion} name="affiliateTermsVersion" defaultValue={settings.affiliateTermsVersion} />
          <div className="flex items-end">
            <button className="rounded-xl bg-nmsa-gold text-nmsa-navy font-bold px-5 py-2.5 text-sm">{c.saveSettings}</button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>{c.commissionRulesTitle}</CardTitle></CardHeader>
        <Table>
          <thead>
            <tr><Th>{c.columns.name}</Th><Th>{c.columns.type}</Th><Th>{c.columns.scope}</Th><Th>{c.columns.amount}</Th><Th>{c.columns.priority}</Th><Th>{c.columns.active}</Th><Th></Th></tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <Td>{r.name}</Td>
                <Td className="capitalize">{r.type.replace(/_/g, " ")}</Td>
                <Td className="text-xs">
                  {r.affiliateType || c.anyType} / {r.licenseLevel ? `Level ${r.licenseLevel}` : c.anyLevel} / {r.termType || c.anyTerm}
                </Td>
                <Td>{r.fixedAmount ? formatMoney(r.fixedAmount as unknown as number) : r.percentage ? `${r.percentage}%` : dict.common.dash}</Td>
                <Td>{r.priority}</Td>
                <Td><Badge status={r.active ? "active" : "suspended"} label={r.active ? dict.common.active : dict.common.inactive} /></Td>
                <Td>
                  <form action={toggleCommissionRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs font-semibold text-nmsa-navy underline">{r.active ? dict.common.disable : dict.common.enable}</button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <details className="mt-5">
          <summary className="text-sm font-semibold text-nmsa-navy cursor-pointer">{c.addRule}</summary>
          <form action={createCommissionRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <LabeledInput label={c.fields.name} name="name" required />
            <LabeledSelect label={c.fields.type} name="type" options={["fixed", "percentage", "license_specific", "annual", "biennial", "tier", "bonus"]} dash={dict.common.dash} />
            <LabeledSelect label={c.fields.affiliateType} name="affiliateType" options={["", "educator", "practitioner", "general"]} dash={dict.common.dash} />
            <LabeledSelect label={c.fields.licenseLevel} name="licenseLevel" options={["", "I", "II", "III"]} dash={dict.common.dash} />
            <LabeledSelect label={c.fields.termType} name="termType" options={["", "annual", "biennial"]} dash={dict.common.dash} />
            <LabeledInput label={c.fields.fixedAmount} name="fixedAmount" type="number" step="0.01" />
            <LabeledInput label={c.fields.percentage} name="percentage" type="number" step="0.01" />
            <LabeledInput label={c.fields.priority} name="priority" type="number" defaultValue="0" />
            <div className="flex items-end">
              <button className="rounded-xl bg-nmsa-navy text-white font-bold px-5 py-2.5 text-sm">{c.addRuleButton}</button>
            </div>
          </form>
        </details>
      </Card>

      <Card>
        <CardHeader><CardTitle>{c.tiersTitle}</CardTitle></CardHeader>
        <Table>
          <thead><tr><Th>{c.tierFields.name}</Th><Th>{c.thresholdsColumn}</Th></tr></thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}>
                <Td className="font-semibold">{t.name}</Td>
                <Td>
                  <form action={updateTierThreshold} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <input type="number" name="minCompletedReferrals" defaultValue={t.minCompletedReferrals} className="focus-ring w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
                    <span className="text-xs text-nmsa-gray-dark">{c.to}</span>
                    <input type="number" name="maxCompletedReferrals" defaultValue={t.maxCompletedReferrals ?? undefined} placeholder="∞" className="focus-ring w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
                    <button className="text-xs font-semibold text-nmsa-navy underline">{dict.common.save}</button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <details className="mt-5">
          <summary className="text-sm font-semibold text-nmsa-navy cursor-pointer">{c.addTier}</summary>
          <form action={createTier} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
            <LabeledInput label={c.tierFields.name} name="name" required />
            <LabeledInput label={c.tierFields.min} name="minCompletedReferrals" type="number" required />
            <LabeledInput label={c.tierFields.max} name="maxCompletedReferrals" type="number" />
            <LabeledInput label={c.tierFields.sortOrder} name="sortOrder" type="number" defaultValue="0" />
            <div className="flex items-end">
              <button className="rounded-xl bg-nmsa-navy text-white font-bold px-5 py-2.5 text-sm">{c.addTierButton}</button>
            </div>
          </form>
        </details>
      </Card>

      <Card>
        <CardHeader><CardTitle>{c.bonusesTitle}</CardTitle></CardHeader>
        <Table>
          <thead><tr><Th>{c.bonusColumns.name}</Th><Th>{c.bonusColumns.threshold}</Th><Th>{c.bonusColumns.bonus}</Th><Th>{c.bonusColumns.active}</Th><Th></Th></tr></thead>
          <tbody>
            {bonusRules.map((b) => (
              <tr key={b.id}>
                <Td>{b.name}</Td>
                <Td>{b.thresholdCount} {c.referralsPerMonth}</Td>
                <Td>{formatMoney(b.bonusAmount as unknown as number)}</Td>
                <Td><Badge status={b.active ? "active" : "suspended"} label={b.active ? dict.common.active : dict.common.inactive} /></Td>
                <Td>
                  <form action={toggleBonusRule}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-xs font-semibold text-nmsa-navy underline">{b.active ? dict.common.disable : dict.common.enable}</button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <details className="mt-5">
          <summary className="text-sm font-semibold text-nmsa-navy cursor-pointer">{c.addBonusRule}</summary>
          <form action={createBonusRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <LabeledInput label={c.bonusFields.name} name="name" required />
            <LabeledInput label={c.bonusFields.threshold} name="thresholdCount" type="number" required />
            <LabeledInput label={c.bonusFields.amount} name="bonusAmount" type="number" step="0.01" required />
            <div className="flex items-end">
              <button className="rounded-xl bg-nmsa-navy text-white font-bold px-5 py-2.5 text-sm">{c.addBonusButton}</button>
            </div>
          </form>
        </details>
      </Card>

      <Card>
        <CardHeader><CardTitle>{c.educatorRatesTitle}</CardTitle></CardHeader>
        <p className="text-xs text-nmsa-gray-dark mb-4">{c.educatorRatesIntro}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["I", "II", "III"] as const).flatMap((level) =>
            (["annual", "biennial"] as const).map((term) => {
              const rate = rateFor(level, term);
              return (
                <form key={`${level}-${term}`} action={updateEducatorCreditRate} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                  <input type="hidden" name="licenseLevel" value={level} />
                  <input type="hidden" name="termType" value={term} />
                  <span className="text-xs font-semibold text-nmsa-navy w-28">Level {level} · {term}</span>
                  <span className="text-xs text-nmsa-gray-dark">$</span>
                  <input type="number" step="0.01" name="creditAmount" defaultValue={rate ? Number(rate.creditAmount) : ""} className="focus-ring w-24 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
                  <button className="text-xs font-semibold text-nmsa-navy underline">{dict.common.save}</button>
                </form>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function LabeledInput({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-nmsa-navy mb-1">{label}</span>
      <input name={name} className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...rest} />
    </label>
  );
}

function LabeledSelect({ label, name, options, dash }: { label: string; name: string; options: string[]; dash: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-nmsa-navy mb-1">{label}</span>
      <select name={name} className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>
            {o || dash}
          </option>
        ))}
      </select>
    </label>
  );
}
