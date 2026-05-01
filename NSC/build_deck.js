// Executive deck — Two-Environment AI Architecture
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333" x 7.5"
pres.author = "Data & Analytics Function";
pres.title = "Two-Environment AI Architecture";

// ---- Palette ----
const C = {
  navy:    "0B1F3A",
  navy2:   "132B4E",
  slate:   "1E3A5F",
  gold:    "C9A646",
  goldLt:  "E2C878",
  ink:     "1A1F2E",
  inkSoft: "3A4358",
  muted:   "5A6374",
  line:    "E2E6EC",
  bg:      "F5F7FA",
  card:    "FFFFFF",
  open:    "2563EB",
  openLt:  "DBEAFE",
  closed:  "0E9F7E",
  closedLt:"D1FAE5",
  gate:    "B45309",
  gateLt:  "FEF3C7",
  danger:  "B91C1C",
  dangerLt:"FEE2E2",
  indigo:  "4338CA",
  indigoLt:"E0E7FF",
};

// ---- Fonts ----
const FH = "Calibri"; // header
const FB = "Calibri"; // body

// ---- Helpers ----
const W = 13.333, H = 7.5;

function makeShadow(){
  return { type: "outer", blur: 10, offset: 2, angle: 90, color: "000000", opacity: 0.10 };
}

// Page footer used on content slides (not title)
function addFooter(slide, pageNum){
  // slim navy bar
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.33, w: W, h: 0.33, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.33, w: W, h: 0.04, fill: { color: C.gold }, line: { color: C.gold } });
  slide.addText("Two-Environment AI Architecture  ·  Executive Reference Design", {
    x: 0.5, y: H - 0.33, w: 9, h: 0.33,
    fontFace: FB, fontSize: 10, color: "CBD3E2", align: "left", valign: "middle", margin: 0
  });
  slide.addText(`${pageNum}`, {
    x: W - 1.0, y: H - 0.33, w: 0.5, h: 0.33,
    fontFace: FB, fontSize: 10, color: C.gold, align: "right", valign: "middle", bold: true, margin: 0
  });
}

// Header used on content slides
function addHeader(slide, eyebrow, title){
  // gold accent block
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.45, w: 0.12, h: 0.55, fill: { color: C.gold }, line: { color: C.gold } });
  slide.addText(eyebrow, {
    x: 0.75, y: 0.43, w: 8, h: 0.3,
    fontFace: FB, fontSize: 10.5, color: C.slate, bold: true, charSpacing: 2, margin: 0
  });
  slide.addText(title, {
    x: 0.75, y: 0.68, w: 12, h: 0.55,
    fontFace: FH, fontSize: 26, color: C.navy, bold: true, margin: 0
  });
  // underline faint
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.35, w: 12.3, h: 0.02, fill: { color: C.line }, line: { color: C.line } });
}

// A compact block ("tile") with title + body
function addTile(slide, x, y, w, h, title, body, opts={}){
  const bg  = opts.bg  || C.card;
  const str = opts.str || C.line;
  const tc  = opts.tc  || C.navy;
  const bc  = opts.bc  || C.inkSoft;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: bg }, line: { color: str, width: 1 },
    shadow: makeShadow()
  });
  if (opts.accentColor) {
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h, fill: { color: opts.accentColor }, line: { color: opts.accentColor }
    });
  }
  slide.addText(title, {
    x: x + 0.22, y: y + 0.14, w: w - 0.3, h: 0.36,
    fontFace: FH, fontSize: 14, color: tc, bold: true, margin: 0
  });
  slide.addText(body, {
    x: x + 0.22, y: y + 0.55, w: w - 0.3, h: h - 0.7,
    fontFace: FB, fontSize: 11.5, color: bc, margin: 0, valign: "top"
  });
}

// Arrow from point A -> B (horizontal only here, simple)
function addRightArrow(slide, x, y, w){
  slide.addShape(pres.shapes.RIGHT_TRIANGLE, { x: x+w-0.12, y: y-0.06, w: 0.12, h: 0.18, fill: { color: C.navy }, line: { color: C.navy }, rotate: 90 });
  slide.addShape(pres.shapes.LINE, { x: x, y: y, w: w-0.1, h: 0, line: { color: C.navy, width: 1.4 } });
}

// ===========================================================
// SLIDE 1 — TITLE
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  // decorative left stripe (gold)
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: H, fill: { color: C.gold }, line: { color: C.gold } });
  // faint radial feel — put a subtle block
  s.addShape(pres.shapes.RECTANGLE, { x: 0.22, y: 0, w: W-0.22, h: H, fill: { color: C.navy2, transparency: 70 }, line: { color: C.navy2 } });
  // eyebrow
  s.addText("EXECUTIVE REFERENCE DESIGN", {
    x: 0.9, y: 1.1, w: 11, h: 0.4,
    fontFace: FB, fontSize: 13, color: C.goldLt, bold: true, charSpacing: 5, margin: 0
  });
  // title
  s.addText("Two-Environment AI Architecture", {
    x: 0.9, y: 1.55, w: 11.5, h: 1.3,
    fontFace: FH, fontSize: 48, color: "FFFFFF", bold: true, margin: 0
  });
  s.addText("A secure, on-premises design for government data & analytics", {
    x: 0.9, y: 2.95, w: 11.5, h: 0.7,
    fontFace: FH, fontSize: 22, color: "CADCFC", margin: 0
  });
  // key pillars row
  const pillars = [
    { t: "Open (Connected)", d: "Intake · Enrichment\nFrontier LLMs" },
    { t: "Governed Gateway", d: "One-way · Dual approval\nImmutable audit" },
    { t: "Air-Gapped (Closed)", d: "Local LLMs · Analytics\nDecision support" }
  ];
  pillars.forEach((p, i) => {
    const x = 0.9 + i*4.1;
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: 5.1, w: 3.8, h: 1.5, fill: { color: "FFFFFF", transparency: 88 }, line: { color: C.gold, width: 1 } });
    s.addText(p.t, { x: x+0.2, y: 5.2, w: 3.6, h: 0.4, fontFace: FH, fontSize: 14, color: C.gold, bold: true, margin: 0 });
    s.addText(p.d, { x: x+0.2, y: 5.6, w: 3.6, h: 0.9, fontFace: FB, fontSize: 12, color: "E8EEFA", margin: 0 });
  });
  // footer
  s.addText("Prepared by the Data & Analytics Function  ·  v1.0", {
    x: 0.9, y: H-0.7, w: 11, h: 0.3, fontFace: FB, fontSize: 11, color: "8FA0C4", margin: 0
  });
}

