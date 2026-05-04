"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ListTree,
  Network,
  LayoutDashboard,
  HeartHandshake,
  Target,
  ClipboardList,
  Stethoscope,
  Pill,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Database,
  Search,
  UserPlus,
  Microscope,
  Workflow,
  ShieldAlert,
  CalendarClock,
  Award,
} from "lucide-react";
import {
  CARE_PLANS,
  DEFAULT_CARE_PLAN_ID,
  type CarePlan,
  type Intervention,
} from "@/lib/care-plan-data";

const fmt = new Intl.NumberFormat("en-US");
const fmt1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

const STAGE_ICONS: Record<string, typeof Search> = {
  identify: Search,
  engage: UserPlus,
  assess: Microscope,
  plan: Target,
  intervene: Workflow,
  monitor: Stethoscope,
  escalate: ShieldAlert,
  outcomes: Award,
};

const CATEGORY_COLORS: Record<Intervention["category"], string> = {
  Pharmacotherapy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Lifestyle: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Education: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Monitoring: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Care coordination": "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "Behavioral / SDOH": "bg-pink-500/10 text-pink-400 border-pink-500/30",
};

export default function CarePlanPage() {
  const [diseaseId, setDiseaseId] = useState<string>(DEFAULT_CARE_PLAN_ID);
  const plan = useMemo(
    () => CARE_PLANS.find((p) => p.id === diseaseId) ?? CARE_PLANS[0],
    [diseaseId]
  );
  const [activeStageId, setActiveStageId] = useState<string>(plan.journey[0].id);

  const enrolledPct = (plan.enrolled / plan.cohortSize) * 100;
  const activePct = (plan.activePlans / plan.enrolled) * 100;

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
              <NavLink href="/clinical" icon={ListTree} label="Elements" />
              <NavLink href="/clinical/graph" icon={Network} label="Network" />
              <NavLink href="/clinical/dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavLink href="/clinical/care-plan" icon={HeartHandshake} label="Care Plan" active />
            </nav>
          </div>
          <span className="text-xs text-muted-foreground hidden md:inline">
            ACO population health view · synthetic cohort
          </span>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Chronic disease care plan — {plan.fullName}</h1>
            <p className="text-xs text-muted-foreground max-w-3xl">
              ACO population-health template: identify the cohort, stratify risk, run the
              evidence-based intervention bundle, and report outcomes against ACO targets. Every
              section names the Marsad data elements that source it.
            </p>
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 px-2 py-1 border border-amber-500/20 bg-amber-500/5 rounded-md text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Synthetic cohort — illustrative figures
          </div>
        </div>

        {/* Disease selector */}
        <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-lg p-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
            Chronic disease
          </span>
          {CARE_PLANS.map((p) => {
            const isSel = p.id === diseaseId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setDiseaseId(p.id);
                  setActiveStageId(p.journey[0].id);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  isSel
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
              >
                {p.shortName}
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({p.icd10})
                </span>
              </button>
            );
          })}
        </div>

        {/* Cohort summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat
            icon={Users}
            label="In cohort"
            value={fmt.format(plan.cohortSize)}
            note={`ICD-10 ${plan.icd10}`}
          />
          <Stat
            icon={UserPlus}
            label="Enrolled"
            value={`${fmt1.format(enrolledPct)}%`}
            note={`${fmt.format(plan.enrolled)} patients`}
          />
          <Stat
            icon={ClipboardList}
            label="Active plans"
            value={`${fmt1.format(activePct)}%`}
            note={`${fmt.format(plan.activePlans)} of enrolled`}
          />
          <Stat
            icon={Pill}
            label="On guideline therapy"
            value={`${fmt1.format(plan.kpis[0]?.current ?? 0)}%`}
            note={plan.kpis[0]?.label}
          />
          <Stat
            icon={ShieldAlert}
            label="Very-high risk"
            value={`${(plan.riskTiers[0].share * 100).toFixed(0)}%`}
            note={`${fmt.format(Math.round(plan.cohortSize * plan.riskTiers[0].share))} patients`}
            tone="warning"
          />
          <Stat
            icon={Target}
            label="At goal (primary KPI)"
            value={`${fmt1.format(plan.kpis[0]?.current ?? 0)} / ${fmt1.format(plan.kpis[0]?.target ?? 0)}%`}
            note={`Target: ${plan.kpis[0]?.target}%`}
          />
        </div>

        {/* Risk tier bar */}
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Risk stratification
          </div>
          <div className="flex h-6 rounded-md overflow-hidden border border-border">
            {plan.riskTiers.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${t.share * 100}%`, background: t.color }}
                title={`${t.name}: ${(t.share * 100).toFixed(0)}%`}
              >
                {t.share >= 0.08 ? `${(t.share * 100).toFixed(0)}%` : ""}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {plan.riskTiers.map((t) => (
              <span key={t.name} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: t.color }}
                />
                <span className="text-muted-foreground">{t.name}</span>
                <span className="tabular-nums">
                  {fmt.format(Math.round(plan.cohortSize * t.share))}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Inclusion + risk model */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-5"
            title="Cohort inclusion criteria"
            icon={Database}
            source="OPD/ED/Inpatient.Diagnosis · Lab.Result Value · Pharmacy.NHIC Medication Code"
          >
            <ul className="space-y-1.5 text-sm">
              {plan.inclusionCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-7"
            title="Risk-stratification model"
            icon={ShieldAlert}
            source="Variable-weighted score; recomputed nightly"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 font-medium">Variable</th>
                    <th className="text-left py-1.5 font-medium">Scoring</th>
                    <th className="text-left py-1.5 font-medium">Source element</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.riskModel.map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1.5 pr-3 font-medium">{r.variable}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.weight}</td>
                      <td className="py-1.5 text-[11px] text-muted-foreground/80">
                        {r.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* SMART goals + KPIs */}
        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-6"
            title="SMART goals (template)"
            icon={Target}
            source="Co-set with patient at plan stage"
          >
            <div className="space-y-2">
              {plan.smartGoals.map((g, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-muted/40 border border-border rounded text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {g.domain}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{g.horizon}</span>
                  </div>
                  <div className="mt-0.5 font-medium">{g.goal}</div>
                  <div className="text-muted-foreground mt-0.5">
                    <span className="text-foreground">{g.metric}</span> → target{" "}
                    <span className="text-emerald-400">{g.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-6"
            title="Live KPIs vs ACO target"
            icon={Award}
            source="Recomputed nightly from Marsad domain feeds"
          >
            <div className="space-y-2.5">
              {plan.kpis.map((k, i) => {
                const better =
                  k.direction === "higher"
                    ? k.current >= k.target
                    : k.current <= k.target;
                const pct =
                  k.direction === "higher"
                    ? (k.current / k.target) * 100
                    : (k.target / Math.max(k.current, 0.0001)) * 100;
                const barPct = Math.min(100, Math.max(0, pct));
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{k.label}</span>
                      <span className="tabular-nums">
                        <span className={better ? "text-emerald-400" : "text-amber-400"}>
                          {fmt1.format(k.current)}
                          {k.unit}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}/ target {fmt1.format(k.target)}
                          {k.unit}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded mt-1 overflow-hidden">
                      <div
                        className={`h-full ${better ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Source: {k.source}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* JOURNEY */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" /> Patient journey — 8 stages
              </div>
              <div className="text-[11px] text-muted-foreground">
                Click a stage to expand. The same shell applies across all chronic-disease care
                plans.
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Stage cadence is per-stage; the loop runs continuously
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3">
            {plan.journey.map((s) => {
              const Icon = STAGE_ICONS[s.id] || ChevronRight;
              const isActive = s.id === activeStageId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStageId(s.id)}
                  className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.index}
                  </span>
                  <Icon className="h-3.5 w-3.5" />
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* All stages — render every stage; expanded styling for active */}
          <div className="space-y-3">
            {plan.journey.map((s) => {
              const Icon = STAGE_ICONS[s.id] || ChevronRight;
              const isActive = s.id === activeStageId;
              return (
                <div
                  key={s.id}
                  id={`stage-${s.id}`}
                  className={`border rounded-lg transition-colors ${
                    isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <button
                    onClick={() => setActiveStageId(s.id)}
                    className="w-full flex items-start justify-between gap-3 p-3 text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold inline-flex items-center gap-2">
                          <span className="text-muted-foreground">Stage {s.index}</span>
                          <span>{s.title}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {s.cadence}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {s.owners.join(" · ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive ? "rotate-90 text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>

                  {isActive && (
                    <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <ListBlock
                        title="Triggers"
                        icon={AlertTriangle}
                        items={s.triggers}
                      />
                      <ListBlock title="Actions" icon={CheckCircle2} items={s.actions} />
                      <ListBlock
                        title="Data sources (Marsad)"
                        icon={Database}
                        items={s.dataSources}
                        muted
                      />
                      <ListBlock
                        title="Exit criteria"
                        icon={Target}
                        items={s.exitCriteria}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Intervention bundle */}
        <Panel
          title="Evidence-based intervention bundle"
          icon={Pill}
          source="Pharmacy · OPD · Inpatient · Immunization · Patient Profile"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.interventions.map((iv, i) => (
              <div
                key={i}
                className={`border rounded-lg p-3 ${CATEGORY_COLORS[iv.category]}`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                  {iv.category}
                </div>
                <div className="text-sm font-semibold">{iv.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{iv.detail}</div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div>
                    <div className="opacity-70">Cadence</div>
                    <div>{iv.cadence}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Owner</div>
                    <div>{iv.owner}</div>
                  </div>
                </div>
                {iv.evidence && (
                  <div className="text-[10px] text-muted-foreground/80 mt-2 italic">
                    Evidence: {iv.evidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Sample patient walkthrough */}
        <Panel
          title={`Sample patient walkthrough — ${plan.samplePatient.name}`}
          icon={ClipboardList}
          source="Walkthrough is illustrative; data elements at each step shown inline"
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4 space-y-3">
              <div className="bg-muted/40 border border-border rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Patient
                </div>
                <div className="text-sm font-semibold mt-0.5">
                  {plan.samplePatient.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {plan.samplePatient.id} · {plan.samplePatient.age}y · {plan.samplePatient.sex}
                </div>
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Risk tier
                  </div>
                  <span
                    className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium border"
                    style={{
                      background:
                        plan.riskTiers.find((t) => t.name === plan.samplePatient.riskTier)?.color ??
                        "transparent",
                      color: "white",
                      borderColor: "transparent",
                    }}
                  >
                    {plan.samplePatient.riskTier}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Problem list
                  </div>
                  <ul className="mt-0.5 space-y-0.5">
                    {plan.samplePatient.problemList.map((p, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <ChevronRight className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Intake snapshot
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {plan.samplePatient.intake.map((v, i) => (
                      <div key={i}>
                        <div className="text-muted-foreground">{v.label}</div>
                        <div className="font-medium">{v.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-8">
              <ol className="relative border-l-2 border-border ml-3 space-y-3">
                {plan.samplePatient.steps.map((s, i) => {
                  const stage = plan.journey.find((j) => j.id === s.stageId);
                  const Icon = STAGE_ICONS[s.stageId] || ChevronRight;
                  return (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-primary border-2 border-background" />
                      <div className="bg-muted/40 border border-border rounded-lg p-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Icon className="h-3 w-3" /> Stage {stage?.index} · {stage?.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground">Day {s.day}</span>
                        </div>
                        <div className="text-sm mt-1">{s.what}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {s.data}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </Panel>

        <p className="text-[11px] text-muted-foreground text-center pt-2 pb-4">
          Care plan template is evidence-based but illustrative; figures are synthetic. Each
          journey stage, intervention, and KPI cites the Marsad data elements that would
          source it in production.
        </p>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof ListTree;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
        active
          ? "text-foreground bg-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`bg-card border ${
        tone === "warning" ? "border-amber-500/30" : "border-border"
      } rounded-lg p-3`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`h-3.5 w-3.5 ${tone === "warning" ? "text-amber-400" : "text-primary"}`}
        />
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {note && (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate" title={note}>
          {note}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  source,
  className,
  children,
}: {
  title: string;
  icon?: typeof Database;
  source?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className ?? ""}`}>
      <div className="mb-2">
        <div className="text-sm font-semibold inline-flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </div>
        {source && (
          <div className="text-[10px] text-muted-foreground" title={source}>
            Source: {source}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ListBlock({
  title,
  icon: Icon,
  items,
  muted = false,
}: {
  title: string;
  icon: typeof Database;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li
            key={i}
            className={`flex items-start gap-1.5 ${muted ? "text-muted-foreground" : ""}`}
          >
            <span
              className={`inline-block w-1 h-1 rounded-full mt-1.5 shrink-0 ${
                muted ? "bg-muted-foreground" : "bg-primary"
              }`}
            />
            <span className="text-xs leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Reference an unused import to keep the linter happy if not used inline.
void TrendingUp;
void TrendingDown;
