"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, Heart, Zap, Moon } from "lucide-react";
import type { WhoopData } from "@/types/whoop-dashboard";

interface Props {
  data: WhoopData;
}

const GRID = "hsl(215 20% 16%)";
const AXIS = "hsl(215 16% 56%)";
const TOOLTIP = {
  background: "hsl(222 47% 9%)",
  border: "1px solid hsl(215 20% 16%)",
  borderRadius: "8px",
  color: "hsl(210 40% 92%)",
  fontSize: 12,
};

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartCard({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: typeof Activity;
  color: string;
  children: React.ReactElement;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-4 w-4 ${color}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function WhoopCharts({ data }: Props) {
  const daily = data.daily.map((d) => ({
    label: dayLabel(d.date),
    recovery: d.recoveryScore,
    strain: d.strain,
    hrv: d.hrvRmssdMilli,
    rhr: d.restingHeartRate,
  }));

  const sleep = data.sleep.map((s) => ({
    label: dayLabel(s.date),
    performance: s.performance,
    Light: s.lightMilli ? +(s.lightMilli / 3_600_000).toFixed(2) : 0,
    Deep: s.swMilli ? +(s.swMilli / 3_600_000).toFixed(2) : 0,
    REM: s.remMilli ? +(s.remMilli / 3_600_000).toFixed(2) : 0,
    Awake: s.awakeMilli ? +(s.awakeMilli / 3_600_000).toFixed(2) : 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Recovery Score" icon={Activity} color="text-green-400">
        <AreaChart data={daily}>
          <defs>
            <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <Tooltip contentStyle={TOOLTIP} formatter={(v) => [`${v}%`, "Recovery"]} />
          <Area
            type="monotone"
            dataKey="recovery"
            stroke="#22c55e"
            fill="url(#recGrad)"
            strokeWidth={2}
            connectNulls
          />
        </AreaChart>
      </ChartCard>

      <ChartCard title="Day Strain" icon={Zap} color="text-blue-400">
        <BarChart data={daily}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <YAxis domain={[0, 21]} tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <Tooltip contentStyle={TOOLTIP} formatter={(v) => [Number(v).toFixed(1), "Strain"]} />
          <Bar dataKey="strain" fill="#3b82f6" opacity={0.75} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="HRV & Resting Heart Rate" icon={Heart} color="text-rose-400">
        <LineChart data={daily}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <YAxis
            yAxisId="hrv"
            tick={{ fontSize: 10, fill: AXIS }}
            stroke={GRID}
            label={{ value: "HRV ms", angle: -90, position: "insideLeft", fill: AXIS, fontSize: 10 }}
          />
          <YAxis yAxisId="rhr" orientation="right" tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="hrv"
            type="monotone"
            dataKey="hrv"
            name="HRV (ms)"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="rhr"
            type="monotone"
            dataKey="rhr"
            name="RHR (bpm)"
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Sleep Stages (hours)" icon={Moon} color="text-indigo-400">
        <BarChart data={sleep}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <YAxis tick={{ fontSize: 10, fill: AXIS }} stroke={GRID} />
          <Tooltip contentStyle={TOOLTIP} formatter={(v, n) => [`${v}h`, n]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Deep" stackId="s" fill="#4f46e5" radius={[0, 0, 0, 0]} />
          <Bar dataKey="REM" stackId="s" fill="#8b5cf6" />
          <Bar dataKey="Light" stackId="s" fill="#a5b4fc" />
          <Bar dataKey="Awake" stackId="s" fill="#475569" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
