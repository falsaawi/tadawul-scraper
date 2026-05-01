// Executive Word document — Two-Environment AI Architecture
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TabStopType, TabStopPosition,
  PageOrientation, TableOfContents
} = require("docx");

// ---- Palette (hex, no #) ----
const C = {
  navy:    "0B1F3A",
  navyDim: "1E3A5F",
  gold:    "C9A646",
  goldLt:  "F4E8C2",
  ink:     "1A1F2E",
  inkSoft: "3A4358",
  muted:   "5A6374",
  line:    "D4DAE2",
  bg:      "F5F7FA",
  openBg:  "DBEAFE",
  openInk: "1E3A8A",
  openLn:  "3B82F6",
  closedBg:"D1FAE5",
  closedInk:"065F46",
  closedLn:"10B981",
  gateBg:  "FEF3C7",
  gateInk: "78350F",
  gateLn:  "B45309",
  dangerBg:"FEE2E2",
  dangerInk:"7F1D1D",
  indigoBg:"E0E7FF",
  indigoInk:"3730A3",
};

// ---- Border helpers ----
const singleB = (color = C.line, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const noneB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const cellBorders = (color = C.line, size = 4) => ({
  top: singleB(color, size), bottom: singleB(color, size),
  left: singleB(color, size), right: singleB(color, size),
});

// ---- Text helpers ----
const T = (text, opts = {}) => new TextRun({
  text, font: opts.font || "Calibri", size: opts.size || 22,
  color: opts.color || C.ink, bold: opts.bold || false, italics: opts.italics || false,
  break: opts.break || 0,
});

const P = (runs, opts = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [runs],
  alignment: opts.alignment, spacing: opts.spacing,
  shading: opts.shading, indent: opts.indent, border: opts.border,
  heading: opts.heading, pageBreakBefore: opts.pageBreakBefore,
  numbering: opts.numbering, tabStops: opts.tabStops,
});

// Heading style helpers
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 180 },
  children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: C.navy })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 260, after: 120 },
  children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: C.navy })],
});
const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 80 },
  children: [new TextRun({ text, font: "Calibri", size: 24, bold: true, color: C.navyDim })],
});

const Body = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 300 },
  alignment: opts.alignment || AlignmentType.LEFT,
  children: [new TextRun({ text, font: "Calibri", size: 22, color: C.inkSoft })],
});

const Eyebrow = (text) => new Paragraph({
  spacing: { after: 60 },
  children: [new TextRun({
    text: text.toUpperCase(), font: "Calibri", size: 18, bold: true,
    color: C.navyDim, characterSpacing: 40,
  })],
});

const BulletP = (text, level = 0) => new Paragraph({
  spacing: { after: 60, line: 280 },
  numbering: { reference: "bullets", level },
  children: [new TextRun({ text, font: "Calibri", size: 22, color: C.inkSoft })],
});

const Blank = (size = 120) => new Paragraph({ spacing: { after: size }, children: [new TextRun({ text: "" })] });

// ---- Table cell helper ----
function cell(text, opts = {}) {
  const runs = (Array.isArray(text) ? text : [text]).map(t => {
    if (typeof t === "string") {
      return new TextRun({
        text: t, font: "Calibri", size: opts.size || 20,
        color: opts.color || C.ink, bold: opts.bold || false,
      });
    }
    return t;
  });
  return new TableCell({
    borders: cellBorders(opts.borderColor || C.line, 4),
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      spacing: { after: 0, line: 260 },
      children: runs,
    })],
  });
}

// Title-row cell (navy header)
const headCell = (text, width) => cell(text, {
  fill: C.navy, color: "FFFFFF", bold: true, size: 20, width, borderColor: C.navy,
});

// ----- Decorative heading bar (colored shading)
function sectionHeader(eyebrow, title) {
  // Use a simple approach: eyebrow paragraph + large title with bottom border
  return [
    Eyebrow(eyebrow),
    new Paragraph({
      spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.gold, space: 4 } },
      children: [new TextRun({ text: title, font: "Calibri", size: 34, bold: true, color: C.navy })],
    }),
  ];
}

// ----- Callout box (as a single-cell table with colored bg)
function callout(title, body, opts = {}) {
  const fill  = opts.fill  || C.gateBg;
  const ink   = opts.ink   || C.gateInk;
  const line  = opts.line  || C.gateLn;

  const headRun = new TextRun({ text: title, font: "Calibri", size: 22, bold: true, color: ink });
  const bodyRun = new TextRun({ text: body,  font: "Calibri", size: 20, color: ink });

  const c = new TableCell({
    borders: cellBorders(line, 8),
    shading: { fill, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 180, bottom: 180, left: 200, right: 200 },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [headRun] }),
      new Paragraph({ spacing: { after: 0, line: 280 }, children: [bodyRun] }),
    ],
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [c] })],
  });
}

