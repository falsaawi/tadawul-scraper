// Pulls WHOOP data into the database. Used by both the manual sync endpoint
// (/api/whoop/sync) and the cron endpoint (/api/cron/whoop).
//
// Idempotent: every record is upserted on its natural key, so overlapping
// windows simply refresh existing rows. We also persist the full raw record in
// a `raw` JSON column for forward-compatibility.

import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  getCycles,
  getProfile,
  getRecoveries,
  getSleeps,
  getWorkouts,
  WHOOP_CONNECTION_ID,
} from "@/lib/whoop";
import type {
  WhoopCycle,
  WhoopRecovery,
  WhoopSleep,
  WhoopWorkout,
} from "@/types/whoop";

export interface WhoopSyncCounts {
  cycles: number;
  recovery: number;
  sleep: number;
  workouts: number;
}

// How far back to pull on the very first sync (no prior lastSyncedAt).
const FIRST_SYNC_DAYS = 30;
// Overlap re-pulled on incremental syncs to catch records that were rescored
// after their start time.
const OVERLAP_DAYS = 2;

function bigintOrNull(n: number | undefined): bigint | null {
  return n === undefined || n === null ? null : BigInt(Math.round(n));
}

function date(s: string | undefined): Date | null {
  return s ? new Date(s) : null;
}

async function upsertCycles(cycles: WhoopCycle[]): Promise<number> {
  for (const c of cycles) {
    const s = c.score ?? {};
    const data = {
      start: new Date(c.start),
      end: date(c.end ?? undefined),
      timezoneOffset: c.timezone_offset ?? null,
      scoreState: c.score_state ?? null,
      strain: s.strain ?? null,
      kilojoule: s.kilojoule ?? null,
      averageHeartRate: s.average_heart_rate ?? null,
      maxHeartRate: s.max_heart_rate ?? null,
      raw: c as object,
    };
    await prisma.whoopCycle.upsert({
      where: { cycleId: BigInt(c.id) },
      create: { cycleId: BigInt(c.id), ...data },
      update: data,
    });
  }
  return cycles.length;
}

async function upsertRecoveries(recoveries: WhoopRecovery[]): Promise<number> {
  for (const r of recoveries) {
    const s = r.score ?? {};
    const data = {
      sleepId: r.sleep_id ?? null,
      scoreState: r.score_state ?? null,
      userCalibrating: s.user_calibrating ?? null,
      recoveryScore: s.recovery_score ?? null,
      restingHeartRate: s.resting_heart_rate ?? null,
      hrvRmssdMilli: s.hrv_rmssd_milli ?? null,
      spo2Percentage: s.spo2_percentage ?? null,
      skinTempCelsius: s.skin_temp_celsius ?? null,
      whoopCreatedAt: date(r.created_at),
      raw: r as object,
    };
    await prisma.whoopRecovery.upsert({
      where: { cycleId: BigInt(r.cycle_id) },
      create: { cycleId: BigInt(r.cycle_id), ...data },
      update: data,
    });
  }
  return recoveries.length;
}

async function upsertSleeps(sleeps: WhoopSleep[]): Promise<number> {
  for (const sl of sleeps) {
    const score = sl.score ?? {};
    const stages = score.stage_summary ?? {};
    const data = {
      cycleId: sl.cycle_id !== undefined ? BigInt(sl.cycle_id) : null,
      start: new Date(sl.start),
      end: new Date(sl.end),
      timezoneOffset: sl.timezone_offset ?? null,
      nap: sl.nap ?? false,
      scoreState: sl.score_state ?? null,
      sleepPerformancePct: score.sleep_performance_percentage ?? null,
      sleepConsistencyPct: score.sleep_consistency_percentage ?? null,
      sleepEfficiencyPct: score.sleep_efficiency_percentage ?? null,
      respiratoryRate: score.respiratory_rate ?? null,
      totalInBedTimeMilli: bigintOrNull(stages.total_in_bed_time_milli),
      totalAwakeTimeMilli: bigintOrNull(stages.total_awake_time_milli),
      totalLightSleepTimeMilli: bigintOrNull(stages.total_light_sleep_time_milli),
      totalSwSleepTimeMilli: bigintOrNull(stages.total_slow_wave_sleep_time_milli),
      totalRemSleepTimeMilli: bigintOrNull(stages.total_rem_sleep_time_milli),
      sleepCycleCount: stages.sleep_cycle_count ?? null,
      disturbanceCount: stages.disturbance_count ?? null,
      raw: sl as object,
    };
    await prisma.whoopSleep.upsert({
      where: { id: sl.id },
      create: { id: sl.id, ...data },
      update: data,
    });
  }
  return sleeps.length;
}

