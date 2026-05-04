/**
 * Synthetic clinical operations data, anchored on the Marsad data dictionary's
 * code sets and field definitions. Used to power the suggested executive
 * dashboard. Numbers are deterministic (seeded) so the dashboard doesn't
 * shimmer between renders.
 *
 * NOT real patient data. Each chart in the dashboard cites the dictionary
 * elements it would be derived from in production.
 */

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

const rnd = seeded(42);

function jitter(base: number, amplitude: number) {
  return Math.round(base + (rnd() - 0.5) * 2 * amplitude);
}

function todayMinus(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export interface EncounterDayPoint {
  date: string;
  opd: number;
  ed: number;
  inpatient: number;
}

/** 30-day daily encounter volumes by encounter type. */
export function dailyEncounters(days = 30): EncounterDayPoint[] {
  const pts: EncounterDayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = todayMinus(i);
    const dow = date.getUTCDay(); // 0 Sun ... 6 Sat in UTC
    // Riyadh weekend = Fri (5) / Sat (6). Lower OPD on weekend, ED roughly flat.
    const weekendFactor = dow === 5 || dow === 6 ? 0.45 : 1;
    pts.push({
      date: date.toISOString().slice(0, 10),
      opd: jitter(245_000 * weekendFactor, 18_000),
      ed: jitter(38_000, 4_500),
      inpatient: jitter(11_500 * (weekendFactor < 1 ? 0.85 : 1), 1_400),
    });
  }
  return pts;
}

/** ED triage level distribution (Triage Level code set in dictionary). */
export const triageDistribution = [
  { code: 1, level: "Resuscitation", count: 460, color: "hsl(0 72% 51%)" },
  { code: 2, level: "Emergency", count: 3_240, color: "hsl(20 90% 55%)" },
  { code: 3, level: "Urgent", count: 11_780, color: "hsl(38 92% 50%)" },
  { code: 4, level: "Less urgent", count: 14_950, color: "hsl(142 60% 45%)" },
  { code: 5, level: "Non-urgent", count: 7_640, color: "hsl(199 70% 50%)" },
];

/** Top principal diagnoses (ICD-10 AM, weighted by KSA OPD prevalence). */
export const topDiagnoses = [
  { code: "I10", name: "Essential hypertension", count: 18_420 },
  { code: "E11", name: "Type 2 diabetes mellitus", count: 16_900 },
  { code: "J06.9", name: "Acute upper resp. infection", count: 14_350 },
  { code: "K30", name: "Functional dyspepsia", count: 9_720 },
  { code: "M54.5", name: "Low back pain", count: 8_560 },
  { code: "J45", name: "Asthma", count: 7_440 },
  { code: "N39.0", name: "Urinary tract infection", count: 6_980 },
  { code: "E78.5", name: "Hyperlipidaemia", count: 6_410 },
  { code: "R51", name: "Headache", count: 5_900 },
  { code: "K59.0", name: "Constipation", count: 4_870 },
];

/** Specialty workload (NHIC Specialty list, top 10 by encounter volume). */
export const specialtyWorkload = [
  { name: "Family Medicine", count: 78_400 },
  { name: "Internal Medicine", count: 42_300 },
  { name: "Paediatrics", count: 31_500 },
  { name: "Obstetrics & Gynaecology", count: 24_700 },
  { name: "Emergency Medicine", count: 22_400 },
  { name: "General Surgery", count: 14_200 },
  { name: "Cardiology", count: 12_800 },
  { name: "Orthopaedics", count: 11_300 },
  { name: "Dermatology", count: 10_400 },
  { name: "Psychiatry", count: 8_900 },
];

/** Discharge disposition (Inpatient.Discharge Disposition code set). */
export const dischargeDisposition = [
  { name: "Home / Routine", count: 8_140, color: "hsl(142 60% 45%)" },
  { name: "Transferred to other facility", count: 1_120, color: "hsl(199 70% 50%)" },
  { name: "Discharged AMA", count: 285, color: "hsl(38 92% 50%)" },
  { name: "Left without being seen", count: 142, color: "hsl(20 70% 55%)" },
  { name: "Expired", count: 178, color: "hsl(0 72% 51%)" },
];

/** Hajj / Non-Hajj patient distribution (Patient Profile code set). */
export const hajjMix = [
  { name: "Non-Hajj Local", count: 198_000, color: "hsl(142 60% 45%)" },
  { name: "Non-Hajj Worker", count: 64_500, color: "hsl(199 70% 50%)" },
  { name: "Resident Hajj", count: 4_400, color: "hsl(38 92% 50%)" },
  { name: "Non-Resident Hajj", count: 12_900, color: "hsl(20 80% 55%)" },
  { name: "Umrah", count: 8_700, color: "hsl(280 60% 60%)" },
];

