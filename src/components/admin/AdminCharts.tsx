"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslation } from "@/i18n/context";

const NAVY = "#120670";
const GOLD = "#FFDE00";
const PALETTE = ["#120670", "#FFDE00", "#6B7280"];

type MonthSeries = { month: string; value: number }[];

export function AdminCharts({
  referralGrowth,
  commissionGrowth,
  affiliateGrowth,
  monthlyPayouts,
  affiliateTypeDistribution,
}: {
  referralGrowth: MonthSeries;
  commissionGrowth: MonthSeries;
  affiliateGrowth: MonthSeries;
  monthlyPayouts: MonthSeries;
  affiliateTypeDistribution: { key: "educator" | "practitioner" | "general"; value: number }[];
}) {
  const { dict } = useTranslation();
  const c = dict.admin.overview.charts;

  const typeDistribution = affiliateTypeDistribution.map((d) => ({
    name: dict.statuses[d.key],
    value: d.value,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title={c.referralGrowth}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={referralGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" name={c.referrals} stroke={NAVY} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={c.commissionGrowth}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={commissionGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
            <Bar dataKey="value" name={c.commissions} fill={NAVY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={c.affiliateGrowth}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={affiliateGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" name={c.newAffiliates} stroke={NAVY} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={c.monthlyPayouts}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyPayouts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
            <Bar dataKey="value" name={c.paidOut} fill={NAVY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={c.affiliateTypeDistribution} className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {typeDistribution.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}
