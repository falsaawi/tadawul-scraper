"use client";

import { Heart, Moon, Zap, Activity } from "lucide-react";
import type { WhoopData } from "@/types/whoop-dashboard";

interface Props {
  data: WhoopData;
}

function lastWith<T>(arr: T[], pick: (x: T) => number | null): { value: number | null } {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = pick(arr[i]);
    if (v !== null && v !== undefined) return { value: v };
  }
  return { value: null };
}

function recoveryColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 67) return "text-green-400";
  if (score >= 34) return "text-yellow-400";
  return "text-red-400";
}

function fmt(v: number | null, digits = 0, suffix = ""): string {
  return v === null ? "—" : `${v.toFixed(digits)}${suffix}`;
}

export function WhoopSummary({ data }: Props) {
  const recovery = lastWith(data.daily, (d) => d.recoveryScore).value;
  const strain = lastWith(data.daily, (d) => d.strain).value;
  const hrv = lastWith(data.daily, (d) => d.hrvRmssdMilli).value;
  const rhr = lastWith(data.daily, (d) => d.restingHeartRate).value;
  const sleepPerf = lastWith(data.sleep, (s) => s.performance).value;

  const cards = [
    {
      label: "Recovery",
      value: fmt(recovery, 0, "%"),
      color: recoveryColor(recovery),
      icon: Activity,
      sub: recovery === null ? "" : recovery >= 67 ? "Green" : recovery >= 34 ? "Yellow" : "Red",
    },
    {
      label: "Day Strain",
      value: fmt(strain, 1),
      color: "text-blue-400",
      icon: Zap,
      sub: "0–21 scale",
    },
    {
      label: "Sleep Performance",
      value: fmt(sleepPerf, 0, "%"),
      color: "text-indigo-400",
      icon: Moon,
      sub: "last night",
    },
    {
      label: "HRV",
      value: fmt(hrv, 0, " ms"),
      color: "text-green-400",
      icon: Heart,
      sub: "rmssd",
    },
    {
      label: "Resting HR",
      value: fmt(rhr, 0, " bpm"),
      color: "text-rose-400",
      icon: Heart,
      sub: "latest",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{c.label}</span>
            </div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            {c.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}
