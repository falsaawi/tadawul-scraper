/**
 * Population-health care plan templates anchored on the Marsad data dictionary.
 *
 * Designed from an ACO population-health-lead perspective: each chronic disease
 * has an identification rubric, risk model, evidence-based intervention bundle,
 * monitoring KPIs, and outcome targets. Every section names the Marsad data
 * elements that would source it in production so the plan is traceable to
 * what the integration is already collecting.
 */

export interface RiskTier {
  name: "Very high" | "High" | "Moderate" | "Low";
  share: number; // share of cohort, 0..1
  color: string;
}

export interface KpiTarget {
  label: string;
  current: number;
  target: number;
  unit: string;
  /** higher current vs target = better, or lower = better */
  direction: "higher" | "lower";
  source: string;
}

export interface JourneyStage {
  id: string;
  index: number;
  title: string;
  cadence: string;
  owners: string[];
  /** What kicks this stage off. */
  triggers: string[];
  /** Concrete actions in this stage. */
  actions: string[];
  /** Marsad data elements that feed or are written by this stage. */
  dataSources: string[];
  /** Quantitative checkpoints for moving forward / back. */
  exitCriteria: string[];
}

export interface Intervention {
  category:
    | "Pharmacotherapy"
    | "Lifestyle"
    | "Education"
    | "Monitoring"
    | "Care coordination"
    | "Behavioral / SDOH";
  title: string;
  detail: string;
  cadence: string;
  owner: string;
  evidence?: string;
}

export interface SmartGoal {
  domain: string;
  goal: string;
  metric: string;
  target: string;
  horizon: string;
}

export interface SamplePatientStep {
  day: number;
  stageId: string;
  what: string;
  data: string;
}

export interface SamplePatient {
  id: string;
  name: string;
  age: number;
  sex: string;
  problemList: string[];
  riskTier: RiskTier["name"];
  intake: { label: string; value: string }[];
  steps: SamplePatientStep[];
}

export interface CarePlan {
  id: string;
  shortName: string;
  fullName: string;
  icd10: string;
  cohortSize: number;
  enrolled: number;
  activePlans: number;
  riskTiers: RiskTier[];
  /** Inclusion logic for the cohort */
  inclusionCriteria: string[];
  /** Variables in the risk-stratification model */
  riskModel: { variable: string; weight: string; source: string }[];
  /** SMART goals examples */
  smartGoals: SmartGoal[];
  /** Intervention bundle. */
  interventions: Intervention[];
  /** Live KPIs against ACO targets. */
  kpis: KpiTarget[];
  /** Stages of the patient journey, common shell. */
  journey: JourneyStage[];
  samplePatient: SamplePatient;
}

const COMMON_RISK_COLORS: Record<RiskTier["name"], string> = {
  "Very high": "hsl(0 72% 51%)",
  High: "hsl(20 90% 55%)",
  Moderate: "hsl(38 92% 50%)",
  Low: "hsl(142 60% 45%)",
};

// ────────────────────────────────────────────────────────────────────────────
// Stage shell — reused by every disease, content tailored per disease via the
// `actions` and `dataSources` arrays below.
// ────────────────────────────────────────────────────────────────────────────