// ===========================================================
// SLIDE 2 — EXECUTIVE SUMMARY
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "EXECUTIVE SUMMARY", "What this architecture enables");

  s.addText(
    "A secure, on-premises AI platform that collects external information, receives controlled internal submissions, uses frontier LLMs where policy allows, transfers approved artifacts into an air-gapped environment, and delivers trusted analytics and local AI with auditable human accountability.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.9, fontFace: FB, fontSize: 14, color: C.inkSoft, margin: 0 }
  );

  // 4 big stats
  const stats = [
    { n: "2",     l: "ENVIRONMENTS",   d: "Open (connected) and\nair-gapped — both on-prem." },
    { n: "1-way", l: "TRUST BOUNDARY", d: "Data flows open → closed\nonly, via governed gateway." },
    { n: "2",     l: "AI STACKS",      d: "Frontier LLMs (open) +\nlocal open-source (closed)." },
    { n: "C0–C4", l: "DATA CLASSES",   d: "Five labels drive where\ndata lives and who uses it." },
  ];
  stats.forEach((st, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: 2.7, w: 2.9, h: 2.3, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: 2.7, w: 2.9, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });
    s.addText(st.n, { x: x+0.2, y: 2.85, w: 2.6, h: 0.9, fontFace: FH, fontSize: 42, color: C.navy, bold: true, margin: 0 });
    s.addText(st.l, { x: x+0.2, y: 3.8, w: 2.6, h: 0.3, fontFace: FB, fontSize: 10.5, color: C.slate, bold: true, charSpacing: 2, margin: 0 });
    s.addText(st.d, { x: x+0.2, y: 4.1, w: 2.6, h: 0.8, fontFace: FB, fontSize: 11.5, color: C.inkSoft, margin: 0 });
  });

  // Bottom strip: the ask in one line
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.4, w: 12.3, h: 1.3, fill: { color: C.navy }, line: { color: C.navy } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.4, w: 0.1, h: 1.3, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("THE ASK", { x: 0.75, y: 5.5, w: 3, h: 0.3, fontFace: FB, fontSize: 10.5, color: C.goldLt, bold: true, charSpacing: 3, margin: 0 });
  s.addText(
    "Approve the two-environment trust model, the Policy Gate for internal submissions, the cross-domain gateway design, and the phased implementation roadmap.",
    { x: 0.75, y: 5.85, w: 12, h: 0.8, fontFace: FH, fontSize: 14, color: "FFFFFF", margin: 0 }
  );

  addFooter(s, 2);
}