// ----- Tile (for layouts in prose — 2-col table of mini-cards)
function tileTable(items, cols = 2) {
  const rows = [];
  const cellWidth = Math.floor(9360 / cols);
  for (let i = 0; i < items.length; i += cols) {
    const rowCells = [];
    for (let j = 0; j < cols; j++) {
      const it = items[i + j];
      if (!it) {
        rowCells.push(new TableCell({
          borders: cellBorders("FFFFFF", 0),
          width: { size: cellWidth, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "" })] })],
        }));
        continue;
      }
      const titleRun = new TextRun({ text: it.t, font: "Calibri", size: 22, bold: true, color: C.navy });
      const bodyRun  = new TextRun({ text: it.d, font: "Calibri", size: 20, color: C.inkSoft });
      const numRun = it.n
        ? new TextRun({ text: it.n, font: "Calibri", size: 22, bold: true, color: C.gold })
        : null;
      const firstChildren = numRun ? [numRun, new TextRun({ text: "   " }), titleRun] : [titleRun];
      rowCells.push(new TableCell({
        borders: cellBorders(C.line, 4),
        shading: { fill: "FFFFFF", type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 180, bottom: 180, left: 200, right: 200 },
        width: { size: cellWidth, type: WidthType.DXA },
        children: [
          new Paragraph({ spacing: { after: 80 }, children: firstChildren }),
          new Paragraph({ spacing: { after: 0, line: 280 }, children: [bodyRun] }),
        ],
      }));
    }
    rows.push(new TableRow({ children: rowCells }));
  }
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array.from({length: cols}, () => cellWidth),
    rows,
  });
}

// ===================================================================
// BUILD CONTENT
// ===================================================================

// ---- Cover page ----
const coverChildren = [
  new Paragraph({
    spacing: { before: 2000, after: 120 },
    children: [new TextRun({ text: "EXECUTIVE REFERENCE DESIGN", font: "Calibri", size: 22, bold: true, color: C.gold, characterSpacing: 80 })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.gold, space: 6 } },
    children: [new TextRun({ text: "Two-Environment AI Architecture", font: "Calibri", size: 60, bold: true, color: C.navy })],
  }),
  new Paragraph({
    spacing: { after: 600 },
    children: [new TextRun({ text: "A secure, on-premises design for government data & analytics", font: "Calibri", size: 28, color: C.navyDim })],
  }),
  Blank(400),
  // three short pillars
  tileTable([
    { t: "Open (Connected)",    d: "Intake · Enrichment · Frontier LLMs used under policy." },
    { t: "Governed Gateway",    d: "One-way transfer · Dual approval · Immutable audit." },
    { t: "Air-Gapped (Closed)", d: "Local LLMs · Protected analytics · Decision support." },
  ], 3),
  Blank(800),
  new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: "Prepared by the Data & Analytics Function", font: "Calibri", size: 20, color: C.muted })],
  }),
  new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: "Version 1.0", font: "Calibri", size: 20, color: C.muted })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---- Table of Contents ----