/** Bed occupancy by ward type (Bed Management.Bed Status / Ward). */
export const bedOccupancy = [
  { ward: "Med/Surg", capacity: 6_400, occupied: 5_320 },
  { ward: "ICU", capacity: 1_180, occupied: 1_065 },
  { ward: "Paediatrics", capacity: 1_640, occupied: 1_120 },
  { ward: "Maternity", capacity: 1_240, occupied: 980 },
  { ward: "Psychiatry", capacity: 720, occupied: 540 },
  { ward: "Isolation", capacity: 380, occupied: 190 },
];

/** Order volumes — Lab Order ID / Rad Order ID / Prescription Order ID counts.
 * Returned as 14-day sparklines plus today's total. */
export interface OrderSeries {
  name: string;
  total: number;
  spark: { day: number; value: number }[];
  source: string;
}

export const orderVolumes: OrderSeries[] = [
  {
    name: "Lab orders",
    total: 142_300,
    source: "Laboratory.Lab Order ID",
    spark: spark(142_300, 14, 0.08),
  },
  {
    name: "Radiology orders",
    total: 38_900,
    source: "Radiology.Rad Order ID",
    spark: spark(38_900, 14, 0.10),
  },
  {
    name: "Prescriptions",
    total: 218_400,
    source: "Pharmacy.Prescription Order ID",
    spark: spark(218_400, 14, 0.06),
  },
  {
    name: "Surgeries",
    total: 4_220,
    source: "Surgery.Surgery Order ID",
    spark: spark(4_220, 14, 0.18),
  },
];

function spark(base: number, n: number, vol: number) {
  return Array.from({ length: n }, (_, i) => ({
    day: i,
    value: Math.round(base * (1 + (rnd() - 0.5) * vol)),
  }));
}

/** Vital sign alert counts in last 24h (synthetic). Each row maps to one or
 * more vital sign elements that appear across Outpatient / Emergency /
 * Inpatient / Inpatient Admission Assessment. */
export const vitalAlerts = [
  { name: "Hypertensive crisis", count: 168, source: "Systolic / Diastolic Blood Pressure" },
  { name: "Tachycardia", count: 312, source: "Heart Rate" },
  { name: "Hypoxia (SpO₂ < 90%)", count: 94, source: "SpO2" },
  { name: "Fever (≥ 39°C)", count: 540, source: "Temperature" },
  { name: "Tachypnoea", count: 187, source: "Respiratory Rate" },
  { name: "Severe pain (≥ 8/10)", count: 410, source: "Pain Level Scale" },
];

/** Childbirth outcomes. */
export const birthOutcomes = [
  { name: "Live birth", count: 1_870, color: "hsl(142 60% 45%)" },
  { name: "Stillborn", count: 22, color: "hsl(0 72% 51%)" },
  { name: "Neonatal complication", count: 142, color: "hsl(38 92% 50%)" },
];

export const placeOfDeath = [
  { name: "Hospital", count: 142 },
  { name: "Home", count: 18 },
  { name: "En route to facility", count: 9 },
  { name: "Other", count: 9 },
];

/** Headline KPI numbers — derived from the synthetic series above. */
export const kpis = (() => {
  const last = dailyEncounters(2);
  const today = last[last.length - 1];
  const yesterday = last[0];
  const totalToday = today.opd + today.ed + today.inpatient;
  const totalYesterday = yesterday.opd + yesterday.ed + yesterday.inpatient;
  const occupiedSum = bedOccupancy.reduce((n, b) => n + b.occupied, 0);
  const capacitySum = bedOccupancy.reduce((n, b) => n + b.capacity, 0);
  const totalDischarges = dischargeDisposition.reduce((n, d) => n + d.count, 0);
  const expired = dischargeDisposition.find((d) => d.name === "Expired")!.count;
  return {
    totalEncountersToday: totalToday,
    totalEncountersChange: ((totalToday - totalYesterday) / totalYesterday) * 100,
    edVisitsToday: today.ed,
    edVisitsChange: ((today.ed - yesterday.ed) / yesterday.ed) * 100,
    bedOccupancyPct: (occupiedSum / capacitySum) * 100,
    avgLengthOfStayDays: 4.2,
    mortalityPer1000: (expired / totalDischarges) * 1000,
    criticalVitalAlerts: vitalAlerts.reduce((n, v) => n + v.count, 0),
    immunizationsAdministered: 27_400,
    pharmacySubstitutionRate: 8.3,
    consentedDataMaskingCoverage: 97.4,
  };
})();