// ===========================================================
// SLIDE 3 — CONSTRAINTS / CONTEXT
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "CONTEXT", "Five constraints that shape the design");

  const items = [
    { n:"1", t:"Two on-prem environments", d:"Open (internet-connected) and closed (air-gapped, local network only)." },
    { n:"2", t:"Managed by IT",            d:"The Data function delivers the service on infrastructure operated by IT." },
    { n:"3", t:"Two information sources",  d:"Open-source feeds and internal team submissions — both initially collected in the open environment." },
    { n:"4", t:"Secure transfer required", d:"Approved artifacts move from open to closed through a governed, auditable path." },
    { n:"5", t:"Split AI stacks",          d:"Frontier LLMs allowed only in the open environment; local open-source LLMs only in the closed environment." },
  ];
  items.forEach((it, i) => {
    const y = 1.6 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 12.3, h: 0.9, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    // number badge
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y+0.17, w: 0.56, h: 0.56, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(it.n, { x: 0.7, y: y+0.17, w: 0.56, h: 0.56, fontFace: FH, fontSize: 18, color: C.gold, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(it.t, { x: 1.45, y: y+0.1, w: 3.8, h: 0.4, fontFace: FH, fontSize: 15, color: C.navy, bold: true, margin: 0 });
    s.addText(it.d, { x: 1.45, y: y+0.45, w: 11, h: 0.5, fontFace: FB, fontSize: 12, color: C.inkSoft, margin: 0 });
  });

  addFooter(s, 3);
}

// ===========================================================
// SLIDE 4 — PRINCIPLES (top 8 as icons in circles)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "DESIGN PRINCIPLES", "Eight principles that shape every decision");

  const P = [
    { t:"Trust-boundary-first",       d:"Separation driven by risk, not just network topology." },
    { t:"Sensitivity drives placement",d:"Data class determines where it can live and who can use it." },
    { t:"Least movement",             d:"Only approved data crosses; every movement is logged." },
    { t:"Open is not system of record",d:"Staging & enrichment only — not authoritative." },
    { t:"Public LLMs are bounded",    d:"Extract · classify · translate · summarize. Not decisions." },
    { t:"Local LLMs are anchored",    d:"With retrieval, guardrails, evaluation, audit." },
    { t:"Human-in-the-loop",          d:"Required for high-impact outputs." },
    { t:"Auditable cross-domain",     d:"Classify · DLP · AV · sign · dual-approve · log." },
  ];

  const cols = 4, rows = 2;
  const tileW = 3.0, tileH = 2.25;
  const startX = 0.5, startY = 1.7, gapX = 0.12, gapY = 0.22;

  P.forEach((p, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = startX + c * (tileW + gapX);
    const y = startY + r * (tileH + gapY);
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: tileW, h: tileH, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    // circle badge
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.3, w: 0.7, h: 0.7, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(`${i+1}`, { x: x+0.25, y: y+0.3, w: 0.7, h: 0.7, fontFace: FH, fontSize: 22, color: C.gold, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(p.t, { x: x+0.25, y: y+1.05, w: tileW-0.4, h: 0.4, fontFace: FH, fontSize: 14, color: C.navy, bold: true, margin: 0 });
    s.addText(p.d, { x: x+0.25, y: y+1.45, w: tileW-0.4, h: 0.7, fontFace: FB, fontSize: 11, color: C.inkSoft, margin: 0 });
  });

  addFooter(s, 4);
}

// ===========================================================
// SLIDE 5 — ARCHITECTURE AT A GLANCE (full picture)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "ARCHITECTURE AT A GLANCE", "The full picture in one view");

  // OPEN BAND
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.55, w: 12.3, h: 2.0, fill: { color: C.openLt }, line: { color: C.open, width: 1 } });
  s.addText("OPEN ENVIRONMENT · Connected · On-Prem", { x: 0.65, y: 1.6, w: 8, h: 0.3, fontFace: FH, fontSize: 11, color: "1E3A8A", bold: true, charSpacing: 2, margin: 0 });

  const openBlocks = [
    { t: "Sources",             d: "Open-source\nInternal submissions" },
    { t: "Policy Gate",         d: "Classify · Authenticate\n3-path router" , critical: true},
    { t: "Raw & Prepared",      d: "Immutable raw\nCurated · Catalog" },
    { t: "AI Utility",          d: "LLM Gateway\nGemini · Claude · GPT" },
    { t: "Transfer Staging",    d: "DLP · AV · Sign\nDual approval" },
  ];
  openBlocks.forEach((b, i) => {
    const x = 0.7 + i * 2.43, y = 1.95, w = 2.25, h = 1.5;
    const fill = b.critical ? C.gateLt : "FFFFFF";
    const stroke = b.critical ? C.gate : C.open;
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: w, h: h, fill: { color: fill }, line: { color: stroke, width: b.critical ? 2 : 1 } });
    s.addText(b.t, { x: x+0.1, y: y+0.1, w: w-0.2, h: 0.4, fontFace: FH, fontSize: 12, color: b.critical ? "7C2D12" : "1E3A8A", bold: true, margin: 0 });
    s.addText(b.d, { x: x+0.1, y: y+0.5, w: w-0.2, h: 0.9, fontFace: FB, fontSize: 10, color: b.critical ? "7C2D12" : "1E3A8A", margin: 0 });
    if (i < openBlocks.length - 1) {
      // small arrow
      s.addShape(pres.shapes.RIGHT_TRIANGLE, { x: x+w+0.05, y: y+h/2-0.1, w: 0.14, h: 0.2, rotate: 90, fill: { color: C.navy }, line: { color: C.navy } });
    }
  });

  // GATEWAY BAND
  s.addShape(pres.shapes.RECTANGLE, { x: 3.0, y: 3.85, w: 7.3, h: 0.8, fill: { color: C.gateLt }, line: { color: C.gate, width: 2 } });
  s.addText("SECURE CROSS-DOMAIN GATEWAY · One-way (open → closed)", {
    x: 3.05, y: 3.9, w: 7.2, h: 0.3, fontFace: FH, fontSize: 12, color: "78350F", bold: true, align: "center", margin: 0
  });
  s.addText("Diode · Protocol break · Re-inspection · Signature verify · Dual approve · Immutable audit", {
    x: 3.05, y: 4.2, w: 7.2, h: 0.4, fontFace: FB, fontSize: 10.5, color: "78350F", align: "center", margin: 0
  });
  // Down arrow
  s.addShape(pres.shapes.LINE, { x: 6.65, y: 3.55, w: 0, h: 0.3, line: { color: C.navy, width: 1.5 } });
  s.addShape(pres.shapes.RIGHT_TRIANGLE, { x: 6.55, y: 3.77, w: 0.2, h: 0.15, rotate: 180, fill: { color: C.navy }, line: { color: C.navy } });
  s.addShape(pres.shapes.LINE, { x: 6.65, y: 4.65, w: 0, h: 0.3, line: { color: C.navy, width: 1.5 } });
  s.addShape(pres.shapes.RIGHT_TRIANGLE, { x: 6.55, y: 4.87, w: 0.2, h: 0.15, rotate: 180, fill: { color: C.navy }, line: { color: C.navy } });

  // CLOSED BAND
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.05, w: 12.3, h: 2.0, fill: { color: C.closedLt }, line: { color: C.closed, width: 1 } });
  s.addText("AIR-GAPPED ENVIRONMENT · Local Network Only · On-Prem", { x: 0.65, y: 5.1, w: 8, h: 0.3, fontFace: FH, fontSize: 11, color: "065F46", bold: true, charSpacing: 2, margin: 0 });

  const closedBlocks = [
    { t: "Secure Landing",    d: "Decrypt · Verify\nQuarantine" },
    { t: "Internal Sources",  d: "Core DBs\nFiles · Documents" },
    { t: "Trusted Data",      d: "Lakehouse\nCatalog · Lineage" },
    { t: "Local AI Services", d: "Open-source LLMs\nRAG · Vector DB" },
    { t: "Delivery Channels", d: "Dashboards · BI\nAnalyst workbench" },
  ];
  closedBlocks.forEach((b, i) => {
    const x = 0.7 + i * 2.43, y = 5.45, w = 2.25, h = 1.5;
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: w, h: h, fill: { color: "FFFFFF" }, line: { color: C.closed, width: 1 } });
    s.addText(b.t, { x: x+0.1, y: y+0.1, w: w-0.2, h: 0.4, fontFace: FH, fontSize: 12, color: "065F46", bold: true, margin: 0 });
    s.addText(b.d, { x: x+0.1, y: y+0.5, w: w-0.2, h: 0.9, fontFace: FB, fontSize: 10, color: "065F46", margin: 0 });
    if (i < closedBlocks.length - 1) {
      s.addShape(pres.shapes.RIGHT_TRIANGLE, { x: x+w+0.05, y: y+h/2-0.1, w: 0.14, h: 0.2, rotate: 90, fill: { color: C.navy }, line: { color: C.navy } });
    }
  });

  addFooter(s, 5);
}

// ===========================================================
// SLIDE 6 — OPEN ENVIRONMENT DETAIL
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "OPEN ENVIRONMENT", "Controlled staging & external-AI enablement");

  s.addText(
    "On-premises, internet-connected, internally segmented. Operated as a staging and enrichment zone — not as the system of record. Frontier LLMs are used only on allowed data classes through a centrally-managed gateway.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.9, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  const tiles = [
    { t: "Source Ingestion",       d: "Web & API collectors, RSS, file intake, authenticated internal submission endpoints." },
    { t: "Policy Gate (critical)", d: "Classifies every submission and routes it — the key control on the open side.", accent: C.gate },
    { t: "Raw Landing",            d: "Near-immutable storage with timestamps, hashes, source IDs, and collection metadata." },
    { t: "Data Preparation",       d: "Validation, standardization, deduplication, redaction, classification, metadata tagging." },
    { t: "AI Utility Layer",       d: "LLM Gateway → Gemini, Claude, GPT. Bounded tasks. C0/C1 only. All prompts & outputs logged." },
    { t: "Transfer Staging Vault", d: "DLP & AV scans, schema checks, manifest, digital signatures, dual-approver release." },
  ];
  const cols = 3; const tileW = 3.95, tileH = 2.0; const startX = 0.5, startY = 2.65, gx = 0.2, gy = 0.2;
  tiles.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = startX + c * (tileW + gx);
    const y = startY + r * (tileH + gy);
    addTile(s, x, y, tileW, tileH, t.t, t.d, { accentColor: t.accent || C.open });
  });

  addFooter(s, 6);
}