const tocChildren = [
  ...sectionHeader("Contents", "Document Outline"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---- Section 1: Executive Summary ----
const sec1 = [
  ...sectionHeader("Section 1 · Executive Summary", "What this architecture enables"),
  Body("A secure, on-premises AI platform that collects external information, receives controlled internal submissions, uses frontier LLMs where policy allows, transfers approved artifacts into an air-gapped environment, and delivers trusted analytics and local AI with auditable human accountability end-to-end."),
  Blank(160),
  tileTable([
    { n: "2",     t: "Environments",    d: "Open (connected) and air-gapped — both on-prem." },
    { n: "1-way", t: "Trust Boundary",  d: "Data flows open → closed only, via a governed gateway." },
    { n: "2",     t: "AI Stacks",       d: "Frontier LLMs (open) + local open-source (closed)." },
    { n: "C0–C4", t: "Data Classes",    d: "Five labels drive where data lives and who can use it." },
  ], 2),
  Blank(220),
  callout(
    "The Ask",
    "Approve the two-environment trust model, the Policy Gate for internal submissions, the cross-domain gateway design, and the phased implementation roadmap.",
    { fill: C.navy, ink: "F4E8C2", line: C.gold }
  ),
  Blank(200),
];

// ---- Section 2: Context / Constraints ----
const sec2 = [
  ...sectionHeader("Section 2 · Context", "Five constraints that shape the design"),
  tileTable([
    { n:"1.", t:"Two on-prem environments",  d:"Open (internet-connected) and closed (air-gapped, local network only)." },
    { n:"2.", t:"Managed by IT",             d:"The Data & Analytics function delivers the service on infrastructure operated by IT." },
    { n:"3.", t:"Two information sources",   d:"Open-source feeds and internal team submissions — both initially collected in the open environment." },
    { n:"4.", t:"Secure transfer required",  d:"Approved artifacts move from open to closed through a governed, auditable path." },
    { n:"5.", t:"Split AI stacks",           d:"Frontier LLMs allowed only in the open environment; local open-source LLMs only in the closed environment." },
  ], 1),
];

// ---- Section 3: Principles ----
const principles = [
  { t:"Trust-boundary-first design",          d:"Separation is driven by risk and data trust, not only by network topology." },
  { t:"Data sensitivity determines environment", d:"Sensitivity class drives where data may live and who may process it." },
  { t:"Least movement of sensitive data",     d:"Only approved datasets cross environments; every movement is logged and justified." },
  { t:"Open is not the system of record",     d:"It is a staging, enrichment, and packaging zone — authoritative data lives on the closed side." },
  { t:"Public LLMs are bounded tools",        d:"Used for extraction, classification, translation, summarization — never authoritative decisions." },
  { t:"Local LLMs are enterprise-anchored",   d:"Paired with retrieval, policy grounding, evaluation, and strong audit trails." },
  { t:"Human-in-the-loop for high-impact outputs", d:"No sensitive output leaves the loop without accountable human review." },
  { t:"Deterministic, auditable transfers",   d:"Every artifact is classified, scanned, hashed, signed, dual-approved, logged on both sides." },
  { t:"Defense in depth",                     d:"Each layer has independent controls: network, identity, data, model, application." },
  { t:"Offline-first on the closed side",     d:"Models, packages, updates arrive as signed offline bundles through the governed path." },
  { t:"Separation of duties",                 d:"IT operates infrastructure; Data runs the service; Security governs policy and controls." },
  { t:"Immutable raw, versioned derivatives", d:"Raw landing is write-once; curated and gold layers are versioned and reproducible." },
];
const sec3 = [
  ...sectionHeader("Section 3 · Design Principles", "Twelve principles that shape every decision"),
  Body("Principles come first — technology follows. These guide architecture, operating model, and policy in both environments."),
  Blank(120),
  tileTable(principles.map((p, i) => ({ n: String(i+1).padStart(2,"0"), t: p.t, d: p.d })), 2),
];

// ---- Section 4: Data Classification ----
const classHead = ["Class", "Label", "Allowed environments", "Frontier LLMs", "Example"];
const classRows = [
  ["C0", "Public",                         "Open + Closed",                "Allowed",     "News articles, published open data"],
  ["C1", "Internal-Open (non-sensitive)",  "Open + Closed",                "With review", "Non-sensitive indicators derived from open data"],
  ["C2", "Internal",                       "Closed only",                  "Blocked",     "Operational reports, internal statistics"],
  ["C3", "Sensitive",                      "Closed only (restricted)",     "Blocked",     "Personal data, case files"],
  ["C4", "Highly Sensitive",               "Closed only (enclave)",        "Blocked",     "Classified or legally held material"],
];
const classColW = [800, 2200, 2600, 1560, 2200];
const classTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: classColW,
  rows: [
    new TableRow({ tableHeader: true, children: classHead.map((h, i) => headCell(h, classColW[i])) }),
    ...classRows.map((row, ri) => new TableRow({
      children: row.map((c, ci) => {
        const opt = { width: classColW[ci], size: 20 };
        if (ri % 2 === 1) opt.fill = "F1F4F9";
        if (ci === 0) { opt.bold = true; opt.color = C.navy; }
        if (ci === 3) {
          if (c === "Allowed" || c === "With review") { opt.color = C.closedInk; opt.bold = true; }
          if (c === "Blocked") { opt.color = C.dangerInk; opt.bold = true; }
        }
        return cell(c, opt);
      }),
    })),
  ],
});
const sec4 = [
  ...sectionHeader("Section 4 · Data Classification", "Five classes govern where data can live"),
  Body("Every dataset, document, prompt, and model artifact carries a sensitivity label. The label determines where it can live, which LLMs may see it, and who can access it."),
  Blank(140),
  classTable,
  Blank(200),
  callout(
    "Enforcement points",
    "Labels are assigned at ingestion, enforced at the Policy Gate, re-enforced at the LLM Gateway, re-checked by the Transfer Gateway, and applied again at query-time on the closed side.",
    { fill: C.gateBg, ink: C.gateInk, line: C.gateLn }
  ),
];