function makeJourney(disease: string, fields: {
  identifyActions: string[];
  identifySources: string[];
  identifyExit: string[];
  engageActions: string[];
  engageSources: string[];
  engageExit: string[];
  assessActions: string[];
  assessSources: string[];
  assessExit: string[];
  planActions: string[];
  planSources: string[];
  planExit: string[];
  interveneActions: string[];
  interveneSources: string[];
  interveneExit: string[];
  monitorActions: string[];
  monitorSources: string[];
  monitorExit: string[];
  escalateActions: string[];
  escalateSources: string[];
  escalateExit: string[];
  outcomeActions: string[];
  outcomeSources: string[];
  outcomeExit: string[];
}): JourneyStage[] {
  return [
    {
      id: "identify",
      index: 1,
      title: "Identify & risk-stratify",
      cadence: "Daily batch + weekly review",
      owners: ["Population Health Analyst", "Care Manager Lead"],
      triggers: [
        `Any encounter with ${disease} on the problem list or in Principal/Secondary Diagnosis`,
        "New lab result outside target range",
        "Recent hospitalization or ED visit",
      ],
      actions: fields.identifyActions,
      dataSources: fields.identifySources,
      exitCriteria: fields.identifyExit,
    },
    {
      id: "engage",
      index: 2,
      title: "Engage & enroll",
      cadence: "Within 7 calendar days of identification",
      owners: ["Care Manager", "Health Coach"],
      triggers: [
        "Patient placed on rising-risk list",
        "Discharge from inpatient stay",
        "Two consecutive missed appointments",
      ],
      actions: fields.engageActions,
      dataSources: fields.engageSources,
      exitCriteria: fields.engageExit,
    },
    {
      id: "assess",
      index: 3,
      title: "Comprehensive assessment",
      cadence: "Within 14 days of enrollment",
      owners: ["RN Care Manager", "Clinical Pharmacist", "Social Worker"],
      triggers: [
        "Patient consents to care plan",
        "Major status change (new comorbidity, hospitalization, medication intolerance)",
      ],
      actions: fields.assessActions,
      dataSources: fields.assessSources,
      exitCriteria: fields.assessExit,
    },
    {
      id: "plan",
      index: 4,
      title: "Goal-setting & individualized plan",
      cadence: "At assessment, then re-set every 3 months",
      owners: ["Most Responsible Physician", "RN Care Manager", "Patient"],
      triggers: [
        "Assessment complete",
        "Failure to meet existing goals at re-evaluation",
      ],
      actions: fields.planActions,
      dataSources: fields.planSources,
      exitCriteria: fields.planExit,
    },
    {
      id: "intervene",
      index: 5,
      title: "Deliver intervention bundle",
      cadence: "Mixed (visit-based + continuous)",
      owners: [
        "MRP / Specialist",
        "Clinical Pharmacist",
        "Diabetes / Hypertension Educator",
        "Community Health Worker",
      ],
      triggers: [
        "Plan signed by patient and MRP",
        "Inter-visit risk flag fires",
      ],
      actions: fields.interveneActions,
      dataSources: fields.interveneSources,
      exitCriteria: fields.interveneExit,
    },
    {
      id: "monitor",
      index: 6,
      title: "Monitor & surveil",
      cadence: "Continuous; structured review every 30 days",
      owners: ["Care Manager", "Population Health Analyst"],
      triggers: [
        "New lab / vital outside threshold",
        "Medication non-adherence flag (refill gap > 14 d)",
        "Unplanned encounter",
      ],
      actions: fields.monitorActions,
      dataSources: fields.monitorSources,
      exitCriteria: fields.monitorExit,
    },
    {
      id: "escalate",
      index: 7,
      title: "Escalate, step-down, or stay the course",
      cadence: "Decision gate every 90 days",
      owners: ["MRP", "Care Manager Lead"],
      triggers: [
        "Patient hits red-flag thresholds (escalate)",
        "Patient at goal for 6 months (step-down)",
        "Loss of contact ≥ 60 days (re-engage)",
      ],
      actions: fields.escalateActions,
      dataSources: fields.escalateSources,
      exitCriteria: fields.escalateExit,
    },
    {
      id: "outcomes",
      index: 8,
      title: "Annual review & outcome reporting",
      cadence: "Annually + ad-hoc on outcome events",
      owners: ["Population Health Lead", "ACO Quality Director"],
      triggers: [
        "Plan anniversary",
        "Patient transition (graduation, transfer, death)",
      ],
      actions: fields.outcomeActions,
      dataSources: fields.outcomeSources,
      exitCriteria: fields.outcomeExit,
    },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// Type 2 Diabetes Mellitus — flagship plan
// ────────────────────────────────────────────────────────────────────────────

const t2dm: CarePlan = {
  id: "t2dm",
  shortName: "T2DM",
  fullName: "Type 2 Diabetes Mellitus",
  icd10: "E11",
  cohortSize: 184_300,
  enrolled: 142_800,
  activePlans: 119_650,
  riskTiers: [
    { name: "Very high", share: 0.07, color: COMMON_RISK_COLORS["Very high"] },
    { name: "High", share: 0.21, color: COMMON_RISK_COLORS.High },
    { name: "Moderate", share: 0.43, color: COMMON_RISK_COLORS.Moderate },
    { name: "Low", share: 0.29, color: COMMON_RISK_COLORS.Low },
  ],
  inclusionCriteria: [
    "Two or more outpatient encounters with ICD-10 E11.* in 12 months, or",
    "One inpatient/ED encounter with E11.* primary or secondary, or",
    "HbA1c ≥ 6.5% on two separate samples ≥ 14 days apart, or",
    "Active prescription of any ATC A10 (insulins or non-insulin glucose-lowering) for ≥ 90 days",
  ],
  riskModel: [
    { variable: "Most recent HbA1c", weight: "≥ 9% = +3, 8–8.9% = +2, 7–7.9% = +1", source: "Laboratory.Result Value" },
    { variable: "BP control", weight: "SBP ≥ 160 OR DBP ≥ 100 = +2", source: "Outpatient/Inpatient.Systolic / Diastolic Blood Pressure" },
    { variable: "BMI", weight: "≥ 35 = +2, 30–34.9 = +1", source: "Outpatient.Height + Weight" },
    { variable: "ED visits 12 mo", weight: "≥ 2 visits = +2", source: "Emergency.Patient Visit Date Time" },
    { variable: "Hospitalizations 12 mo", weight: "any = +2", source: "Inpatient.Admission Date Time" },
    { variable: "eGFR", weight: "< 45 = +2, 45–59 = +1", source: "Laboratory.Result Value (Creatinine → eGFR)" },
    { variable: "Smoking status", weight: "Current = +1", source: "Inpatient Admission Assessment.Smoking Status Flag" },
    { variable: "Medication adherence (PDC)", weight: "< 80% = +1", source: "Pharmacy.Dispensed Date Time + Dispensed Quantity + Frequency" },
  ],
  smartGoals: [
    { domain: "Glycaemia", goal: "Lower HbA1c without hypoglycaemia", metric: "HbA1c", target: "< 7.0% (individualized to < 7.5% in elderly)", horizon: "6 months" },
    { domain: "Blood pressure", goal: "BP at goal across 3 consecutive readings", metric: "Office BP avg.", target: "< 130/80 mmHg", horizon: "3 months" },
    { domain: "Lipids", goal: "Statin-eligible patients on high-intensity therapy", metric: "LDL-C", target: "< 1.8 mmol/L (70 mg/dL)", horizon: "6 months" },
    { domain: "Weight", goal: "Sustained weight reduction", metric: "Body weight", target: "≥ 5% from baseline", horizon: "6–12 months" },
    { domain: "Behavior", goal: "Smoking cessation if current smoker", metric: "Self-report + CO test", target: "Abstinent ≥ 6 mo", horizon: "12 months" },
    { domain: "Self-care", goal: "Daily SMBG (or CGM time-in-range)", metric: "Logged readings / TIR", target: "TIR > 70%", horizon: "Continuous" },
  ],
  interventions: [
    { category: "Pharmacotherapy", title: "Metformin first-line unless contraindicated", detail: "Titrate to 2 g/day. Hold if eGFR < 30 or acute illness with hypoperfusion.", cadence: "Reassess monthly during titration", owner: "MRP / Clinical Pharmacist", evidence: "ADA 2024 Standards of Care 9.1" },
    { category: "Pharmacotherapy", title: "Add SGLT2 inhibitor for ASCVD, HF, or CKD", detail: "Empagliflozin or dapagliflozin. Independent of HbA1c. Counsel on euglycemic DKA risk.", cadence: "Initiate at index visit; titrate at 4–6 wks", owner: "MRP / Cardiology / Nephrology" },
    { category: "Pharmacotherapy", title: "Add GLP-1 RA for ASCVD or weight reduction", detail: "Semaglutide / dulaglutide. Pair with SGLT2i in very-high-risk ASCVD.", cadence: "Initiate; titrate every 4 weeks", owner: "MRP / Endocrinology" },
    { category: "Pharmacotherapy", title: "ACE-I or ARB if albuminuria or hypertension", detail: "Start low, double dose every 2–4 weeks to max tolerated. Monitor K⁺ and creatinine at 1–2 wks.", cadence: "Titration over 4–8 weeks", owner: "MRP" },
    { category: "Pharmacotherapy", title: "High-intensity statin (atorvastatin 40–80 / rosuvastatin 20–40)", detail: "If LDL still > 1.8 mmol/L despite max-tolerated statin → add ezetimibe → consider PCSK9.", cadence: "Lipid panel 6–8 wks after each step", owner: "MRP / Clinical Pharmacist" },
    { category: "Lifestyle", title: "Mediterranean / DASH-style nutrition plan", detail: "Carb 45–50% of energy, fibre ≥ 25 g/day, sodium < 2 g/day. Refer to RD for 4 sessions in first 90 days.", cadence: "Weekly × 4 then monthly", owner: "Registered Dietitian" },
    { category: "Lifestyle", title: "Physical activity prescription", detail: "150 min/week moderate-intensity + 2 sessions resistance training. Tailor for orthopaedic / cardiac limits.", cadence: "Reassess at 1 month", owner: "Health Coach / Physiotherapy" },
    { category: "Education", title: "Diabetes Self-Management Education & Support (DSMES)", detail: "10 hours of group/individual education in first 6 months covering meds, SMBG/CGM, hypoglycaemia, sick-day rules.", cadence: "4 visits in 90 days, then quarterly", owner: "Diabetes Educator" },
    { category: "Education", title: "Hypoglycaemia preparedness", detail: "Glucagon prescription if on insulin/SU; family briefed.", cadence: "At every regimen change", owner: "Pharmacist / Educator" },
    { category: "Monitoring", title: "Quarterly HbA1c until at goal, then twice yearly", detail: "Reflex eGFR, ACR yearly. Foot exam, dilated retinal exam annually.", cadence: "Per cadence", owner: "MRP" },
    { category: "Monitoring", title: "BP self-monitoring with weekly upload", detail: "Validated upper-arm device. Two readings AM/PM × 7 days quarterly.", cadence: "Weekly", owner: "Care Manager" },
    { category: "Care coordination", title: "Specialty referrals", detail: "Cardiology if ASCVD, Nephrology if eGFR < 30 or rapid decline, Endo if HbA1c > 9 despite triple therapy, Ophthalmology annually.", cadence: "As triggered", owner: "Care Manager" },
    { category: "Care coordination", title: "Transitions of care", detail: "Within 48 h of hospital discharge — med reconciliation, follow-up booked within 7 days.", cadence: "Every transition", owner: "Care Manager" },
    { category: "Behavioral / SDOH", title: "Depression screening (PHQ-9) at intake + annually", detail: "Score ≥ 10 → referral to behavioral health.", cadence: "Annual + symptom-triggered", owner: "Social Worker" },
    { category: "Behavioral / SDOH", title: "Food security & medication affordability check", detail: "Hunger Vital Signs 2-item screen; connect to Saudi MoH support / Zakat services if positive.", cadence: "Intake + annually", owner: "Community Health Worker" },
  ],
  kpis: [
    { label: "HbA1c < 7%", current: 51.2, target: 60, unit: "%", direction: "higher", source: "Laboratory.Result Value (LOINC 4548-4)" },
    { label: "BP < 140/90", current: 64.1, target: 75, unit: "%", direction: "higher", source: "Outpatient.Systolic / Diastolic Blood Pressure" },
    { label: "LDL < 1.8 mmol/L", current: 38.6, target: 50, unit: "%", direction: "higher", source: "Laboratory.Result Value (LDL)" },
    { label: "Statin prescribed (eligible)", current: 78.4, target: 90, unit: "%", direction: "higher", source: "Pharmacy.NHIC Medication Code (statins)" },
    { label: "ACE-I/ARB if albuminuria", current: 71.0, target: 85, unit: "%", direction: "higher", source: "Pharmacy.NHIC Medication Code + Lab.ACR" },
    { label: "Annual eye exam", current: 56.7, target: 70, unit: "%", direction: "higher", source: "OPD.Specialty (Ophthalmology) + Patient Visit Date Time" },
    { label: "Annual foot exam", current: 49.5, target: 70, unit: "%", direction: "higher", source: "OPD.Examination Start Date Time" },
    { label: "ED visits per 1,000 enrolled", current: 178, target: 140, unit: "", direction: "lower", source: "Emergency.Patient Visit Date Time" },
    { label: "All-cause admissions / 1,000", current: 92, target: 70, unit: "", direction: "lower", source: "Inpatient.Admission Date Time" },
    { label: "30-day readmission", current: 14.8, target: 10, unit: "%", direction: "lower", source: "Inpatient.Discharge → Re-admission" },
  ],
  journey: makeJourney("T2DM", {
    identifyActions: [
      "Run nightly cohort job using inclusion criteria above",
      "Score every patient with the 8-variable risk model; assign tier",
      "Append rising-risk patients (tier shift up ≥ 1) to weekly review queue",
      "Validate cohort weekly with MRP — exclude pregnancy, end-of-life, hospice",
    ],
    identifySources: [
      "OPD/Inpatient/Emergency.Principal Diagnosis · Secondary Diagnosis",
      "Laboratory.Result Test Name · Result Value · Result Reference Range",
      "Pharmacy.NHIC Medication Code · Dispensed Date Time",
      "Inpatient Admission Assessment.Smoking Status Flag",
    ],
    identifyExit: [
      "Patient flagged with risk tier in registry",
      "Most-recent risk score < 90 days old",
    ],
    engageActions: [
      "Auto-generate outreach worklist sorted by risk tier",
      "Multi-modal contact: SMS in Arabic/English, phone call, Sehhaty in-app message",
      "Capture verbal consent + register in EMR; open a Care Plan record",
      "If 3 unsuccessful attempts → CHW home visit for very-high tier",
    ],
    engageSources: [
      "Patient Profile.Patient Phone Number · Patient Address",
      "Mawid Appointment.Appointment Booking Date Time · Appointment Status",
      "Patient Profile.Hajj/Non-Hajj Patient (timing constraints)",
    ],
    engageExit: [
      "Patient consents and is enrolled, OR",
      "Documented decline / unable-to-reach after escalation pathway",
    ],
    assessActions: [
      "Comprehensive history: duration of T2DM, complications, hypoglycaemia events, family hx",
      "Medication reconciliation with pharmacist; flag duplications/contraindications",
      "Capture vitals, BMI, foot exam, monofilament test",
      "Order baseline labs: HbA1c, eGFR, ACR, lipid panel, LFTs, TSH",
      "Screen: PHQ-9 depression, hypoglycaemia awareness, fall risk, hearing/vision",
      "SDOH: food security, medication affordability, transport, caregiver burden",
    ],
    assessSources: [
      "Patient Profile (demographics, occupation)",
      "Inpatient Admission Assessment.Height · Weight · Smoking · Alcohol · Fall · Vision · Hearing · Walking flags",
      "Laboratory all elements",
      "Pharmacy.Generic Medication Name · Frequency · Dispensed Quantity",
    ],
    assessExit: [
      "All 6 assessment domains documented",
      "Risk tier reaffirmed or revised",
    ],
    planActions: [
      "Co-write SMART goals with patient (see Goals section)",
      "Choose first-line / add-on pharmacotherapy per ADA-EASD algorithm and patient phenotype",
      "Schedule DSMES, RD, and follow-up cadence based on tier",
      "Document advance-care preferences for very-high tier",
    ],
    planSources: [
      "OPD.Reason for Visit · Principal Diagnosis · Secondary Diagnosis",
      "Pharmacy.Prescription Order ID + full medication elements",
      "Mawid Scheduling.Available Slot Count · Booking Window in Days",
    ],
    planExit: [
      "Care plan signed by MRP and acknowledged by patient",
      "Follow-up appointment booked",
    ],
    interveneActions: [
      "Begin / titrate pharmacotherapy as per plan",
      "DSMES sessions delivered on schedule, attendance logged",
      "Health-coach calls weekly for tier-1/2 for first 12 weeks",
      "Pharmacist medication review at week 4 and week 12",
      "Specialty referrals dispatched and tracked to first visit",
    ],
    interveneSources: [
      "Pharmacy.Dispensed Date Time · Was Substituted Flag · Remaining Refills",
      "OPD/Specialty.Patient Visit Date Time",
      "Surgery / Procedure (if escalation to e.g. bariatric)",
    ],
    interveneExit: [
      "All planned interventions either completed, in progress, or formally deferred with reason",
    ],
    monitorActions: [
      "Daily ingest of new labs/vitals → automated rules engine",
      "30-day medication adherence check via PDC (refill gaps)",
      "Auto-enroll in remote BP / SMBG programme for tier 1–2",
      "Weekly population dashboard review with Care Manager Lead",
    ],
    monitorSources: [
      "Laboratory.Result Date Time · Result Value · Result Reference Range",
      "All vital sign elements across OPD / Emergency / Inpatient",
      "Pharmacy.Dispensed Date Time · Dispensed Quantity",
    ],
    monitorExit: [
      "Patient meets goals → step-down candidate",
      "Patient breaches red-flag threshold → escalate stage",
    ],
    escalateActions: [
      "Red-flag escalation to MRP within 24 h: e.g., HbA1c rise ≥ 1.5% in 90 days, ED visit for hypo/hyperglycaemia, new ACS, eGFR decline > 5 mL/min/year",
      "Step-down to PCMH-only follow-up if at goal × 6 months and risk tier ≤ Moderate",
      "Loss-of-contact protocol: 3-touch outreach, then home visit, then closure",
    ],
    escalateSources: [
      "All clinical elements above",
      "Inpatient.Discharge Disposition",
      "Death.Death Date Time",
    ],
    escalateExit: [
      "Care plan tier formally changed in registry",
      "Communication sent to patient and primary care team",
    ],
    outcomeActions: [
      "Compute clinical KPIs (see KPI panel) and benchmark vs ACO target",
      "Compute utilization deltas: ED visits, admissions, 30-day readmits, total cost",
      "Patient-reported outcomes: PHQ-9 trend, treatment satisfaction (DTSQ)",
      "Generate annual care-plan summary letter for patient and MRP",
    ],
    outcomeSources: [
      "All upstream elements",
      "Pharmacy.NHIC Medication Code · Dispensed Date Time",
      "Inpatient.Length of Stay · Discharge Disposition",
    ],
    outcomeExit: [
      "Annual review documented",
      "Patient continues, graduates, transfers, or is closed",
    ],
  }),
  samplePatient: {
    id: "P-014729",
    name: "Mohammed A. (anonymized)",
    age: 58,
    sex: "Male",
    problemList: ["Type 2 Diabetes (E11)", "Essential hypertension (I10)", "Obesity BMI 34", "Dyslipidaemia"],
    riskTier: "High",
    intake: [
      { label: "HbA1c", value: "9.2 %" },
      { label: "BP", value: "158 / 95 mmHg" },
      { label: "LDL-C", value: "3.4 mmol/L" },
      { label: "eGFR", value: "62 mL/min/1.73m²" },
      { label: "ACR", value: "48 mg/g (microalbuminuria)" },
      { label: "BMI", value: "34.1" },
      { label: "Smoking", value: "Former, quit 3 yrs" },
      { label: "PHQ-9", value: "11 (mild–moderate)" },
    ],
    steps: [
      { day: 0, stageId: "identify", what: "Flagged by nightly job: HbA1c 9.2% + BP 158/95 + 1 ED visit / 90d → tier ‘High’.", data: "Lab + Vitals + Emergency.Visit Date Time" },
      { day: 2, stageId: "engage", what: "SMS in Arabic with consent link; phone follow-up; enrolled by RN Care Manager.", data: "Patient Profile.Phone Number · Mawid.Booking" },
      { day: 9, stageId: "assess", what: "60-min assessment with RN + pharmacist. PHQ-9 = 11. Food-secure. Lives with spouse.", data: "Admission Assessment flags · Lab orders" },
      { day: 12, stageId: "plan", what: "SMART goals: HbA1c < 7.5% by month 6, BP < 130/80 by month 3, 5% weight loss by month 6.", data: "OPD.Reason for Visit · Pharmacy.Prescription Order ID" },
      { day: 14, stageId: "intervene", what: "Metformin 500→2000 mg titrated over 4 wks. Empagliflozin 10 mg added. Lisinopril 10 mg started for ACR.", data: "Pharmacy.Dispensed Date Time × 3" },
      { day: 30, stageId: "intervene", what: "DSMES session 1 of 4 attended. Health-coach weekly calls begin.", data: "OPD.Patient Visit Date Time" },
      { day: 45, stageId: "monitor", what: "Home BP avg 138/86 mmHg over 7 days. Adherence PDC 92%.", data: "Vital sign elements · Pharmacy.Dispensed Quantity" },
      { day: 90, stageId: "monitor", what: "HbA1c 7.8%. LDL 2.4 mmol/L on atorvastatin 40 mg. ACR improved to 22 mg/g.", data: "Laboratory.Result Value × 3" },
      { day: 180, stageId: "outcomes", what: "HbA1c 7.0%. BP 128/78. Weight −6.8 kg. PHQ-9 = 4. Risk tier downgraded to Moderate.", data: "All KPIs evaluated" },
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Other diseases — same structure, abbreviated content where evidence is well
// known and population-health stages mirror T2DM.
// ────────────────────────────────────────────────────────────────────────────

const htn: CarePlan = {
  id: "htn",
  shortName: "Hypertension",
  fullName: "Essential Hypertension",
  icd10: "I10",
  cohortSize: 312_400,
  enrolled: 248_900,
  activePlans: 211_300,
  riskTiers: [
    { name: "Very high", share: 0.05, color: COMMON_RISK_COLORS["Very high"] },
    { name: "High", share: 0.18, color: COMMON_RISK_COLORS.High },
    { name: "Moderate", share: 0.39, color: COMMON_RISK_COLORS.Moderate },
    { name: "Low", share: 0.38, color: COMMON_RISK_COLORS.Low },
  ],
  inclusionCriteria: [
    "Two outpatient encounters with ICD-10 I10/I11/I12/I13 in 12 months, or",
    "Three office BP readings ≥ 140/90 within 6 months on different days, or",
    "Active prescription of any antihypertensive class for ≥ 90 days",
  ],
  riskModel: [
    { variable: "Avg BP", weight: "≥ 160/100 = +3, 140–159/90–99 = +2", source: "Outpatient.SBP / DBP" },
    { variable: "End-organ damage", weight: "LVH, retinopathy, CKD = +2 each", source: "Lab + Specialty visits" },
    { variable: "ASCVD 10-yr risk", weight: "≥ 20% = +2", source: "Lab + Patient Profile" },
    { variable: "Comorbid T2DM", weight: "+2", source: "OPD.Diagnosis" },
    { variable: "Adherence (PDC)", weight: "< 80% = +1", source: "Pharmacy.Dispensed elements" },
  ],
  smartGoals: [
    { domain: "Blood pressure", goal: "Sustained BP control", metric: "Office BP avg", target: "< 130/80 (or < 140/90 in elderly)", horizon: "3 months" },
    { domain: "Self-measurement", goal: "Home BP weekly upload", metric: "Readings logged", target: "≥ 14 readings / month", horizon: "Continuous" },
    { domain: "Lifestyle", goal: "Sodium reduction + DASH diet", metric: "Spot urine sodium", target: "< 100 mmol/24h equivalent", horizon: "6 months" },
    { domain: "Weight", goal: "5% weight loss if BMI ≥ 25", metric: "Body weight", target: "−5%", horizon: "6 months" },
  ],
  interventions: [
    { category: "Pharmacotherapy", title: "First-line: ACE-I/ARB OR thiazide-like diuretic OR DHP CCB", detail: "Choice driven by age, comorbidity, ethnicity. Combination at start if BP > 160/100.", cadence: "Titrate q2–4 wks", owner: "MRP" },
    { category: "Pharmacotherapy", title: "Add-on per stepwise algorithm A → C → D → spironolactone", detail: "Confirm adherence + secondary causes before labelling resistant.", cadence: "Every 4–6 wks until at goal", owner: "MRP / Pharmacist" },
    { category: "Lifestyle", title: "DASH-style diet, sodium < 2g/day, alcohol minimal", detail: "RD-led group sessions × 4 in 90 days.", cadence: "Weekly × 4", owner: "RD" },
    { category: "Lifestyle", title: "Aerobic + isometric exercise prescription", detail: "150 min/wk moderate cardio + 3 sessions handgrip 2 min × 4.", cadence: "Weekly", owner: "Health Coach" },
    { category: "Education", title: "Home BP technique training", detail: "Validated cuff, correct posture, 2 readings AM/PM, log in app.", cadence: "Initial + at any device change", owner: "Educator" },
    { category: "Monitoring", title: "Home BP review every 14 days", detail: "Auto-flag avg ≥ 135/85 sustained → call within 48h.", cadence: "Bi-weekly", owner: "Care Manager" },
    { category: "Care coordination", title: "Cardiology / Nephrology referral if resistant or end-organ damage", detail: "", cadence: "As triggered", owner: "Care Manager" },
    { category: "Behavioral / SDOH", title: "Affordability check + simplification of regimen", detail: "Prefer once-daily fixed-dose combinations.", cadence: "At each med change", owner: "Pharmacist" },
  ],
  kpis: [
    { label: "BP < 140/90", current: 67.4, target: 80, unit: "%", direction: "higher", source: "Outpatient.SBP / DBP" },
    { label: "BP < 130/80 (high-risk)", current: 41.8, target: 60, unit: "%", direction: "higher", source: "Outpatient.SBP / DBP" },
    { label: "Adherence (PDC ≥ 80%)", current: 73.1, target: 85, unit: "%", direction: "higher", source: "Pharmacy.Dispensed elements" },
    { label: "Single-pill combination use", current: 38.0, target: 60, unit: "%", direction: "higher", source: "Pharmacy.Generic Medication Name" },
    { label: "ED hypertensive urgency / 1,000", current: 19, target: 12, unit: "", direction: "lower", source: "Emergency.Principal Diagnosis" },
  ],
  journey: makeJourney("Hypertension", {
    identifyActions: ["Cohort job nightly using inclusion criteria", "Risk score using 5-variable model", "Validate weekly with MRP"],
    identifySources: ["OPD.Diagnosis", "Outpatient.SBP / DBP", "Pharmacy.NHIC Medication Code"],
    identifyExit: ["Tier assigned in registry"],
    engageActions: ["Outreach via SMS / Sehhaty / phone within 7 days", "Consent capture, enroll in care plan"],
    engageSources: ["Patient Profile.Phone · Address", "Mawid Appointment"],
    engageExit: ["Patient enrolled or formally declined"],
    assessActions: ["Confirm out-of-office BP (home or ABPM)", "Lipid + HbA1c + creatinine + electrolytes + UACR + ECG", "End-organ assessment", "SDOH + adherence screen"],
    assessSources: ["Lab elements", "Outpatient.Vitals"],
    assessExit: ["Phenotype documented (with/without end-organ damage, with/without comorbidities)"],
    planActions: ["Choose first-line therapy per algorithm", "Set BP target individualized", "Plan home-BP cadence"],
    planSources: ["OPD.Diagnosis", "Pharmacy.Prescription Order ID"],
    planExit: ["Plan signed; follow-up booked at 4 weeks"],
    interveneActions: ["Dispense + titrate", "Educator session for home BP technique", "Pharmacist review at 4 weeks"],
    interveneSources: ["Pharmacy.Dispensed elements", "OPD.Patient Visit Date Time"],
    interveneExit: ["At-goal or escalation rule fired"],
    monitorActions: ["Bi-weekly home BP review", "Adherence flag for refill gap > 14 days"],
    monitorSources: ["Vital sign elements", "Pharmacy.Dispensed Date Time"],
    monitorExit: ["Goal sustained 6 months → step-down; or red flag → escalate"],
    escalateActions: ["Resistant HTN workup", "Cardiology / Nephrology referral", "Step-down to annual review"],
    escalateSources: ["Lab elements", "OPD.Specialty"],
    escalateExit: ["Tier change documented"],
    outcomeActions: ["Annual KPIs vs target", "Utilization delta", "Patient-reported outcomes"],
    outcomeSources: ["All upstream elements"],
    outcomeExit: ["Annual review filed"],
  }),
  samplePatient: {
    id: "P-031144",
    name: "Sarah K. (anonymized)",
    age: 47,
    sex: "Female",
    problemList: ["Essential hypertension (I10)", "Obesity BMI 31"],
    riskTier: "Moderate",
    intake: [
      { label: "Home BP avg", value: "152 / 96 mmHg" },
      { label: "Office BP", value: "158 / 100 mmHg" },
      { label: "LDL-C", value: "3.1 mmol/L" },
      { label: "BMI", value: "31.4" },
      { label: "Adherence", value: "PDC 60% (recent gaps)" },
    ],
    steps: [
      { day: 0, stageId: "identify", what: "Flagged: 3 office BP readings ≥ 150/95 in 90 days. Tier Moderate.", data: "Outpatient.SBP / DBP" },
      { day: 5, stageId: "engage", what: "SMS + Sehhaty link. Enrolled.", data: "Patient Profile · Mawid" },
      { day: 12, stageId: "assess", what: "ABPM mean 148/94. ECG normal. ACR 12 mg/g.", data: "Outpatient.Vitals · Lab" },
      { day: 14, stageId: "plan", what: "Plan: ACEI + thiazide as single-pill (perindopril/indapamide).", data: "Pharmacy.Prescription Order ID" },
      { day: 28, stageId: "intervene", what: "Home BP avg 138/85. Pharmacist call: tolerated, no cough.", data: "Vital sign elements" },
      { day: 90, stageId: "monitor", what: "Home BP 126/78 sustained 4 weeks. Weight −2.8 kg.", data: "Vitals + Weight" },
      { day: 365, stageId: "outcomes", what: "BP < 130/80 maintained. Step-down to annual review.", data: "All KPIs evaluated" },
    ],
  },
};

const hf: CarePlan = {
  id: "hf",
  shortName: "Heart Failure",
  fullName: "Heart Failure (HFrEF / HFpEF)",
  icd10: "I50",
  cohortSize: 28_500,
  enrolled: 24_100,
  activePlans: 22_200,
  riskTiers: [
    { name: "Very high", share: 0.18, color: COMMON_RISK_COLORS["Very high"] },
    { name: "High", share: 0.32, color: COMMON_RISK_COLORS.High },
    { name: "Moderate", share: 0.34, color: COMMON_RISK_COLORS.Moderate },
    { name: "Low", share: 0.16, color: COMMON_RISK_COLORS.Low },
  ],
  inclusionCriteria: [
    "Inpatient or ED diagnosis I50.* (any), or",
    "Outpatient I50.* + echo with LVEF ≤ 40% (HFrEF) or LVEF > 40% with diastolic dysfunction (HFpEF), or",
    "NT-proBNP > 300 pg/mL with clinical signs",
  ],
  riskModel: [
    { variable: "NYHA class", weight: "III–IV = +3, II = +1", source: "OPD.Reason for Visit / Specialist note" },
    { variable: "LVEF", weight: "< 30% = +2", source: "Radiology / Lab" },
    { variable: "NT-proBNP", weight: "> 1000 pg/mL = +2", source: "Laboratory.Result Value" },
    { variable: "HF admission in 12 mo", weight: "any = +3", source: "Inpatient.Admission Date Time + Diagnosis" },
    { variable: "eGFR", weight: "< 30 = +2", source: "Lab" },
    { variable: "Adherence", weight: "PDC < 80% = +1", source: "Pharmacy.Dispensed elements" },
  ],
  smartGoals: [
    { domain: "Decongestion", goal: "Stable euvolaemia", metric: "Daily weight ± 1 kg", target: "Stable × 4 wks", horizon: "30 days post-discharge" },
    { domain: "Pharmacotherapy", goal: "On all 4 GDMT pillars at target dose", metric: "ARNI/ACEI/ARB + β-blocker + MRA + SGLT2i", target: "≥ 50% target dose for all 4", horizon: "90 days" },
    { domain: "Self-care", goal: "Daily weights logged + symptom diary", metric: "Weeks compliant", target: "≥ 4 days/wk", horizon: "Continuous" },
    { domain: "Vaccination", goal: "Influenza + pneumococcal + COVID up to date", metric: "Coverage", target: "100%", horizon: "Annual" },
  ],
  interventions: [
    { category: "Pharmacotherapy", title: "Initiate all 4 GDMT pillars together (HFrEF)", detail: "ARNI (sacubitril/valsartan) > ACEI/ARB; evidence-based β-blocker; MRA; SGLT2i. Titrate every 2 weeks.", cadence: "Titrate over 4–8 wks", owner: "Cardiology / MRP" },
    { category: "Pharmacotherapy", title: "Diuretic dose optimization", detail: "Lowest dose maintaining euvolaemia. Education on flexible diuretic plan.", cadence: "Symptom-driven", owner: "MRP" },
    { category: "Monitoring", title: "Daily weights + symptom diary", detail: "Auto-alert on weight gain ≥ 2 kg in 3 days.", cadence: "Daily", owner: "Care Manager" },
    { category: "Care coordination", title: "30-day post-discharge bundle", detail: "Med rec within 48h, RN call day 2, MD visit day 7, cardio visit day 14.", cadence: "Each transition", owner: "Care Manager" },
    { category: "Education", title: "Salt < 2 g/day, fluid 1.5–2 L/day, alcohol limits", detail: "Group + individual sessions.", cadence: "4 in 90 days", owner: "RD / Educator" },
    { category: "Behavioral / SDOH", title: "Caregiver involvement; depression screen", detail: "PHQ-9 + family meeting at intake.", cadence: "Annual", owner: "Social Worker" },
  ],
  kpis: [
    { label: "On all 4 GDMT pillars (HFrEF)", current: 38.4, target: 65, unit: "%", direction: "higher", source: "Pharmacy.Generic Medication Name" },
    { label: "30-day readmission", current: 21.2, target: 14, unit: "%", direction: "lower", source: "Inpatient.Discharge → Re-admission" },
    { label: "1-yr mortality", current: 12.8, target: 9, unit: "%", direction: "lower", source: "Death.Death Date Time" },
    { label: "Daily weight logging adherence", current: 47.5, target: 70, unit: "%", direction: "higher", source: "RPM (Inpatient.Weight equiv.)" },
  ],
  journey: makeJourney("HF", {
    identifyActions: ["Inpatient discharge auto-flag", "Outpatient HFpEF identification via NT-proBNP + symptoms"],
    identifySources: ["Inpatient.Admission · Diagnosis", "Lab.NT-proBNP", "Radiology.Result Status (echo)"],
    identifyExit: ["Tier assigned"],
    engageActions: ["Care manager call within 48h of discharge", "Enroll in transitional care bundle"],
    engageSources: ["Patient Profile · Inpatient.Discharge Date Time"],
    engageExit: ["Patient enrolled in HF programme"],
    assessActions: ["NYHA class, LVEF review, volume status, comorbidities", "GDMT gap analysis", "Frailty + cognition + caregiver assessment"],
    assessSources: ["OPD/Inpatient elements", "Pharmacy.Generic Medication Name"],
    assessExit: ["GDMT gaps identified, addressable"],
    planActions: ["Initiate / titrate all 4 GDMT pillars", "Set daily-weight + diuretic action plan", "Book cardio + RN cadence"],
    planSources: ["Pharmacy.Prescription Order ID"],
    planExit: ["Plan signed"],
    interveneActions: ["Bi-weekly titration calls", "Vaccinations updated", "Pulmonary rehab if appropriate"],
    interveneSources: ["Pharmacy.Dispensed elements", "Immunization elements"],
    interveneExit: ["At target doses or maximum tolerated documented"],
    monitorActions: ["Daily-weight RPM", "Auto-alert on > 2 kg gain in 3 days", "30-day readmission tracking"],
    monitorSources: ["Vital sign elements", "Inpatient.Admission Date Time"],
    monitorExit: ["Stable × 90 days → step-down; decompensation → escalate"],
    escalateActions: ["IV diuretic clinic", "Advanced HF / transplant referral if NYHA IV / refractory", "Palliative care if appropriate"],
    escalateSources: ["Inpatient + Specialty visits"],
    escalateExit: ["Care path updated"],
    outcomeActions: ["Annual review of mortality, readmission, GDMT", "Patient-reported outcome (KCCQ)"],
    outcomeSources: ["All upstream"],
    outcomeExit: ["Annual review filed"],
  }),
  samplePatient: {
    id: "P-008812",
    name: "Abdullah F. (anonymized)",
    age: 71,
    sex: "Male",
    problemList: ["HFrEF (LVEF 28%) (I50.21)", "T2DM (E11)", "CKD stage 3a"],
    riskTier: "Very high",
    intake: [
      { label: "NT-proBNP", value: "2,140 pg/mL" },
      { label: "LVEF", value: "28 %" },
      { label: "NYHA", value: "III" },
      { label: "BP", value: "112 / 70 mmHg" },
      { label: "eGFR", value: "44 mL/min/1.73m²" },
      { label: "Adherence", value: "PDC 70%" },
    ],
    steps: [
      { day: 0, stageId: "identify", what: "Flagged at index hospital discharge for decompensated HF.", data: "Inpatient.Diagnosis · Discharge" },
      { day: 1, stageId: "engage", what: "RN call within 24h. Med-rec done. Day-7 cardio booked.", data: "Pharmacy + Mawid" },
      { day: 7, stageId: "assess", what: "GDMT gap: not on ARNI or SGLT2i. Volume mildly overloaded.", data: "Pharmacy.Generic Medication Name" },
      { day: 10, stageId: "plan", what: "Plan: switch ACEI → sacubitril/valsartan; add empagliflozin; continue carvedilol + spironolactone; daily weights.", data: "Pharmacy.Prescription Order ID × 2" },
      { day: 30, stageId: "monitor", what: "Stable euvolaemia. NT-proBNP 1,090 pg/mL.", data: "Lab + RPM weights" },
      { day: 90, stageId: "monitor", what: "On all 4 pillars at ≥ 50% target. KCCQ + 12 points from baseline.", data: "Pharmacy + PRO" },
      { day: 180, stageId: "outcomes", what: "No re-admissions. NYHA II. Tier downgraded to High.", data: "All KPIs" },
    ],
  },
};

const copd: CarePlan = {
  id: "copd",
  shortName: "COPD",
  fullName: "Chronic Obstructive Pulmonary Disease",
  icd10: "J44",
  cohortSize: 41_700,
  enrolled: 31_200,
  activePlans: 27_800,
  riskTiers: [
    { name: "Very high", share: 0.10, color: COMMON_RISK_COLORS["Very high"] },
    { name: "High", share: 0.24, color: COMMON_RISK_COLORS.High },
    { name: "Moderate", share: 0.36, color: COMMON_RISK_COLORS.Moderate },
    { name: "Low", share: 0.30, color: COMMON_RISK_COLORS.Low },
  ],
  inclusionCriteria: [
    "Two outpatient encounters with J44.* in 12 months, or",
    "Spirometry FEV1/FVC < 0.70 post-bronchodilator, or",
    "Active long-acting bronchodilator prescription ≥ 90 days",
  ],
  riskModel: [
    { variable: "Exacerbations / yr", weight: "≥ 2 = +3, 1 = +1", source: "ED + Inpatient.Diagnosis" },
    { variable: "FEV1 % predicted", weight: "< 30% = +3, 30–49% = +2", source: "Specialty notes" },
    { variable: "mMRC dyspnoea", weight: "≥ 2 = +1", source: "OPD assessment" },
    { variable: "Smoking", weight: "Current = +2", source: "Admission Assessment.Smoking Flag" },
  ],
  smartGoals: [
    { domain: "Symptoms", goal: "Reduce dyspnoea (CAT score)", metric: "CAT", target: "Δ ≥ 2 points", horizon: "3 months" },
    { domain: "Exacerbations", goal: "Reduce moderate / severe exacerbations", metric: "Annualized rate", target: "≥ 25 % reduction", horizon: "12 months" },
    { domain: "Cessation", goal: "Tobacco abstinence", metric: "7-day point prev.", target: "Abstinent", horizon: "6 months" },
  ],
  interventions: [
    { category: "Pharmacotherapy", title: "Long-acting bronchodilator (LAMA ± LABA)", detail: "Step up to LAMA + LABA + ICS in eosinophilic phenotype or frequent exacerbators.", cadence: "Reassess at 4 wks", owner: "MRP / Pulmonology" },
    { category: "Pharmacotherapy", title: "Smoking cessation pharmacotherapy", detail: "Varenicline / NRT + behavioral support.", cadence: "12-week course", owner: "Cessation clinic" },
    { category: "Lifestyle", title: "Pulmonary rehabilitation", detail: "8-week structured programme post-exacerbation or for mMRC ≥ 2.", cadence: "8 wks × 2/wk", owner: "PT / RT" },
    { category: "Education", title: "Inhaler technique check at every visit", detail: "Document technique pass/fail.", cadence: "Each visit", owner: "Pharmacist / RT" },
    { category: "Monitoring", title: "Action plan for exacerbations", detail: "Patient-held action plan; rescue antibiotic + steroid in selected cases.", cadence: "Continuous", owner: "MRP" },
    { category: "Care coordination", title: "Vaccinations: influenza, pneumococcal, COVID, RSV (≥ 60)", detail: "Annual + age-appropriate.", cadence: "Annual", owner: "Care Manager" },
  ],
  kpis: [
    { label: "On guideline-concordant inhaler", current: 64.2, target: 80, unit: "%", direction: "higher", source: "Pharmacy.NHIC Medication Code" },
    { label: "Exacerbations / 1,000 / yr", current: 312, target: 240, unit: "", direction: "lower", source: "ED + Inpatient.Diagnosis" },
    { label: "Tobacco-free at 6 mo", current: 18.6, target: 30, unit: "%", direction: "higher", source: "Admission Assessment.Smoking Flag" },
    { label: "Annual influenza vaccination", current: 52.8, target: 75, unit: "%", direction: "higher", source: "Immunization elements" },
  ],
  journey: makeJourney("COPD", {
    identifyActions: ["Cohort job using inclusion criteria", "Score with 4-variable model", "Validate with pulmonology"],
    identifySources: ["OPD/ED/Inpatient.Diagnosis", "Pharmacy.NHIC Medication Code", "Admission Assessment.Smoking"],
    identifyExit: ["Tier assigned"],
    engageActions: ["Outreach within 7 days", "Enroll + book pulmonary rehab assessment if eligible"],
    engageSources: ["Patient Profile · Mawid"],
    engageExit: ["Enrolled or declined"],
    assessActions: ["Spirometry, mMRC, CAT, exacerbation history", "Inhaler technique evaluation", "SDOH + cessation readiness"],
    assessSources: ["Specialty notes", "Pharmacy.Dose Form / Route"],
    assessExit: ["Phenotype + GOLD group documented"],
    planActions: ["Choose inhaler regimen by phenotype", "Plan rehab + cessation + vaccination"],
    planSources: ["Pharmacy.Prescription Order ID"],
    planExit: ["Plan signed"],
    interveneActions: ["Dispense + technique training", "Pulmonary rehab attendance tracking", "Cessation pharmacotherapy"],
    interveneSources: ["Pharmacy.Dispensed elements", "OPD.Patient Visit Date Time"],
    interveneExit: ["Bundle delivered or formally deferred"],
    monitorActions: ["Symptom-trigger alerts (peak flow / SpO2)", "Annual vaccination review"],
    monitorSources: ["Vital sign elements", "Immunization"],
    monitorExit: ["Stable / step-down or escalate"],
    escalateActions: ["Pulmonology referral, NIV review", "Palliative if very-severe + frequent exacerbations"],
    escalateSources: ["Specialty + Inpatient"],
    escalateExit: ["Care path updated"],
    outcomeActions: ["Annual exacerbation rate, hospitalizations, PROs (CAT / mMRC)"],
    outcomeSources: ["All upstream"],
    outcomeExit: ["Annual review filed"],
  }),
  samplePatient: {
    id: "P-022501",
    name: "Khalid S. (anonymized)",
    age: 64,
    sex: "Male",
    problemList: ["COPD GOLD 3 / Group E (J44.9)", "Former smoker, 40 pack-yrs"],
    riskTier: "High",
    intake: [
      { label: "FEV1 % predicted", value: "42 %" },
      { label: "mMRC", value: "3" },
      { label: "CAT", value: "22" },
      { label: "Exacerbations 12mo", value: "2 (1 admission)" },
      { label: "Inhaler technique", value: "Fail" },
    ],
    steps: [
      { day: 0, stageId: "identify", what: "Flagged from inpatient discharge. Group E.", data: "Inpatient.Diagnosis" },
      { day: 5, stageId: "engage", what: "Enrolled. Pulmonary rehab booked.", data: "Mawid · Patient Profile" },
      { day: 14, stageId: "assess", what: "Inhaler retraining. Cessation already abstinent ×3 yrs.", data: "Pharmacy.Dose Form / Route" },
      { day: 16, stageId: "plan", what: "Triple therapy LAMA/LABA/ICS once-daily.", data: "Pharmacy.Prescription Order ID" },
      { day: 60, stageId: "intervene", what: "Pulmonary rehab 12/16 sessions. CAT ↓ to 17.", data: "OPD.Visit Date Time" },
      { day: 365, stageId: "outcomes", what: "No exacerbations. mMRC 2. Step-down to Moderate.", data: "ED/Inpatient.Diagnosis" },
    ],
  },
};

const ckd: CarePlan = {
  id: "ckd",
  shortName: "CKD",
  fullName: "Chronic Kidney Disease (Stages 3–5)",
  icd10: "N18",
  cohortSize: 22_900,
  enrolled: 18_600,
  activePlans: 16_400,
  riskTiers: [
    { name: "Very high", share: 0.14, color: COMMON_RISK_COLORS["Very high"] },
    { name: "High", share: 0.28, color: COMMON_RISK_COLORS.High },
    { name: "Moderate", share: 0.36, color: COMMON_RISK_COLORS.Moderate },
    { name: "Low", share: 0.22, color: COMMON_RISK_COLORS.Low },
  ],
  inclusionCriteria: [
    "eGFR < 60 mL/min/1.73m² for ≥ 3 months, or",
    "ACR ≥ 30 mg/g for ≥ 3 months, or",
    "Diagnosis N18.* on two encounters",
  ],
  riskModel: [
    { variable: "eGFR", weight: "< 30 = +3, 30–44 = +2, 45–59 = +1", source: "Lab" },
    { variable: "ACR", weight: "> 300 = +2, 30–300 = +1", source: "Lab" },
    { variable: "Comorbid T2DM", weight: "+2", source: "OPD.Diagnosis" },
    { variable: "BP", weight: "≥ 140/90 = +1", source: "Outpatient.SBP / DBP" },
  ],
  smartGoals: [
    { domain: "Slow progression", goal: "eGFR decline < 3 mL/min/1.73m²/yr", metric: "Annualized slope", target: "< 3", horizon: "12 months" },
    { domain: "Albuminuria", goal: "ACR < 30 mg/g", metric: "ACR", target: "< 30", horizon: "12 months" },
    { domain: "BP", goal: "BP < 130/80", metric: "Office BP", target: "< 130/80", horizon: "3 months" },
    { domain: "Vaccination", goal: "Influenza + pneumococcal + Hep B + COVID", metric: "Coverage", target: "100%", horizon: "Annual" },
  ],
  interventions: [
    { category: "Pharmacotherapy", title: "ACE-I or ARB at maximum tolerated dose", detail: "Monitor K⁺ and creatinine 1–2 wks after each titration.", cadence: "Titrate q4 wks", owner: "MRP" },
    { category: "Pharmacotherapy", title: "SGLT2 inhibitor (eGFR ≥ 20)", detail: "Slows progression independent of T2DM.", cadence: "Initiate; reassess 4–6 wks", owner: "MRP / Nephrology" },
    { category: "Pharmacotherapy", title: "Non-steroidal MRA (finerenone) if T2DM + albuminuria", detail: "Monitor potassium.", cadence: "Initiate; titrate", owner: "Nephrology" },
    { category: "Lifestyle", title: "Sodium restriction, plant-forward, individualized protein", detail: "Renal RD-led.", cadence: "Initial + quarterly", owner: "Renal RD" },
    { category: "Care coordination", title: "Nephrology referral if eGFR < 30 or rapid progression", detail: "Plan for renal replacement counselling at eGFR < 20.", cadence: "As triggered", owner: "Care Manager" },
    { category: "Monitoring", title: "Quarterly eGFR + ACR + electrolytes", detail: "Auto-alert on K⁺ > 5.5 or eGFR drop > 25%.", cadence: "Quarterly", owner: "Care Manager" },
    { category: "Education", title: "Avoid nephrotoxins (NSAIDs, contrast, herbal)", detail: "Patient leaflet + pharmacist review.", cadence: "Initial + each med change", owner: "Pharmacist" },
  ],
  kpis: [
    { label: "ACE-I/ARB use", current: 74.0, target: 90, unit: "%", direction: "higher", source: "Pharmacy.NHIC Medication Code" },
    { label: "SGLT2i use (eligible)", current: 36.4, target: 65, unit: "%", direction: "higher", source: "Pharmacy.NHIC Medication Code" },
    { label: "Avg eGFR slope (mL/min/yr)", current: 3.4, target: 2, unit: "", direction: "lower", source: "Lab.Result Value (creatinine)" },
    { label: "AKI episodes / 1,000", current: 18, target: 12, unit: "", direction: "lower", source: "ED + Inpatient.Diagnosis" },
    { label: "Dialysis crash-starts", current: 22, target: 10, unit: "%", direction: "lower", source: "Dialysis.Dialysis Start Date Time" },
  ],
  journey: makeJourney("CKD", {
    identifyActions: ["Lab-driven cohort identification", "Score with 4-variable model"],
    identifySources: ["Lab.Result Value (creatinine, ACR)", "OPD.Diagnosis"],
    identifyExit: ["Tier assigned + nephrology referral threshold checked"],
    engageActions: ["Outreach + enroll", "Renal RD scheduling"],
    engageSources: ["Patient Profile · Mawid"],
    engageExit: ["Enrolled"],
    assessActions: ["Cause-of-CKD workup", "Med review for nephrotoxins", "Vaccination + bone-mineral assessment"],
    assessSources: ["Lab elements", "Pharmacy.Generic Medication Name"],
    assessExit: ["Stage + cause documented"],
    planActions: ["RAAS optimization", "SGLT2i / finerenone where eligible", "Dietary plan"],
    planSources: ["Pharmacy.Prescription Order ID"],
    planExit: ["Plan signed"],
    interveneActions: ["Dispense + titrate", "Avoid nephrotoxin counselling", "Vaccinations"],
    interveneSources: ["Pharmacy.Dispensed elements", "Immunization"],
    interveneExit: ["Bundle delivered"],
    monitorActions: ["Quarterly eGFR/ACR/K⁺", "Hospitalization & AKI alerts"],
    monitorSources: ["Lab", "Inpatient.Admission Date Time"],
    monitorExit: ["Stable or escalate"],
    escalateActions: ["Nephrology", "RRT counselling at eGFR < 20", "Avoid crash dialysis"],
    escalateSources: ["Dialysis elements"],
    escalateExit: ["Modality decision documented"],
    outcomeActions: ["eGFR slope, AKI rate, crash starts, mortality"],
    outcomeSources: ["All upstream"],
    outcomeExit: ["Annual review filed"],
  }),
  samplePatient: {
    id: "P-067210",
    name: "Faisal R. (anonymized)",
    age: 66,
    sex: "Male",
    problemList: ["CKD stage 3b (N18.32)", "T2DM (E11)", "Hypertension (I10)"],
    riskTier: "High",
    intake: [
      { label: "eGFR", value: "38 mL/min/1.73m²" },
      { label: "ACR", value: "412 mg/g" },
      { label: "BP", value: "146 / 88 mmHg" },
      { label: "K⁺", value: "4.9 mmol/L" },
      { label: "HbA1c", value: "7.6 %" },
    ],
    steps: [
      { day: 0, stageId: "identify", what: "Lab-driven flag: persistent eGFR 38 + ACR 412.", data: "Lab.Result Value" },
      { day: 4, stageId: "engage", what: "Enrolled; renal RD booked.", data: "Patient Profile · Mawid" },
      { day: 14, stageId: "assess", what: "Med review: ibuprofen stopped. Vacc updated.", data: "Pharmacy + Immunization" },
      { day: 16, stageId: "plan", what: "Switch ARB to losartan 100 mg; add empagliflozin; finerenone eligibility check.", data: "Pharmacy.Prescription Order ID" },
      { day: 30, stageId: "monitor", what: "K⁺ 5.0; eGFR stable 36; BP 132/78.", data: "Lab + Vitals" },
      { day: 365, stageId: "outcomes", what: "ACR 180 mg/g (−56%). eGFR slope −1.2 mL/min/yr.", data: "Lab" },
    ],
  },
};

export const CARE_PLANS: CarePlan[] = [t2dm, htn, hf, copd, ckd];
export const DEFAULT_CARE_PLAN_ID = t2dm.id;