// ===========================================================
// SLIDE 7 — POLICY GATE (the critical control)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "CRITICAL CONTROL", "The Policy Gate — one decision, three paths");

  s.addText(
    "Because internal submissions arrive in the connected environment, every item is classified and routed to exactly one of three paths. This is the most important control on the open side.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.7, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  // Central gate
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 2.55, w: 2.95, h: 0.9, fill: { color: C.gateLt }, line: { color: C.gate, width: 2 }, shadow: makeShadow() });
  s.addText("POLICY GATE", { x: 5.2, y: 2.6, w: 2.95, h: 0.36, fontFace: FH, fontSize: 16, color: "78350F", bold: true, align: "center", margin: 0 });
  s.addText("Authenticate · Classify · Route", { x: 5.2, y: 3.0, w: 2.95, h: 0.4, fontFace: FB, fontSize: 11, color: "78350F", align: "center", margin: 0 });

  // Three paths
  const paths = [
    { x: 0.5,  t: "PATH A · LLM-ELIGIBLE", d: "C0 / C1 only.\nPreparation + frontier-LLM enrichment allowed via LLM Gateway.", fill: C.openLt, stroke: C.open, ink: "1E3A8A" },
    { x: 4.95, t: "PATH B · PREP-ONLY",    d: "C2 and above.\nPreparation only — external AI is never applied to these records.",  fill: C.dangerLt, stroke: C.danger, ink: "7F1D1D" },
    { x: 9.4,  t: "PATH C · DIRECT TRANSFER", d: "Pre-approved sensitive items.\nMinimal preparation; sealed and queued for transfer.", fill: C.indigoLt, stroke: C.indigo, ink: "3730A3" },
  ];
  paths.forEach((p, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: p.x, y: 3.85, w: 3.45, h: 1.9, fill: { color: p.fill }, line: { color: p.stroke, width: 1.5 }, shadow: makeShadow() });
    s.addText(p.t, { x: p.x+0.15, y: 3.95, w: 3.2, h: 0.4, fontFace: FH, fontSize: 13, color: p.ink, bold: true, margin: 0 });
    s.addText(p.d, { x: p.x+0.15, y: 4.35, w: 3.2, h: 1.35, fontFace: FB, fontSize: 11.5, color: p.ink, margin: 0 });
    // arrow from gate to each path
    const gateCenterX = 5.2 + 2.95/2;
    const pathCenterX = p.x + 3.45/2;
    s.addShape(pres.shapes.LINE, { x: gateCenterX, y: 3.45, w: pathCenterX - gateCenterX, h: 0.4, line: { color: C.navy, width: 1.3 } });
  });

  // Converge to transfer
  s.addShape(pres.shapes.RECTANGLE, { x: 4.3, y: 6.1, w: 4.7, h: 0.65, fill: { color: C.gateLt }, line: { color: C.gate, width: 1.5 } });
  s.addText("Transfer Staging → Cross-Domain Gateway", { x: 4.3, y: 6.1, w: 4.7, h: 0.65, fontFace: FH, fontSize: 13, color: "78350F", bold: true, align: "center", valign: "middle", margin: 0 });

  // arrows down
  [2.23, 6.68, 11.13].forEach(cx => {
    s.addShape(pres.shapes.LINE, { x: cx, y: 5.77, w: 0, h: 0.3, line: { color: C.navy, width: 1.3 } });
  });

  addFooter(s, 7);
}