// ---- Section 5: Architecture at a Glance ----
// We'll describe each zone in prose and use a mini 'map' via a 5-col table.
function envStrip(title, subtitle, blocks, fill, ink, ln) {
  const headCells = blocks.map(() => ({
    fill, ink, ln
  }));
  const cellWidth = Math.floor(9360 / blocks.length);
  const row = new TableRow({
    children: blocks.map((b, i) => new TableCell({
      borders: cellBorders(ln, 6),
      shading: { fill, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 160, bottom: 160, left: 140, right: 140 },
      width: { size: cellWidth, type: WidthType.DXA },
      children: [
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: b.t, font: "Calibri", size: 20, bold: true, color: ink })],
        }),
        new Paragraph({
          spacing: { after: 0, line: 260 },
          children: [new TextRun({ text: b.d, font: "Calibri", size: 18, color: ink })],
        }),
      ],
    })),
  });
  return [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, font: "Calibri", size: 22, bold: true, color: ink })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: subtitle, font: "Calibri", size: 18, color: ink })] }),
    new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: Array.from({length: blocks.length}, () => cellWidth), rows: [row] }),
  ];
}

const openBlocks = [
  { t:"Sources",          d:"Open-source & internal submissions" },
  { t:"Policy Gate",      d:"Classify · Authenticate · Route (3 paths)" },
  { t:"Raw & Prepared",   d:"Immutable raw · Curated · Catalog" },
  { t:"AI Utility",       d:"LLM Gateway · Gemini / Claude / GPT" },
  { t:"Transfer Staging", d:"DLP · AV · Sign · Dual approval" },
];
const closedBlocks = [
  { t:"Secure Landing",     d:"Decrypt · Verify · Quarantine" },
  { t:"Internal Sources",   d:"Core DBs · Files · Documents" },
  { t:"Trusted Data",       d:"Lakehouse · Catalog · Lineage" },
  { t:"Local AI Services",  d:"Open-source LLMs · RAG · Vector DB" },
  { t:"Delivery Channels",  d:"Dashboards · Analyst workbench" },
];

const sec5 = [
  ...sectionHeader("Section 5 · Architecture at a Glance", "The full picture in one view"),
  Body("Two environments under one governance umbrella, joined by a secure one-way gateway. The open side prepares and filters; the closed side integrates, analyzes, and delivers protected outputs."),
  Blank(140),
  ...envStrip(
    "OPEN ENVIRONMENT · Connected · On-Prem",
    "Controlled staging · External-AI enablement · Intake of open-source & internal submissions",
    openBlocks, C.openBg, C.openInk, C.openLn
  ),
  Blank(180),
  callout(
    "Secure Cross-Domain Gateway · One-way (open → closed)",
    "Data diode · Protocol break · Re-inspection · Signature verify · Quarantine · Dual approve · Immutable audit log.",
    { fill: C.gateBg, ink: C.gateInk, line: C.gateLn }
  ),
  Blank(180),
  ...envStrip(
    "AIR-GAPPED ENVIRONMENT · Local Network Only · On-Prem",
    "Trusted enterprise data foundation · Local AI · Protected analytics & decision support",
    closedBlocks, C.closedBg, C.closedInk, C.closedLn
  ),
];

// ---- Section 6: Open Environment ----
const openCaps = [
  { t:"Source Ingestion",         d:"Web & API collectors, RSS/feed pullers, file intake, authenticated submission endpoints, source registration, scheduling." },
  { t:"Policy Gate (critical)",   d:"Classifies every record on arrival, authenticates submitter, tags purpose, and routes to one of three paths." },
  { t:"Raw Landing",              d:"Near-immutable storage with timestamps, hashes, source IDs, and full collection metadata. Write-once retention window." },
  { t:"Data Preparation",         d:"Validation, standardization, schema mapping, deduplication, classification refinement, redaction, metadata tagging." },
  { t:"Open AI Utility Layer",    d:"Gateway-based access to Gemini, Claude, GPT — for approved tasks only, on C0 / C1 data only." },
  { t:"Human Review & Release",   d:"Data stewardship, exception handling, quality acceptance, transfer authorization, dual-control sign-off." },
  { t:"Transfer Staging Vault",   d:"Encrypted packaging with manifests, approvals, checksums, digital signatures, and full lineage." },
];
const sec6 = [
  ...sectionHeader("Section 6 · Open Environment", "Controlled staging & external-AI enablement"),
  Body("On-premises but internet-connected. Operated as a controlled staging and external-AI enablement platform — not an authoritative analytics platform. Internally segmented so that collection, preparation, AI use, and transfer packaging each sit in their own segment."),
  Blank(120),
  tileTable(openCaps, 2),
];

// ---- Section 7: Policy Gate ----
const sec7 = [
  ...sectionHeader("Section 7 · Critical Control", "The Policy Gate — one decision, three paths"),
  Body("Because internal team submissions are collected inside the connected environment, the Policy Gate is the single most important control on the open side. Every submission is classified and routed to exactly one of three paths."),
  Blank(140),
  tileTable([
    { t: "Path A · LLM-Eligible",    d: "C0 / C1 only. Preparation + frontier-LLM enrichment allowed via the LLM Gateway. Gemini / Claude / GPT usage permitted." },
    { t: "Path B · Prep-Only",       d: "C2 and above. Preparation only; external AI is never applied to these records. Protected all the way to the gateway." },
    { t: "Path C · Direct Transfer", d: "Pre-approved sensitive items. Minimal preparation; sealed and queued for transfer to the closed environment immediately." },
  ], 1),
  Blank(200),
  callout(
    "Hard rules at the gate",
    "Unauthenticated submissions are rejected. Unclassified items are quarantined. Anything labeled C2+ is never sent down Path A. Every routing decision is logged with submitter, timestamp, label, and policy version.",
    { fill: C.gateBg, ink: C.gateInk, line: C.gateLn }
  ),
];

