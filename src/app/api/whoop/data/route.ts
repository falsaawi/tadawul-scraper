import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns stored WHOOP data for the dashboard. `days` (default 30, max 365)
// bounds the window. BigInt columns are converted to numbers for JSON.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30"), 1), 365);
  const since = new Date(Date.now() - days * 86_400_000);

  const [cycles, recoveries, sleeps, workouts] = await Promise.all([
    prisma.whoopCycle.findMany({ where: { start: { gte: since } }, orderBy: { start: "asc" } }),
    prisma.whoopRecovery.findMany({ orderBy: { whoopCreatedAt: "asc" } }),
    prisma.whoopSleep.findMany({
      where: { start: { gte: since }, nap: false },
      orderBy: { start: "asc" },
    }),
    prisma.whoopWorkout.findMany({
      where: { start: { gte: since } },
      orderBy: { start: "desc" },
    }),
  ]);

  // Map recovery onto its cycle so the dashboard can plot recovery by day.
  const recoveryByCycle = new Map(recoveries.map((r) => [r.cycleId.toString(), r]));

  const ms = (v: bigint | null) => (v === null ? null : Number(v));

  const dailyTimeline = cycles.map((c) => {
    const rec = recoveryByCycle.get(c.cycleId.toString());
    return {
      cycleId: c.cycleId.toString(),
      date: c.start.toISOString(),
      strain: c.strain,
      kilojoule: c.kilojoule,
      averageHeartRate: c.averageHeartRate,
      maxHeartRate: c.maxHeartRate,
      recoveryScore: rec?.recoveryScore ?? null,
      restingHeartRate: rec?.restingHeartRate ?? null,
      hrvRmssdMilli: rec?.hrvRmssdMilli ?? null,
      spo2Percentage: rec?.spo2Percentage ?? null,
      skinTempCelsius: rec?.skinTempCelsius ?? null,
    };
  });

  const sleepSeries = sleeps.map((s) => ({
    id: s.id,
    date: s.start.toISOString(),
    end: s.end.toISOString(),
    performance: s.sleepPerformancePct,
    efficiency: s.sleepEfficiencyPct,
    consistency: s.sleepConsistencyPct,
    respiratoryRate: s.respiratoryRate,
    inBedMilli: ms(s.totalInBedTimeMilli),
    awakeMilli: ms(s.totalAwakeTimeMilli),
    lightMilli: ms(s.totalLightSleepTimeMilli),
    swMilli: ms(s.totalSwSleepTimeMilli),
    remMilli: ms(s.totalRemSleepTimeMilli),
    disturbances: s.disturbanceCount,
  }));

  const workoutList = workouts.map((w) => ({
    id: w.id,
    sportName: w.sportName,
    date: w.start.toISOString(),
    end: w.end.toISOString(),
    durationMin: Math.round((w.end.getTime() - w.start.getTime()) / 60000),
    strain: w.strain,
    averageHeartRate: w.averageHeartRate,
    maxHeartRate: w.maxHeartRate,
    kilojoule: w.kilojoule,
    distanceMeter: w.distanceMeter,
  }));

  return NextResponse.json({
    days,
    daily: dailyTimeline,
    sleep: sleepSeries,
    workouts: workoutList,
  });
}