// ===========================================================
// SLIDE 8 — CROSS-DOMAIN GATEWAY
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "CROSS-DOMAIN GATEWAY", "A governed path — not a network link");

  s.addText(
    "The single sanctioned way for artifacts to cross the trust boundary. Every artifact is classified, scanned, hashed, signed, and dual-approved before it reaches the closed side.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.7, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  // Left: 8 numbered steps stacked
  const steps = [
    { n: "1", t: "Classification check", d: "Hard-reject C2+" },
    { n: "2", t: "DLP scan",             d: "PII · secrets · keys" },
    { n: "3", t: "Malware / AV scan",    d: "Multiple engines" },
    { n: "4", t: "Schema validation",    d: "Format & structure" },
    { n: "5", t: "Manifest + SHA-256 + signature", d: "Integrity proof" },
    { n: "6", t: "Dual human approver",  d: "Separation of duties", crit: true },
    { n: "7", t: "Hardware data diode",  d: "One-way physical link", crit: true },
    { n: "8", t: "Re-inspection on closed side", d: "Verify · quarantine", closed: true },
  ];
  const stepX = 0.5, stepY = 2.5, stepW = 6.8, stepH = 0.52, stepGap = 0.07;
  steps.forEach((st, i) => {
    const y = stepY + i * (stepH + stepGap);
    const fill = st.crit ? C.gateLt : (st.closed ? C.closedLt : C.openLt);
    const stroke = st.crit ? C.gate : (st.closed ? C.closed : C.open);
    const ink = st.crit ? "78350F" : (st.closed ? "065F46" : "1E3A8A");
    s.addShape(pres.shapes.RECTANGLE, { x: stepX, y: y, w: stepW, h: stepH, fill: { color: fill }, line: { color: stroke, width: 1 } });
    s.addShape(pres.shapes.OVAL, { x: stepX+0.08, y: y+0.08, w: 0.36, h: 0.36, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(st.n, { x: stepX+0.08, y: y+0.08, w: 0.36, h: 0.36, fontFace: FH, fontSize: 11, color: C.gold, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st.t, { x: stepX+0.55, y: y, w: 4.2, h: stepH, fontFace: FH, fontSize: 12, color: ink, bold: true, valign: "middle", margin: 0 });
    s.addText(st.d, { x: stepX+4.75, y: y, w: 2.0, h: stepH, fontFace: FB, fontSize: 11, color: ink, valign: "middle", margin: 0 });
  });

  // Right: what never crosses + cadence
  s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 2.5, w: 5.3, h: 2.3, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 2.5, w: 0.08, h: 2.3, fill: { color: C.danger }, line: { color: C.danger } });
  s.addText("WHAT NEVER CROSSES", { x: 7.7, y: 2.6, w: 5, h: 0.3, fontFace: FB, fontSize: 10.5, color: C.danger, bold: true, charSpacing: 2, margin: 0 });
  s.addText([
    { text: "Live network connections, shells, reverse proxies", options: { bullet: true, breakLine: true } },
    { text: "Secrets, credentials, tokens from the open side",   options: { bullet: true, breakLine: true } },
    { text: "User sessions, identities, or federation assertions", options: { bullet: true, breakLine: true } },
    { text: "Any artifact labeled C2 or above",                   options: { bullet: true, breakLine: true } },
    { text: "Anything without a valid, signed manifest",          options: { bullet: true } },
  ], { x: 7.8, y: 2.95, w: 4.95, h: 1.8, fontFace: FB, fontSize: 11.5, color: C.inkSoft, margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 4.95, w: 5.3, h: 2.0, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 4.95, w: 0.08, h: 2.0, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("TRANSFER CADENCE", { x: 7.7, y: 5.05, w: 5, h: 0.3, fontFace: FB, fontSize: 10.5, color: C.slate, bold: true, charSpacing: 2, margin: 0 });
  const cadence = [
    ["Curated open-source", "Daily", "Automatic"],
    ["LLM-enriched outputs", "Daily", "Automatic"],
    ["Internal submissions", "As received", "Steward"],
    ["Model weights", "On release", "Dual human"],
  ];
  cadence.forEach((row, i) => {
    const y = 5.4 + i * 0.35;
    s.addText(row[0], { x: 7.8, y: y, w: 2.6, h: 0.3, fontFace: FB, fontSize: 11, color: C.ink, margin: 0 });
    s.addText(row[1], { x: 10.4, y: y, w: 1.1, h: 0.3, fontFace: FB, fontSize: 11, color: C.inkSoft, margin: 0 });
    s.addText(row[2], { x: 11.5, y: y, w: 1.3, h: 0.3, fontFace: FB, fontSize: 11, color: C.inkSoft, margin: 0 });
  });

  addFooter(s, 8);
}

// ===========================================================
// SLIDE 9 — AIR-GAPPED ENVIRONMENT
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "AIR-GAPPED ENVIRONMENT", "The trusted enterprise analysis zone");

  s.addText(
    "On-premises, local-network-only. Combines approved imported data with internal systems of record and delivers protected analytics, local AI, and decision support with policy-aware access.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.7, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  const tiles = [
    { t: "Secure Landing & Import", d: "Decrypt · verify · re-scan · register imports · quarantine on anomaly." },
    { t: "Trusted Data Foundation", d: "Internal operational data, approved imports, master data, protected document stores." },
    { t: "Analytic Storage",        d: "Lakehouse (Raw / Curated / Gold / Semantic), feature store, data products." },
    { t: "Local AI Services",       d: "Open-source LLMs, embeddings, rerankers, vector DB, RAG, agents, evaluation." },
    { t: "Delivery Channels",       d: "Dashboards, reports, analyst workbench, investigation tools, internal APIs." },
    { t: "Policy-aware Access",     d: "Row & column policies tied to data class × user clearance × purpose." },
  ];
  const cols = 3; const tileW = 3.95, tileH = 2.0; const startX = 0.5, startY = 2.65, gx = 0.2, gy = 0.2;
  tiles.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = startX + c * (tileW + gx);
    const y = startY + r * (tileH + gy);
    addTile(s, x, y, tileW, tileH, t.t, t.d, { accentColor: C.closed });
  });

  addFooter(s, 9);
}

// ===========================================================
// SLIDE 10 — TWO AI STACKS
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "AI / LLM LAYER", "Two distinct AI stacks — by design");

  s.addText(
    "Frontier LLMs enrich open-source material in the connected environment. Local open-source LLMs produce authoritative outputs inside the air-gapped environment. Neither crosses the boundary.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.7, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  // OPEN stack card
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 2.5, w: 6.1, h: 4.3, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 2.5, w: 6.1, h: 0.5, fill: { color: C.open }, line: { color: C.open } });
  s.addText("OPEN SIDE · Frontier LLM Layer", { x: 0.65, y: 2.5, w: 5.9, h: 0.5, fontFace: FH, fontSize: 14, color: "FFFFFF", bold: true, valign: "middle", margin: 0 });
  s.addText([
    { text: "LLM Gateway routes Gemini / Claude / GPT", options: { bullet: true, breakLine: true } },
    { text: "Credentials held only in the gateway",      options: { bullet: true, breakLine: true } },
    { text: "Per-team quotas and cost caps",             options: { bullet: true, breakLine: true } },
    { text: "Prompts & responses logged (secrets redacted)", options: { bullet: true, breakLine: true } },
    { text: "Class enforcement — C0 / C1 only",          options: { bullet: true, breakLine: true } },
    { text: "Evaluation harness gates all changes",      options: { bullet: true, breakLine: true } },
    { text: "Bounded tasks — extract · classify · translate · summarize", options: { bullet: true } },
  ], { x: 0.75, y: 3.15, w: 5.7, h: 3.5, fontFace: FB, fontSize: 12.5, color: C.inkSoft, paraSpaceAfter: 6, margin: 0 });

  // CLOSED stack card
  s.addShape(pres.shapes.RECTANGLE, { x: 6.7, y: 2.5, w: 6.1, h: 4.3, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.7, y: 2.5, w: 6.1, h: 0.5, fill: { color: C.closed }, line: { color: C.closed } });
  s.addText("CLOSED SIDE · Local LLM Platform", { x: 6.85, y: 2.5, w: 5.9, h: 0.5, fontFace: FH, fontSize: 14, color: "FFFFFF", bold: true, valign: "middle", margin: 0 });
  s.addText([
    { text: "GPU cluster for inference (vLLM / TGI / Triton)", options: { bullet: true, breakLine: true } },
    { text: "Open-source models — Llama / Qwen / Mistral family", options: { bullet: true, breakLine: true } },
    { text: "Embeddings, rerankers, vector DB (pgvector / Milvus / Qdrant)", options: { bullet: true, breakLine: true } },
    { text: "RAG: retrieve → rerank → filter by clearance → generate", options: { bullet: true, breakLine: true } },
    { text: "Agent framework — tools restricted to internal APIs", options: { bullet: true, breakLine: true } },
    { text: "Fine-tuning (LoRA / QLoRA) — weights stay inside", options: { bullet: true, breakLine: true } },
    { text: "Model registry with signed weights & provenance", options: { bullet: true } },
  ], { x: 6.95, y: 3.15, w: 5.7, h: 3.5, fontFace: FB, fontSize: 12.5, color: C.inkSoft, paraSpaceAfter: 6, margin: 0 });

  addFooter(s, 10);
}