// ---- Section 8: Cross-Domain Gateway ----
const gatewaySteps = [
  ["1", "Classification check",              "Hard-reject C2+"],
  ["2", "DLP scan",                          "PII, secrets, keys, regulated patterns"],
  ["3", "Malware / AV scan",                 "Multiple engines"],
  ["4", "Schema & format validation",        "Enforce allowed formats"],
  ["5", "Manifest + SHA-256 + signature",    "Integrity proof"],
  ["6", "Dual human approver",               "Separation of duties"],
  ["7", "Hardware data diode",               "One-way physical link"],
  ["8", "Protocol break & re-inspection",    "Signature verify · Quarantine on closed side"],
];
const gwColW = [700, 3700, 4960];
const gatewayTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: gwColW,
  rows: [
    new TableRow({ tableHeader: true, children: ["#", "Step", "What it does"].map((h, i) => headCell(h, gwColW[i])) }),
    ...gatewaySteps.map((row, ri) => new TableRow({
      children: row.map((c, ci) => {
        const opt = { width: gwColW[ci], size: 20 };
        if (ri % 2 === 1) opt.fill = "F1F4F9";
        if (ci === 0) { opt.bold = true; opt.color = C.navy; opt.align = AlignmentType.CENTER; }
        if (ci === 1) { opt.bold = true; opt.color = C.navy; }
        return cell(c, opt);
      }),
    })),
  ],
});

const cadenceColW = [3800, 2800, 2760];
const cadenceTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: cadenceColW,
  rows: [
    new TableRow({ tableHeader: true, children: ["Artifact", "Cadence", "Approval"].map((h, i) => headCell(h, cadenceColW[i])) }),
    ...[
      ["Curated open-source datasets", "Daily batch",     "Policy-automatic"],
      ["LLM-enriched derivatives",     "Daily batch",     "Policy-automatic"],
      ["Internal submissions",         "As received",     "Steward sign-off"],
      ["Model weights (open-source LLMs)", "On release",  "Dual human approval"],
      ["OS / dependency updates",      "Weekly",          "Dual human approval"],
    ].map((row, ri) => new TableRow({
      children: row.map((c, ci) => {
        const opt = { width: cadenceColW[ci], size: 20 };
        if (ri % 2 === 1) opt.fill = "F1F4F9";
        if (ci === 0) { opt.bold = true; opt.color = C.navy; }
        return cell(c, opt);
      }),
    })),
  ],
});

const sec8 = [
  ...sectionHeader("Section 8 · Cross-Domain Gateway", "A governed path — not a network link"),
  Body("The bridge is the single most security-critical component. It is not a normal network link. Every artifact is classified, scanned, hashed, signed, and dual-approved before it reaches the closed side."),
  Blank(120),
  H3("Eight-step inspection pipeline"),
  gatewayTable,
  Blank(220),
  H3("Transfer cadence"),
  cadenceTable,
  Blank(220),
  H3("What never crosses"),
  BulletP("Live network connections, remote shells, reverse proxies"),
  BulletP("Secrets, credentials, or tokens from the open side"),
  BulletP("User sessions, identities, or federation assertions"),
  BulletP("Any artifact labeled C2 or above (rejected at step 1)"),
  BulletP("Anything missing a valid, signed manifest"),
];

// ---- Section 9: Closed Environment ----
const closedCaps = [
  { t:"Secure Landing & Import Control", d:"Decrypt, verify signature and manifest, re-scan, quarantine on anomaly, register imports, release to trusted storage." },
  { t:"Trusted Data Foundation",         d:"Internal operational data, imported approved external data, master data, historical snapshots, protected document stores." },
  { t:"Analytic Storage",                d:"Lakehouse zones (Raw / Curated / Gold / Semantic), subject marts, feature store, data products." },
  { t:"Local AI Services",               d:"Open-source LLM serving, embeddings, rerankers, retrieval, orchestration, guardrails, evaluation, fine-tuning." },
  { t:"Delivery Channels",               d:"Dashboards, reports, analyst workbenches, search assistants, investigation tools, decision-support apps." },
  { t:"Policy-Aware Access",             d:"Row / column policies tied to data class × user clearance × purpose, enforced on every query path." },
];
const sec9 = [
  ...sectionHeader("Section 9 · Air-Gapped Environment", "The trusted enterprise analysis zone"),
  Body("On-prem, local-network-only. The trusted enterprise data foundation and the protected analysis zone. Combines approved imported data with enterprise internal sources of record and delivers analytics, dashboards, and local AI applications."),
  Blank(120),
  tileTable(closedCaps, 2),
];

