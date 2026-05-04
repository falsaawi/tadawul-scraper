"use client";

import Link from "next/link";
import {
  Activity,
  ListTree,
  Network,
  LayoutDashboard,
  Users,
  Ambulance,
  BedDouble,
  Clock,
  HeartPulse,
  Skull,
  Syringe,
  Pill,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  dailyEncounters,
  triageDistribution,
  topDiagnoses,
  specialtyWorkload,
  dischargeDisposition,
  hajjMix,
  bedOccupancy,
  orderVolumes,
  vitalAlerts,
  birthOutcomes,
  placeOfDeath,
  kpis,
} from "@/lib/marsad-demo-data";

const fmt = new Intl.NumberFormat("en-US");
const fmt1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
function fmtK(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return fmt.format(Math.round(v));
}

const encounters30 = dailyEncounters(30);

export default function ClinicalDashboard() {
  const totalTriage = triageDistribution.reduce((n, t) => n + t.count, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Activity className="h-5 w-5 text-primary" />
              <span>Marsad Schema Explorer</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/clinical"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <ListTree className="h-4 w-4" />
                Elements
              </Link>
              <Link
                href="/clinical/graph"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <Network className="h-4 w-4" />
                Network
              </Link>
              <Link
                href="/clinical/dashboard"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-foreground bg-accent inline-flex items-center gap-1.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/clinical/care-plan"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <HeartHandshake className="h-4 w-4" />
                Care Plan
              </Link>
            </nav>
          </div>
          <span className="text-xs text-muted-foreground hidden md:inline">
            Suggested executive view · synthetic data
          </span>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">National Health Observatory — Executive View</h1>
            <p className="text-xs text-muted-foreground">
              KPIs and charts derived from the Marsad Integration Data Dictionary v4.4. Each panel
              cites the data elements that would feed it in production.
            </p>
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 px-2 py-1 border border-amber-500/20 bg-amber-500/5 rounded-md text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Demo dataset — figures are synthetic
          </div>
        </div>

        {/* KPI ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi
            icon={Users}
            label="Encounters (24h)"
            value={fmtK(kpis.totalEncountersToday)}
            change={kpis.totalEncountersChange}
            source="OPD + ED + Inpatient · Patient Visit Date Time"
          />
          <Kpi
            icon={Ambulance}
            label="ED Visits (24h)"
            value={fmtK(kpis.edVisitsToday)}
            change={kpis.edVisitsChange}
            source="Emergency.Patient Visit Date Time"
          />
          <Kpi
            icon={BedDouble}
            label="Bed Occupancy"
            value={`${fmt1.format(kpis.bedOccupancyPct)}%`}
            source="Bed Management.Bed Status"
          />
          <Kpi
            icon={Clock}
            label="Avg Length of Stay"
            value={`${fmt1.format(kpis.avgLengthOfStayDays)} d`}
            source="Inpatient.Admission → Discharge Date Time"
          />
          <Kpi
            icon={Skull}
            label="Mortality / 1,000"
            value={fmt1.format(kpis.mortalityPer1000)}
            source="Inpatient.Discharge Disposition · Death.Death Date Time"
          />
          <Kpi
            icon={HeartPulse}
            label="Critical Vital Alerts"
            value={fmtK(kpis.criticalVitalAlerts)}
            source="Vitals (BP, HR, SpO₂, Temp, RR, Pain)"
            tone="warning"
          />
        </div>

        {/* CHARTS ROW 1 */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-8"
            title="Daily encounter volume — last 30 days"
            source="OPD · Emergency · Inpatient — Patient Visit Date Time / Admission Date Time"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={encounters30} margin={{ top: 6, left: -10, right: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="grOpd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 50%)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(142 76% 50%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="grEd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(20 90% 55%)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="hsl(20 90% 55%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="grInp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199 80% 55%)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="hsl(199 80% 55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 18%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(215 16% 56%)", fontSize: 10 }}
                  tickFormatter={(s) => s.slice(5)}
                  stroke="hsl(215 20% 25%)"
                />
                <YAxis
                  tick={{ fill: "hsl(215 16% 56%)", fontSize: 10 }}
                  stroke="hsl(215 20% 25%)"
                  tickFormatter={(v) => fmtK(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 9%)",
                    border: "1px solid hsl(215 20% 18%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(210 40% 92%)" }}
                  formatter={(v) => fmt.format(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="opd"
                  name="OPD"
                  stroke="hsl(142 76% 50%)"
                  fill="url(#grOpd)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="ed"
                  name="ED"
                  stroke="hsl(20 90% 55%)"
                  fill="url(#grEd)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="inpatient"
                  name="Inpatient"
                  stroke="hsl(199 80% 55%)"
                  fill="url(#grInp)"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-4"
            title="ED triage mix"
            source="Emergency.Triage Level · Triage Date Time"
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={triageDistribution}
                  dataKey="count"
                  nameKey="level"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={1}
                  stroke="hsl(222 47% 9%)"
                >
                  {triageDistribution.map((d) => (
                    <Cell key={d.code} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 9%)",
                    border: "1px solid hsl(215 20% 18%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmt.format(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 grid grid-cols-1 gap-1 text-xs">
              {triageDistribution.map((t) => (
                <li key={t.code} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: t.color }}
                    />
                    L{t.code} · {t.level}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {fmt.format(t.count)} ·{" "}
                    {((t.count / totalTriage) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-6"
            title="Top 10 principal diagnoses"
            source="OPD/ED/Inpatient.Principal Diagnosis (ICD-10 AM)"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topDiagnoses}
                layout="vertical"
                margin={{ top: 4, left: 8, right: 24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 18%)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(215 16% 56%)", fontSize: 10 }}
                  stroke="hsl(215 20% 25%)"
                  tickFormatter={(v) => fmtK(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "hsl(210 40% 85%)", fontSize: 11 }}
                  stroke="hsl(215 20% 25%)"
                  width={170}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 9%)",
                    border: "1px solid hsl(215 20% 18%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v, _n, p) => [
                    fmt.format(Number(v)),
                    `${p.payload.code} · ${p.payload.name}`,
                  ]}
                />
                <Bar dataKey="count" fill="hsl(142 76% 45%)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-6"
            title="Specialty workload"
            source="OPD.Specialty · Inpatient.Specialty (NHIC code list)"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={specialtyWorkload}
                margin={{ top: 4, left: -8, right: 8, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 18%)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(210 40% 75%)", fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                  stroke="hsl(215 20% 25%)"
                />
                <YAxis
                  tick={{ fill: "hsl(215 16% 56%)", fontSize: 10 }}
                  stroke="hsl(215 20% 25%)"
                  tickFormatter={(v) => fmtK(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 9%)",
                    border: "1px solid hsl(215 20% 18%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmt.format(Number(v))}
                />
                <Bar dataKey="count" fill="hsl(199 80% 55%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* CHARTS ROW 3 */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 md:col-span-6 lg:col-span-4"
            title="Bed occupancy by ward"
            source="Bed Management.Ward · Bed Status"
          >
            <ul className="space-y-2.5">
              {bedOccupancy.map((b) => {
                const pct = (b.occupied / b.capacity) * 100;
                const tone =
                  pct >= 90
                    ? "bg-red-500"
                    : pct >= 80
                      ? "bg-orange-500"
                      : pct >= 65
                        ? "bg-emerald-500"
                        : "bg-blue-500";
                return (
                  <li key={b.ward}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{b.ward}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {fmt.format(b.occupied)} / {fmt.format(b.capacity)} ·{" "}
                        <span
                          className={
                            pct >= 90
                              ? "text-red-400"
                              : pct >= 80
                                ? "text-orange-400"
                                : "text-emerald-400"
                          }
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            className="col-span-12 md:col-span-6 lg:col-span-4"
            title="Critical vital sign alerts (24h)"
            source="OPD/ED/Inpatient/Admission Assessment vitals"
          >
            <ul className="space-y-2 text-sm">
              {vitalAlerts.map((v) => (
                <li
                  key={v.name}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/40 border border-border rounded"
                >
                  <div className="min-w-0">
                    <div className="truncate">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{v.source}</div>
                  </div>
                  <span className="text-amber-400 font-semibold tabular-nums">
                    {fmt.format(v.count)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-4"
            title="Discharge disposition"
            source="Inpatient.Discharge Disposition (SeHE)"
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={dischargeDisposition}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={1}
                  stroke="hsl(222 47% 9%)"
                >
                  {dischargeDisposition.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 9%)",
                    border: "1px solid hsl(215 20% 18%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmt.format(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="text-xs space-y-1 mt-1">
              {dischargeDisposition.map((d) => (
                <li key={d.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{fmt.format(d.count)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* CHARTS ROW 4 — order volumes & Hajj mix */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-8"
            title="Order volumes (last 14 days)"
            source="Lab Order ID · Rad Order ID · Prescription Order ID · Surgery Order ID"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {orderVolumes.map((o) => (
                <div key={o.name} className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    {o.name === "Lab orders" && <Pill className="h-3 w-3" />}
                    {o.name === "Prescriptions" && <Pill className="h-3 w-3" />}
                    {o.name}
                  </div>
                  <div className="text-xl font-semibold tabular-nums mt-0.5">
                    {fmtK(o.total)}
                  </div>
                  <ResponsiveContainer width="100%" height={50}>
                    <LineChart data={o.spark}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(142 76% 50%)"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="text-[10px] text-muted-foreground truncate" title={o.source}>
                    {o.source}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-4"
            title="Hajj / Non-Hajj patient mix"
            source="Patient Profile.Hajj/Non-Hajj Patient"
          >
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={hajjMix}
                  dataKey="count"
                  nameKey="name"
                  outerRadius={85}
                  paddingAngle={1}
                  stroke="hsl(222 47% 9%)"
                >
                  {hajjMix.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 9%)",
                    border: "1px solid hsl(215 20% 18%)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmt.format(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="text-xs space-y-1 mt-1">
              {hajjMix.map((d) => (
                <li key={d.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{fmt.format(d.count)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* CHARTS ROW 5 — secondary indicators */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 md:col-span-4"
            title="Childbirth outcomes"
            source="Childbirth.Birth Outcome"
          >
            <ul className="space-y-2 text-sm">
              {birthOutcomes.map((b) => (
                <li
                  key={b.name}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 border border-border rounded"
                  style={{ background: `${b.color.replace(")", " / 0.08)")}` }}
                >
                  <span>{b.name}</span>
                  <span className="font-semibold tabular-nums">{fmt.format(b.count)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            className="col-span-12 md:col-span-4"
            title="Place of death"
            source="Death.Place of Death"
          >
            <ul className="space-y-2 text-sm">
              {placeOfDeath.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/40 border border-border rounded"
                >
                  <span>{p.name}</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {fmt.format(p.count)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            className="col-span-12 md:col-span-4"
            title="Programme indicators"
            source="Immunization · Pharmacy · Data masking compliance"
          >
            <div className="space-y-3">
              <ProgrammeStat
                icon={Syringe}
                label="Immunizations administered"
                value={fmtK(kpis.immunizationsAdministered)}
                source="Immunization.Administered Date Time"
              />
              <ProgrammeStat
                icon={Pill}
                label="Pharmacy substitution rate"
                value={`${fmt1.format(kpis.pharmacySubstitutionRate)}%`}
                source="Pharmacy.Was Substituted Flag"
              />
              <ProgrammeStat
                icon={ShieldCheck}
                label="PII / PHI masking coverage"
                value={`${fmt1.format(kpis.consentedDataMaskingCoverage)}%`}
                source="Element Classification (Confidential / Secret / Top Secret)"
              />
            </div>
          </Panel>
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          All figures are synthetic and generated deterministically for demonstration only. Each
          panel cites the dictionary elements that would source it in production.
        </p>
      </main>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  change,
  source,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  change?: number;
  source: string;
  tone?: "default" | "warning";
}) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div
      className={`bg-card border ${
        tone === "warning" ? "border-amber-500/30" : "border-border"
      } rounded-lg p-3`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${tone === "warning" ? "text-amber-400" : "text-primary"}`} />
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {change !== undefined && (
        <div
          className={`text-[11px] mt-0.5 inline-flex items-center gap-0.5 ${
            isUp ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? "+" : ""}
          {change.toFixed(1)}% vs yesterday
        </div>
      )}
      <div className="text-[10px] text-muted-foreground mt-1.5 truncate" title={source}>
        {source}
      </div>
    </div>
  );
}

function Panel({
  title,
  source,
  className,
  children,
}: {
  title: string;
  source: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className ?? ""}`}>
      <div className="mb-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[10px] text-muted-foreground" title={source}>
          Source: {source}
        </div>
      </div>
      {children}
    </div>
  );
}

function ProgrammeStat({
  icon: Icon,
  label,
  value,
  source,
}: {
  icon: typeof Syringe;
  label: string;
  value: string;
  source: string;
}) {
  return (
    <div className="px-2 py-1.5 bg-muted/40 border border-border rounded">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
        </span>
        <span className="font-semibold tabular-nums text-sm">{value}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{source}</div>
    </div>
  );
}