// ===========================================================
// SLIDE 11 — DATA CLASSIFICATION
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "DATA CLASSIFICATION", "Five classes govern where data can live");

  s.addText(
    "Every dataset, document, prompt, and model artifact carries a label. The label determines where it can live, which LLMs may see it, and who can access it.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.6, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  // Custom table rendering
  const headers = ["Class", "Label", "Allowed environments", "Frontier LLMs", "Example"];
  const rows = [
    ["C0", "Public",                      "Open + Closed",               "Allowed",      "News, published open data"],
    ["C1", "Internal-Open (non-sensitive)","Open + Closed",               "With review",  "Non-sensitive derived indicators"],
    ["C2", "Internal",                    "Closed only",                 "Blocked",      "Operational reports, internal statistics"],
    ["C3", "Sensitive",                   "Closed only (restricted)",    "Blocked",      "Personal data, case files"],
    ["C4", "Highly Sensitive",            "Closed only (enclave)",       "Blocked",      "Classified or legally-held material"],
  ];

  const tableData = [
    headers.map(h => ({
      text: h,
      options: { bold: true, color: "FFFFFF", fill: { color: C.navy }, align: "left", fontFace: FH, fontSize: 12 }
    })),
    ...rows.map((row, ri) => row.map((c, ci) => {
      // pill-like colouring for specific cells
      let opt = { fontFace: FB, fontSize: 12, color: C.ink, valign: "middle" };
      if (ci === 0) { opt.bold = true; opt.color = C.navy; }
      if (ci === 3) {
        if (c === "Allowed" || c === "With review") { opt.color = "065F46"; opt.bold = true; }
        if (c === "Blocked") { opt.color = "991B1B"; opt.bold = true; }
      }
      if (ri % 2 === 1) opt.fill = { color: "F1F4F9" };
      return { text: c, options: opt };
    })),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 2.4, w: 12.3,
    colW: [0.9, 3.2, 3.2, 1.8, 3.2],
    rowH: 0.55,
    border: { pt: 0.5, color: C.line },
    fontFace: FB, fontSize: 12,
  });

  // Callout
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 6.1, w: 12.3, h: 0.85, fill: { color: "FEF3C7" }, line: { color: "FDE68A", width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 6.1, w: 0.1, h: 0.85, fill: { color: C.gate }, line: { color: C.gate } });
  s.addText("Enforcement points", { x: 0.75, y: 6.15, w: 3, h: 0.3, fontFace: FH, fontSize: 12, color: "78350F", bold: true, margin: 0 });
  s.addText("Labels are assigned at ingestion, enforced at the Policy Gate, re-enforced at the LLM Gateway, re-checked by the Transfer Gateway, and applied again at query-time on the closed side.",
    { x: 0.75, y: 6.43, w: 12, h: 0.5, fontFace: FB, fontSize: 11.5, color: "78350F", margin: 0 }
  );

  addFooter(s, 11);
}

// ===========================================================
// SLIDE 12 — USE-CASE ROUTING
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "USE-CASE ROUTING", "A simple rule for where each use case belongs");

  s.addText(
    "Use cases are routed by data sensitivity, need for enterprise context, and intended business outcome.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.5, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  const headers = ["Dimension", "Open Environment", "Closed Environment"];
  const rows = [
    ["Typical data class",  "C0 / C1",                                      "C2 / C3 / C4 (and combinations)"],
    ["Typical AI use",      "Extraction · translation · summarization",     "RAG · analyst copilots · decision support"],
    ["Business outcome",    "Preparation & enrichment",                     "Integrated analysis & official consumption"],
    ["Model type",          "Public LLMs via gateway",                      "Local open-source / self-hosted LLMs"],
    ["Human review",        "Required before transfer",                     "Required for high-impact decisions"],
    ["Data residency",      "Non-authoritative staging",                    "Authoritative system of record"],
  ];

  const tableData = [
    headers.map(h => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: C.navy }, fontFace: FH, fontSize: 12 } })),
    ...rows.map((row, ri) => row.map((c, ci) => {
      const base = { fontFace: FB, fontSize: 12, color: C.ink, valign: "middle" };
      if (ci === 0) base.bold = true;
      if (ri % 2 === 1) base.fill = { color: "F1F4F9" };
      if (ci === 1) base.color = "1E3A8A";
      if (ci === 2) base.color = "065F46";
      return { text: c, options: base };
    })),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 2.25, w: 12.3, colW: [3.3, 4.5, 4.5], rowH: 0.55,
    border: { pt: 0.5, color: C.line }, fontFace: FB, fontSize: 12,
  });

  // Routing rule callout
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 6.0, w: 12.3, h: 1.0, fill: { color: C.navy }, line: { color: C.navy } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 6.0, w: 0.1, h: 1.0, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("PRACTICAL ROUTING RULE", { x: 0.8, y: 6.1, w: 5, h: 0.3, fontFace: FB, fontSize: 11, color: C.goldLt, bold: true, charSpacing: 2, margin: 0 });
  s.addText("If a use case needs internal protected data, combines internal and external information, or supports an official decision — it belongs in the closed environment.",
    { x: 0.8, y: 6.4, w: 12, h: 0.55, fontFace: FH, fontSize: 14, color: "FFFFFF", margin: 0 });

  addFooter(s, 12);
}