// ---- Section 10: Two AI Stacks ----
const sec10 = [
  ...sectionHeader("Section 10 · AI / LLM Layer", "Two distinct AI stacks — by design"),
  Body("Frontier LLMs enrich open-source material in the connected environment; local open-source LLMs produce authoritative outputs inside the air-gapped environment. Neither crosses the boundary."),
  Blank(140),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders(C.openLn, 6),
            shading: { fill: C.openBg, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            width: { size: 4680, type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Open Side · Frontier LLM Layer", font: "Calibri", size: 24, bold: true, color: C.openInk })] }),
              ...[
                "LLM Gateway routes Gemini / Claude / GPT.",
                "Credentials held only in the gateway — never in user code.",
                "Per-team quotas and cost caps.",
                "Prompts and responses logged (secrets redacted).",
                "Class enforcement — C0 / C1 only.",
                "Evaluation harness gates prompt / model changes.",
                "Bounded tasks — extract · classify · translate · summarize.",
              ].map(t => new Paragraph({
                spacing: { after: 60, line: 280 },
                numbering: { reference: "bullets", level: 0 },
                children: [new TextRun({ text: t, font: "Calibri", size: 20, color: C.openInk })],
              })),
            ],
          }),
          new TableCell({
            borders: cellBorders(C.closedLn, 6),
            shading: { fill: C.closedBg, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            width: { size: 4680, type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Closed Side · Local LLM Platform", font: "Calibri", size: 24, bold: true, color: C.closedInk })] }),
              ...[
                "GPU cluster for inference (vLLM / TGI / Triton).",
                "Open-source models (Llama / Qwen / Mistral family).",
                "Embeddings, rerankers, vector DB (pgvector / Milvus / Qdrant).",
                "RAG: retrieve → rerank → filter by clearance → generate.",
                "Agent framework — tools restricted to internal APIs.",
                "Fine-tuning (LoRA / QLoRA) — weights stay inside.",
                "Model registry with signed weights & provenance.",
              ].map(t => new Paragraph({
                spacing: { after: 60, line: 280 },
                numbering: { reference: "bullets", level: 0 },
                children: [new TextRun({ text: t, font: "Calibri", size: 20, color: C.closedInk })],
              })),
            ],
          }),
        ],
      }),
    ],
  }),
];

// ---- Section 11: Use-Case Routing ----
const routHead = ["Dimension", "Open Environment", "Closed Environment"];
const routRows = [
  ["Typical data class",  "C0 / C1",                                      "C2 / C3 / C4 (and any combination)"],
  ["Typical AI use",      "Extraction · translation · summarization · classification", "RAG · analyst copilots · private search · decision support"],
  ["Business outcome",    "Preparation & enrichment",                     "Integrated analysis & official consumption"],
  ["Model type",          "Public LLMs via gateway",                      "Local open-source / self-hosted LLMs"],
  ["Human review",        "Required before transfer",                     "Required for high-impact decisions"],
  ["Data residency",      "Non-authoritative staging",                    "Authoritative system of record"],
];
const routColW = [2600, 3380, 3380];
const routTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: routColW,
  rows: [
    new TableRow({ tableHeader: true, children: routHead.map((h, i) => headCell(h, routColW[i])) }),
    ...routRows.map((row, ri) => new TableRow({
      children: row.map((c, ci) => {
        const opt = { width: routColW[ci], size: 20 };
        if (ri % 2 === 1) opt.fill = "F1F4F9";
        if (ci === 0) { opt.bold = true; opt.color = C.navy; }
        if (ci === 1) { opt.color = C.openInk; }
        if (ci === 2) { opt.color = C.closedInk; }
        return cell(c, opt);
      }),
    })),
  ],
});
const sec11 = [
  ...sectionHeader("Section 11 · Use-Case Routing", "A simple rule for where each use case belongs"),
  Body("Use cases are routed by data sensitivity, need for enterprise context, and intended business outcome. This keeps protected analysis inside the air-gapped zone and prevents accidental misuse of public LLMs."),
  Blank(140),
  routTable,
  Blank(220),
  callout(
    "Practical routing rule",
    "If a use case needs internal protected data, combines internal and external information, or supports an official decision, it belongs in the closed environment — even if some preparation steps happened earlier in the open environment.",
    { fill: C.navy, ink: "F4E8C2", line: C.gold }
  ),
];

