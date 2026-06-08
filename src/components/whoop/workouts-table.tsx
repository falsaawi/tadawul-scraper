"use client";

import { Dumbbell } from "lucide-react";
import type { WhoopWorkoutRow } from "@/types/whoop-dashboard";

interface Props {
  workouts: WhoopWorkoutRow[];
}

function titleCase(s: string | null): string {
  if (!s) return "Activity";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WhoopWorkouts({ workouts }: Props) {
  if (workouts.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Dumbbell className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground">Recent Workouts</h3>
        <span className="text-xs text-muted-foreground">({workouts.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-semibold">Activity</th>
              <th className="py-2 pr-4 font-semibold">When</th>
              <th className="py-2 pr-4 font-semibold text-right">Duration</th>
              <th className="py-2 pr-4 font-semibold text-right">Strain</th>
              <th className="py-2 pr-4 font-semibold text-right">Avg HR</th>
              <th className="py-2 pr-4 font-semibold text-right">Max HR</th>
              <th className="py-2 pr-4 font-semibold text-right">Calories</th>
              <th className="py-2 font-semibold text-right">Distance</th>
            </tr>
          </thead>
          <tbody>
            {workouts.map((w) => (
              <tr key={w.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 font-medium text-foreground">{titleCase(w.sportName)}</td>
                <td className="py-2 pr-4 text-muted-foreground">{fmtDate(w.date)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{w.durationMin}m</td>
                <td className="py-2 pr-4 text-right tabular-nums text-blue-400">
                  {w.strain === null ? "—" : w.strain.toFixed(1)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{w.averageHeartRate ?? "—"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{w.maxHeartRate ?? "—"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {w.kilojoule === null ? "—" : Math.round(w.kilojoule * 0.239006)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {w.distanceMeter ? `${(w.distanceMeter / 1000).toFixed(2)} km` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