async function upsertWorkouts(workouts: WhoopWorkout[]): Promise<number> {
  for (const w of workouts) {
    const s = w.score ?? {};
    const data = {
      start: new Date(w.start),
      end: new Date(w.end),
      timezoneOffset: w.timezone_offset ?? null,
      sportName: w.sport_name ?? null,
      sportId: w.sport_id ?? null,
      scoreState: w.score_state ?? null,
      strain: s.strain ?? null,
      averageHeartRate: s.average_heart_rate ?? null,
      maxHeartRate: s.max_heart_rate ?? null,
      kilojoule: s.kilojoule ?? null,
      percentRecorded: s.percent_recorded ?? null,
      distanceMeter: s.distance_meter ?? null,
      altitudeGainMeter: s.altitude_gain_meter ?? null,
      zoneDurations: (s.zone_durations as object) ?? undefined,
      raw: w as object,
    };
    await prisma.whoopWorkout.upsert({
      where: { id: w.id },
      create: { id: w.id, ...data },
      update: data,
    });
  }
  return workouts.length;
}

// Runs a full sync and records a WhoopSyncLog entry. Returns the counts pulled.
export async function runWhoopSync(
  trigger: "manual" | "cron" = "manual"
): Promise<{ logId: string; counts: WhoopSyncCounts }> {
  const conn = await prisma.whoopConnection.findUnique({
    where: { id: WHOOP_CONNECTION_ID },
  });

  const since = conn?.lastSyncedAt
    ? new Date(conn.lastSyncedAt.getTime() - OVERLAP_DAYS * 86_400_000)
    : new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000);
  const start = since.toISOString();

  const log = await prisma.whoopSyncLog.create({ data: { trigger } });

  try {
    // Refresh stored profile metadata opportunistically (best-effort).
    try {
      const profile = await getProfile();
      await prisma.whoopConnection.update({
        where: { id: WHOOP_CONNECTION_ID },
        data: {
          whoopUserId: profile.user_id ?? null,
          email: profile.email ?? null,
          firstName: profile.first_name ?? null,
          lastName: profile.last_name ?? null,
        },
      });
    } catch {
      // non-fatal — keep going with data sync
    }

    const [cycles, recoveries, sleeps, workouts] = await Promise.all([
      getCycles(start),
      getRecoveries(start),
      getSleeps(start),
      getWorkouts(start),
    ]);

    const counts: WhoopSyncCounts = {
      cycles: await upsertCycles(cycles),
      recovery: await upsertRecoveries(recoveries),
      sleep: await upsertSleeps(sleeps),
      workouts: await upsertWorkouts(workouts),
    };

    await prisma.whoopConnection.update({
      where: { id: WHOOP_CONNECTION_ID },
      data: { lastSyncedAt: new Date() },
    });
    await prisma.whoopSyncLog.update({
      where: { id: log.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        counts: counts as unknown as Prisma.InputJsonValue,
      },
    });

    return { logId: log.id, counts };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.whoopSyncLog.update({
      where: { id: log.id },
      data: { status: "failed", error: message, finishedAt: new Date() },
    });
    throw error;
  }
}