// ---- Section 12: End-to-End Flow ----
const flowSteps = [
  { t: "Collect",              d: "Open-source data and authenticated team submissions enter the open environment." },
  { t: "Classify & route",     d: "Policy Gate labels every item and routes it to LLM-eligible, prep-only, or direct-transfer." },
  { t: "Validate & standardize", d: "Schema, quality, and policy checks; deduplication and metadata tagging." },
  { t: "Enrich with frontier LLMs", d: "Only on allowed classes (C0 / C1). Prompts and responses logged. Bounded tasks only." },
  { t: "Approve & package",    d: "Steward + security approve; package with manifest, checksums, digital signatures." },
  { t: "Transfer",             d: "Cross-domain gateway performs re-inspection and quarantines anomalies." },
  { t: "Import & integrate",   d: "Closed side verifies signatures and integrates with internal systems of record." },
  { t: "Analyze with local AI",d: "Local LLMs and RAG produce protected, clearance-aware insights with citations." },
  { t: "Deliver decisions",    d: "Dashboards, reports, analyst workbench — with human sign-off on high-impact outputs." },
];
const sec12 = [
  ...sectionHeader("Section 12 · End-to-End Flow", "From collection to decision support"),
  Body("Every step emits metadata and audit records; lineage is preserved end-to-end."),
  Blank(120),
  tileTable(flowSteps.map((s, i) => ({ n: String(i+1).padStart(2,"0"), t: s.t, d: s.d })), 1),
];

// ---- Section 13: Governance ----
const raciHead = ["Activity", "Data", "IT", "Security", "Steering"];
const raciRows = [
  ["Infra provisioning (both envs)",  "C",   "R/A", "C",   "I"],
  ["Network & firewall rules",        "C",   "R/A", "C",   "I"],
  ["Cross-domain gateway operations", "C",   "R",   "A",   "I"],
  ["Data ingestion pipelines",        "R/A", "C",   "C",   "I"],
  ["Data classification policy",      "C",   "C",   "R",   "A"],
  ["LLM selection & evaluations",     "R/A", "C",   "C",   "I"],
  ["Model promotion to production",   "R",   "C",   "C",   "A"],
  ["Incident response",               "C",   "R",   "R/A", "I"],
  ["Access reviews",                  "C",   "R",   "R/A", "I"],
];
const raciColW = [4160, 1300, 1300, 1300, 1300];
const raciTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: raciColW,
  rows: [
    new TableRow({ tableHeader: true, children: raciHead.map((h, i) => headCell(h, raciColW[i])) }),
    ...raciRows.map((row, ri) => new TableRow({
      children: row.map((c, ci) => {
        const opt = { width: raciColW[ci], size: 20 };
        if (ri % 2 === 1) opt.fill = "F1F4F9";
        if (ci === 0) { opt.bold = true; opt.color = C.navy; }
        else opt.align = AlignmentType.CENTER;
        return cell(c, opt);
      }),
    })),
  ],
});
const sec13 = [
  ...sectionHeader("Section 13 · Governance", "Clear ownership across four roles"),
  Body("IT operates the infrastructure; the Data & Analytics function delivers the service; Information Security governs policy and controls; business owners steer use cases and accept high-impact outputs."),
  Blank(120),
  tileTable([
    { t: "IT Function",         d: "Infrastructure, compute, storage, segmentation, transfer mechanisms, patching, backups, baseline monitoring." },
    { t: "Data & Analytics",    d: "Pipelines, metadata, data quality, prompt patterns, AI use cases, semantic models, business delivery." },
    { t: "Information Security",d: "Classification policy, public-LLM guardrails, transfer controls, risk review, audit requirements." },
    { t: "Business Owners",     d: "Use-case prioritization, acceptance criteria, human approval of high-impact outputs." },
  ], 2),
  Blank(220),
  H3("RACI · Key activities"),
  raciTable,
];

// ---- Section 14: Roadmap ----
const phaseRows = [
  ["0 · Foundations",        "0–2 mo",  "Governance & RACI · environments provisioned · gateway installed · landing zones."],
  ["1 · Open-Side MVP",      "2–4 mo",  "2–3 feeds end-to-end · Policy Gate live (3 paths) · LLM Gateway live · first transfers running · audit pipelines."],
  ["2 · Closed-Side MVP",    "4–7 mo",  "Lakehouse & catalog · internal source connectors · local LLM stack · Analyst Workbench pilot · first integrated use case."],
  ["3 · Industrialize & Scale","7–12 mo","Domain fine-tuned models · expanded sources · full observability · pen test · DR drills · enterprise-wide adoption."],
];
const phaseColW = [2400, 1400, 5560];
const phaseTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: phaseColW,
  rows: [
    new TableRow({ tableHeader: true, children: ["Phase", "Timeline", "Target outcomes"].map((h, i) => headCell(h, phaseColW[i])) }),
    ...phaseRows.map((row, ri) => new TableRow({
      children: row.map((c, ci) => {
        const opt = { width: phaseColW[ci], size: 20 };
        if (ri % 2 === 1) opt.fill = "F1F4F9";
        if (ci === 0) { opt.bold = true; opt.color = C.navy; }
        if (ci === 1) { opt.bold = true; opt.color = C.gateInk; opt.align = AlignmentType.CENTER; }
        return cell(c, opt);
      }),
    })),
  ],
});
const sec14 = [
  ...sectionHeader("Section 14 · Implementation Roadmap", "Phased delivery over 12+ months"),
  Body("Each phase builds on the previous; delivery is incremental, with value at the end of each phase."),
  Blank(120),
  phaseTable,
];

