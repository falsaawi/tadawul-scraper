// Shapes returned by /api/whoop/data and /api/whoop/status, consumed by the
// WHOOP dashboard client components.

export interface WhoopDailyPoint {
  cycleId: string;
  date: string;
  strain: number | null;
  kilojoule: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  recoveryScore: number | null;
  restingHeartRate: number | null;
  hrvRmssdMilli: number | null;
  spo2Percentage: number | null;
  skinTempCelsius: number | null;
}

export interface WhoopSleepPoint {
  id: string;
  date: string;
  end: string;
  performance: number | null;
  efficiency: number | null;
  consistency: number | null;
  respiratoryRate: number | null;
  inBedMilli: number | null;
  awakeMilli: number | null;
  lightMilli: number | null;
  swMilli: number | null;
  remMilli: number | null;
  disturbances: number | null;
}

export interface WhoopWorkoutRow {
  id: string;
  sportName: string | null;
  date: string;
  end: string;
  durationMin: number;
  strain: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  kilojoule: number | null;
  distanceMeter: number | null;
}

export interface WhoopData {
  days: number;
  daily: WhoopDailyPoint[];
  sleep: WhoopSleepPoint[];
  workouts: WhoopWorkoutRow[];
}

export interface WhoopSyncSummary {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  counts: { cycles?: number; recovery?: number; sleep?: number; workouts?: number } | null;
}

export interface WhoopStatus {
  connected: boolean;
  configured: boolean;
  user?: {
    whoopUserId: number | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  scope?: string | null;
  lastSyncedAt?: string | null;
  lastSync: WhoopSyncSummary | null;
}