// ===========================================================
// SLIDE 13 — END-TO-END FLOW (9 steps)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "END-TO-END FLOW", "From collection to decision support");

  s.addText("Every step emits metadata and audit records; lineage is preserved end-to-end.",
    { x: 0.5, y: 1.55, w: 12.3, h: 0.4, fontFace: FB, fontSize: 13, color: C.inkSoft, margin: 0 }
  );

  const steps = [
    { t: "Collect",               d: "Open-source + internal\nsubmissions enter open env."},
    { t: "Classify & route",      d: "Policy Gate routes each\nitem to one of three paths." },
    { t: "Validate",              d: "Schema, quality and\npolicy checks." },
    { t: "Enrich (LLM)",          d: "Frontier LLMs on C0/C1\nonly; all prompts logged." },
    { t: "Approve & package",     d: "Steward + security sign\noff; sign + manifest." },
    { t: "Transfer",              d: "Cross-domain gateway\nre-inspects artifacts." },
    { t: "Import & integrate",    d: "Closed side fuses with\ninternal systems of record." },
    { t: "Analyze (local AI)",    d: "Local LLMs + RAG produce\ncited, clearance-aware output." },
    { t: "Deliver decisions",     d: "Dashboards, workbench,\nhuman sign-off on impact." },
  ];

  const cols = 3, rows = 3;
  const cellW = 3.95, cellH = 1.5, startX = 0.5, startY = 2.15, gx = 0.2, gy = 0.2;
  steps.forEach((st, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = startX + c * (cellW + gx);
    const y = startY + r * (cellH + gy);
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: cellW, h: cellH, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: cellW, h: 0.08, fill: { color: C.gold }, line: { color: C.gold } });
    s.addShape(pres.shapes.OVAL, { x: x+0.18, y: y+0.22, w: 0.46, h: 0.46, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(`${i+1}`, { x: x+0.18, y: y+0.22, w: 0.46, h: 0.46, fontFace: FH, fontSize: 14, color: C.gold, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st.t, { x: x+0.75, y: y+0.22, w: cellW-0.9, h: 0.35, fontFace: FH, fontSize: 13, color: C.navy, bold: true, margin: 0 });
    s.addText(st.d, { x: x+0.75, y: y+0.58, w: cellW-0.9, h: 0.85, fontFace: FB, fontSize: 11, color: C.inkSoft, margin: 0 });
  });

  addFooter(s, 13);
}

// ===========================================================
// SLIDE 14 — GOVERNANCE & OPERATING MODEL
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "GOVERNANCE", "Clear ownership across four roles");

  const roles = [
    { tag:"IT", t:"IT Function",            d:"Infrastructure, compute, storage, segmentation, transfer mechanisms, patching, backups, monitoring." },
    { tag:"DA", t:"Data & Analytics",       d:"Pipelines, metadata, data quality, prompt patterns, AI use cases, semantic models, delivery." },
    { tag:"IS", t:"Information Security",   d:"Classification policy, public-LLM guardrails, transfer controls, risk review, audit." },
    { tag:"BO", t:"Business Owners",        d:"Use-case prioritization, acceptance criteria, human approval of high-impact outputs." },
  ];
  roles.forEach((r, i) => {
    const x = 0.5 + i*3.1, y = 1.65, w = 2.95, h = 2.3;
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: w, h: h, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    s.addShape(pres.shapes.OVAL, { x: x+0.9, y: y+0.2, w: 1.15, h: 1.15, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(r.tag, { x: x+0.9, y: y+0.2, w: 1.15, h: 1.15, fontFace: FH, fontSize: 22, color: C.gold, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(r.t, { x: x+0.15, y: y+1.4, w: w-0.3, h: 0.35, fontFace: FH, fontSize: 14, color: C.navy, bold: true, align: "center", margin: 0 });
    s.addText(r.d, { x: x+0.15, y: y+1.75, w: w-0.3, h: 0.5, fontFace: FB, fontSize: 11, color: C.inkSoft, align: "center", margin: 0 });
  });

  // RACI table
  const headers = ["Key Activity", "Data", "IT", "Security", "Steering"];
  const rows = [
    ["Infra provisioning",         "C",   "R/A", "C",   "I"],
    ["Cross-domain gateway ops",   "C",   "R",   "A",   "I"],
    ["Data ingestion pipelines",   "R/A", "C",   "C",   "I"],
    ["Data classification policy", "C",   "C",   "R",   "A"],
    ["LLM selection & evaluation", "R/A", "C",   "C",   "I"],
    ["Model promotion to prod",    "R",   "C",   "C",   "A"],
    ["Incident response",          "C",   "R",   "R/A", "I"],
  ];
  const td = [
    headers.map(h => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: C.navy }, fontFace: FH, fontSize: 11 } })),
    ...rows.map((row, ri) => row.map((c, ci) => {
      const o = { fontFace: FB, fontSize: 11, color: C.ink, valign: "middle", align: ci === 0 ? "left" : "center" };
      if (ci === 0) o.bold = true;
      if (ri % 2 === 1) o.fill = { color: "F1F4F9" };
      return { text: c, options: o };
    }))
  ];
  s.addTable(td, {
    x: 0.5, y: 4.2, w: 12.3, colW: [5.1, 1.8, 1.8, 1.8, 1.8], rowH: 0.36,
    border: { pt: 0.5, color: C.line }, fontFace: FB, fontSize: 11
  });

  addFooter(s, 14);
}