// ---- Section 15: Approvals ----
const approvals = [
  { t: "Two-environment trust model",      d: "Adopt the open + air-gapped pattern with a one-way transfer path between them." },
  { t: "Public LLM scope",                 d: "Restrict frontier LLM use to the open environment and only for allowed data classes (C0 / C1)." },
  { t: "Policy Gate for internal submissions", d: "Adopt the three-path routing model as the critical open-side control." },
  { t: "Closed-side authoritative outputs", d: "Protected analytics and official decision support execute inside the air-gapped environment." },
  { t: "Data classification taxonomy (C0–C4)", d: "Adopt the five-class model and its enforcement points across the pipeline." },
  { t: "Ownership split (RACI)",           d: "Confirm the split across IT, Data & Analytics, Information Security, and Business Owners." },
  { t: "Cross-domain gateway design",      d: "Endorse the one-way gateway with classification, DLP/AV, manifest, dual approval, and re-inspection." },
  { t: "Phased roadmap & funding",         d: "Approve the four-phase delivery plan and the associated funding profile." },
];
const sec15 = [
  ...sectionHeader("Section 15 · Decision Points", "What leadership is asked to approve"),
  Body("These approvals unlock design finalization, procurement, and implementation."),
  Blank(120),
  tileTable(approvals.map((a, i) => ({ n: "✓", t: a.t, d: a.d })), 2),
];

// ---- Section 16: Reference Design Statement ----
const sec16 = [
  ...sectionHeader("Section 16 · Reference Design Statement", "A secure two-environment AI architecture"),
  Body("The agency will implement a two-environment on-premises AI architecture composed of an internet-connected controlled environment and an air-gapped protected environment. The connected environment supports external data acquisition, designated internal intake through a policy gate, preprocessing, and approved use of public LLM services for bounded low-risk tasks. The air-gapped environment hosts the trusted enterprise data foundation, local AI services, semantic retrieval, analytics workloads, and protected decision-support applications. Movement from open to closed occurs only through a secure, governed, one-way transfer path with classification, DLP, AV, integrity, approval, and audit controls."),
  Blank(140),
  Body("IT owns infrastructure; the Data & Analytics function owns the service and use cases; Information Security governs classification, guardrails, and cross-domain controls; business owners govern use-case prioritization and human accountability."),
  Blank(200),
  tileTable([
    { t: "Secure",      d: "One-way, governed transfer with dual control and immutable audit." },
    { t: "Sovereign",   d: "All reasoning on sensitive data stays on-premises." },
    { t: "Accountable", d: "Human-in-the-loop for every high-impact output." },
  ], 3),
];

// Assemble the whole document
const body = [
  ...coverChildren,
  ...tocChildren,
  ...sec1,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec2,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec3,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec4,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec5,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec6,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec7,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec8,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec9,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec10,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec11,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec12,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec13,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec14,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec15,
  new Paragraph({ children: [new PageBreak()] }),
  ...sec16,
];

// ---- Page header/footer ----
const pageHeader = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.gold, space: 4 } },
    children: [new TextRun({ text: "Two-Environment AI Architecture · Executive Reference Design", font: "Calibri", size: 18, color: C.navyDim })],
  })]
});
const pageFooter = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: "Data & Analytics Function · v1.0", font: "Calibri", size: 18, color: C.muted }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: "Page ", font: "Calibri", size: 18, color: C.muted }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: C.muted }),
      new TextRun({ text: " of ", font: "Calibri", size: 18, color: C.muted }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: C.muted }),
    ],
  })]
});

// ---- Document ----
const doc = new Document({
  creator: "Data & Analytics Function",
  title: "Two-Environment AI Architecture — Reference Design",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Calibri", color: C.navy },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: C.navy },
        paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: C.navyDim },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 480, hanging: 240 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 240 } } } },
        ]},
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: { default: pageHeader },
    footers: { default: pageFooter },
    children: body,
  }],
});

const outPath = "C:/Users/FahadAlsaawi/Documents/Tadawul Devlopment/NSC/AI_Architecture_Reference_Design.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote: " + outPath);
}).catch(err => { console.error(err); process.exit(1); });