// ===========================================================
// SLIDE 15 — ROADMAP
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "IMPLEMENTATION ROADMAP", "Phased delivery over 12+ months");

  const phases = [
    { span:"0–2 mo",  title:"FOUNDATIONS",         pts:["Governance & RACI","Environments provisioned","Gateway installed","Landing zones built"] },
    { span:"2–4 mo",  title:"OPEN-SIDE MVP",       pts:["2–3 feeds end-to-end","Policy Gate live","LLM Gateway live","First transfers running"] },
    { span:"4–7 mo",  title:"CLOSED-SIDE MVP",     pts:["Lakehouse & catalog","Internal connectors","Local LLM stack","First integrated use case"] },
    { span:"7–12 mo", title:"INDUSTRIALIZE & SCALE", pts:["Fine-tuned models","Expanded sources","Full observability","Pen test & DR drills"] },
  ];

  const cardY = 1.95, cardH = 4.8, startX = 0.5, cardW = 3.0, gap = 0.1;
  phases.forEach((p, i) => {
    const x = startX + i * (cardW + gap);
    // card
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: cardY, w: cardW, h: cardH, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    // top phase badge
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: cardY, w: cardW, h: 1.0, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(`PHASE ${i}`, { x: x+0.2, y: cardY+0.12, w: cardW-0.4, h: 0.3, fontFace: FB, fontSize: 10.5, color: C.goldLt, bold: true, charSpacing: 3, margin: 0 });
    s.addText(p.span, { x: x+0.2, y: cardY+0.38, w: cardW-0.4, h: 0.4, fontFace: FH, fontSize: 20, color: "FFFFFF", bold: true, margin: 0 });
    // title
    s.addText(p.title, { x: x+0.2, y: cardY+1.15, w: cardW-0.4, h: 0.45, fontFace: FH, fontSize: 14, color: C.navy, bold: true, margin: 0 });
    // bullets
    const bulletRuns = p.pts.map((t, j) => ({ text: t, options: j === p.pts.length - 1 ? { bullet: true } : { bullet: true, breakLine: true } }));
    s.addText(bulletRuns, { x: x+0.2, y: cardY+1.7, w: cardW-0.4, h: cardH-1.9, fontFace: FB, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, margin: 0 });
  });

  // connector line across cards
  s.addShape(pres.shapes.LINE, { x: startX + cardW, y: cardY + cardH + 0.2, w: 12.3 - startX - cardW - 0.3, h: 0, line: { color: C.gold, width: 2, dashType: "dash" } });

  addFooter(s, 15);
}

// ===========================================================
// SLIDE 16 — APPROVAL ASKS
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, "DECISION POINTS", "What leadership is asked to approve");

  const approvals = [
    { t: "Two-environment trust model",      d: "Adopt the open + air-gapped pattern with a one-way transfer path." },
    { t: "Public LLM scope",                 d: "Restrict frontier LLM use to the open environment and only to C0 / C1 data." },
    { t: "Policy Gate for internal submissions", d: "Adopt the three-path routing model as the critical open-side control." },
    { t: "Closed-side authoritative outputs", d: "Protected analytics & official decision support execute inside the closed env." },
    { t: "Data classification taxonomy (C0–C4)", d: "Adopt the five-class model and its enforcement points." },
    { t: "Ownership split (RACI)",           d: "Confirm split across IT, Data & Analytics, Security, and Business Owners." },
    { t: "Cross-domain gateway design",      d: "Endorse the one-way gateway with DLP, AV, manifest, signing, dual approval." },
    { t: "Phased roadmap & funding",         d: "Approve the four-phase delivery plan and its funding profile." },
  ];

  const cols = 2; const cardW = 6.05, cardH = 1.15, startX = 0.5, startY = 1.6, gx = 0.2, gy = 0.15;
  approvals.forEach((a, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = startX + c * (cardW + gx);
    const y = startY + r * (cardH + gy);
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: cardW, h: cardH, fill: { color: C.card }, line: { color: C.line }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 0.08, h: cardH, fill: { color: C.gold }, line: { color: C.gold } });
    s.addShape(pres.shapes.OVAL, { x: x+0.25, y: y+0.3, w: 0.55, h: 0.55, fill: { color: "D1FAE5" }, line: { color: "D1FAE5" } });
    s.addText("✓", { x: x+0.25, y: y+0.3, w: 0.55, h: 0.55, fontFace: FH, fontSize: 18, color: "065F46", bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(a.t, { x: x+0.95, y: y+0.14, w: cardW-1.1, h: 0.35, fontFace: FH, fontSize: 13, color: C.navy, bold: true, margin: 0 });
    s.addText(a.d, { x: x+0.95, y: y+0.5, w: cardW-1.1, h: 0.6, fontFace: FB, fontSize: 11, color: C.inkSoft, margin: 0 });
  });

  addFooter(s, 16);
}

// ===========================================================
// SLIDE 17 — REFERENCE DESIGN STATEMENT (closing)
// ===========================================================
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: H, fill: { color: C.gold }, line: { color: C.gold } });

  s.addText("REFERENCE DESIGN STATEMENT", {
    x: 0.9, y: 0.9, w: 12, h: 0.4, fontFace: FB, fontSize: 13, color: C.goldLt, bold: true, charSpacing: 4, margin: 0
  });
  s.addText("A secure two-environment AI architecture", {
    x: 0.9, y: 1.35, w: 12, h: 0.8, fontFace: FH, fontSize: 36, color: "FFFFFF", bold: true, margin: 0
  });

  s.addText(
    "The agency will implement a two-environment on-premises AI architecture. The connected environment supports external data acquisition, controlled internal intake through a policy gate, preprocessing, and bounded use of frontier LLMs on allowed data classes. The air-gapped environment hosts the trusted enterprise data foundation, local AI services, analytics workloads, and protected decision-support applications. Movement from open to closed occurs only through a secure, governed, one-way transfer path with classification, DLP, AV, integrity, approval, and audit controls.",
    { x: 0.9, y: 2.7, w: 11.5, h: 2.9, fontFace: FH, fontSize: 16, color: "CADCFC", margin: 0 }
  );

  // three closing pillars
  const pillars = [
    { t: "SECURE",   d: "One-way, governed transfer\nwith dual control." },
    { t: "SOVEREIGN",d: "All reasoning on sensitive data\nstays on-premises." },
    { t: "ACCOUNTABLE", d: "Human-in-the-loop for\nevery high-impact output." },
  ];
  pillars.forEach((p, i) => {
    const x = 0.9 + i*4.1;
    s.addShape(pres.shapes.RECTANGLE, { x: x, y: 5.9, w: 3.8, h: 1.3, fill: { color: "FFFFFF", transparency: 88 }, line: { color: C.gold, width: 1 } });
    s.addText(p.t, { x: x+0.2, y: 6.0, w: 3.6, h: 0.4, fontFace: FH, fontSize: 14, color: C.gold, bold: true, charSpacing: 2, margin: 0 });
    s.addText(p.d, { x: x+0.2, y: 6.45, w: 3.6, h: 0.75, fontFace: FB, fontSize: 12, color: "E8EEFA", margin: 0 });
  });
}

// ---- Write ----
pres.writeFile({ fileName: "C:/Users/FahadAlsaawi/Documents/AI_Architecture_Deliverables/AI_Architecture_Executive_Brief.pptx" })
  .then(f => console.log("Wrote: " + f))
  .catch(err => { console.error(err); process.exit(1); });
