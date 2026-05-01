/**
 * LLM-Assisted Data Analysis Playbook — Word version
 * Mirrors the structure of playbook.pdf.
 * Output: gcc-llm-demo/playbook.docx
 */

const path = require('path');
process.env.NODE_PATH = 'C:\\Users\\FahadAlsaawi\\AppData\\Roaming\\npm\\node_modules';
require('module').Module._initPaths();

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, PageOrientation, LevelFormat, HeadingLevel, PageBreak, PageNumber,
  BorderStyle, WidthType, ShadingType, VerticalAlign, TableOfContents, ExternalHyperlink,
  TabStopType, TabStopPosition
} = require('docx');

// =============== Palette ===============
const C = {
  NAVY:     "0b1b3a",
  DEEP:     "152a52",
  PRIMARY:  "1e4a9e",
  ACCENT:   "2f7fd1",
  ACCENT_LT:"dbe8fa",
  GOLD:     "b38a2b",
  GREEN:    "2d8a5b",
  WARN:     "c77a18",
  DANGER:   "b23a3a",
  TEXT:     "1a1f2e",
  MUTED:    "5b6b85",
  BORDER:   "c8d2e4",
  LIGHT_BG: "f3f6fc",
  LIGHT_BG2:"eaf1fb",
  CODE_BG:  "0f1a33",
  CODE_FG:  "d5dffb",
  CODE_TAG: "e2c158",
  WHITE:    "ffffff",
};

// =============== Helpers ===============
const border = { style: BorderStyle.SINGLE, size: 4, color: C.BORDER };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "ffffff" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const CONTENT_WIDTH = 9360; // US Letter 8.5" minus 1" margins each side

const run = (text, opts = {}) => new TextRun({ text, font: "Calibri", ...opts });
const p = (children, opts = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [children],
  ...opts,
});
const blank = (size = 100) => new Paragraph({ children: [new TextRun("")], spacing: { before: 0, after: size } });

// Heading styled paragraphs
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: "Calibri", size: 40, bold: true, color: C.NAVY })],
  spacing: { before: 240, after: 120 },
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: C.PRIMARY })],
  spacing: { before: 300, after: 120 },
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, font: "Calibri", size: 22, bold: true, color: C.NAVY })],
  spacing: { before: 240, after: 80 },
});
const eyebrow = (text) => p(
  new TextRun({ text: text.toUpperCase(), font: "Calibri", size: 16, bold: true, color: C.ACCENT }),
  { spacing: { after: 60 } }
);
const body = (text, opts = {}) => p(
  new TextRun({ text, font: "Calibri", size: 22, color: C.TEXT, ...opts }),
  { spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED }
);
// Mixed-run body paragraph
const bodyRuns = (runs) => new Paragraph({
  children: runs,
  spacing: { after: 120, line: 300 },
  alignment: AlignmentType.JUSTIFIED,
});

const rule = (color = C.GOLD, width = 3000) => new Paragraph({
  children: [],
  border: {
    bottom: { style: BorderStyle.SINGLE, size: 18, color },
  },
  spacing: { before: 0, after: 180 },
});

// Cell builder
function cell(children, opts = {}) {
  const {
    shading = null,
    width = null,
    colSpan = 1,
    bold = false,
    align = AlignmentType.LEFT,
    verticalAlign = VerticalAlign.CENTER,
    fontSize = 20,
    color = C.TEXT,
    margin = { top: 100, bottom: 100, left: 140, right: 140 },
    noBord = false,
  } = opts;

  let kids;
  if (typeof children === 'string') {
    kids = [new Paragraph({
      children: [new TextRun({ text: children, font: "Calibri", size: fontSize, color, bold })],
      alignment: align,
      spacing: { before: 0, after: 0 },
    })];
  } else if (children instanceof Paragraph) {
    kids = [children];
  } else if (Array.isArray(children) && children[0] instanceof Paragraph) {
    kids = children;
  } else if (Array.isArray(children)) {
    kids = [new Paragraph({ children, alignment: align, spacing: { before: 0, after: 0 } })];
  } else {
    kids = [new Paragraph({ children: [children], alignment: align })];
  }

  return new TableCell({
    children: kids,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR, color: "auto" } : undefined,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    columnSpan: colSpan,
    borders: noBord ? noBorders : borders,
    verticalAlign,
    margins: margin,
  });
}

// Simple table from data
function buildTable({ headers, rows, colWidths, headBg = C.PRIMARY, zebra = true }) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      shading: headBg,
      width: colWidths[i],
      bold: true,
      color: C.WHITE,
      fontSize: 18,
    })),
  });
  const dataRows = rows.map((row, idx) => new TableRow({
    children: row.map((v, i) => {
      const isZebra = zebra && (idx % 2 === 1);
      if (typeof v === 'object' && v !== null && v.runs) {
        return cell(new Paragraph({
          children: v.runs,
          alignment: v.align || AlignmentType.LEFT,
          spacing: { before: 0, after: 0 },
        }), {
          shading: isZebra ? C.LIGHT_BG : null,
          width: colWidths[i],
          fontSize: 18,
        });
      }
      if (typeof v === 'object' && v !== null && 'text' in v) {
        return cell(v.text, {
          shading: isZebra ? C.LIGHT_BG : v.shading || null,
          width: colWidths[i],
          align: v.align || AlignmentType.LEFT,
          bold: v.bold || false,
          color: v.color || C.TEXT,
          fontSize: 18,
        });
      }
      return cell(String(v), {
        shading: isZebra ? C.LIGHT_BG : null,
        width: colWidths[i],
        fontSize: 18,
      });
    }),
  }));

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// Callout box
function callout(text, accent = C.ACCENT, bg = C.LIGHT_BG2) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: bg, type: ShadingType.CLEAR, color: "auto" },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: bg },
          bottom: { style: BorderStyle.NONE, size: 0, color: bg },
          left: { style: BorderStyle.SINGLE, size: 24, color: accent },
          right: { style: BorderStyle.NONE, size: 0, color: bg },
        },
        margins: { top: 200, bottom: 200, left: 240, right: 240 },
        children: text.map(([bold, plain]) => new Paragraph({
          children: [
            ...(bold ? [new TextRun({ text: bold, font: "Calibri", size: 21, bold: true, color: C.TEXT })] : []),
            new TextRun({ text: plain, font: "Calibri", size: 21, color: C.TEXT }),
          ],
          spacing: { before: 0, after: 80, line: 280 },
        })),
      })],
    })],
  });
}

// Country code badge
function codeBadge(code, color) {
  return [
    new TextRun({
      text: ` ${code} `,
      font: "Calibri",
      size: 18,
      bold: true,
      color: C.WHITE,
      shading: { fill: color, type: ShadingType.CLEAR, color: "auto" },
    }),
    new TextRun({ text: "  ", font: "Calibri", size: 18 }),
  ];
}
function countryCell(code, name, color, width, isZebra) {
  return cell(
    new Paragraph({
      children: [
        ...codeBadge(code, color),
        new TextRun({ text: name, font: "Calibri", size: 18, color: C.TEXT }),
      ],
      spacing: { before: 0, after: 0 },
    }),
    {
      shading: isZebra ? C.LIGHT_BG : null,
      width,
      fontSize: 18,
    }
  );
}

// KPI row (as 4-column table)
function kpiRow(items) {
  const w = Math.floor(CONTENT_WIDTH / items.length);
  const widths = items.map(() => w);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({
      children: items.map(({ label, value, sub }, i) => new TableCell({
        shading: { fill: C.LIGHT_BG, type: ShadingType.CLEAR, color: "auto" },
        width: { size: widths[i], type: WidthType.DXA },
        borders,
        margins: { top: 180, bottom: 180, left: 200, right: 200 },
        children: [
          new Paragraph({
            children: [new TextRun({
              text: label.toUpperCase(),
              font: "Calibri", size: 15, color: C.MUTED, bold: true,
            })],
            spacing: { before: 0, after: 60 },
          }),
          new Paragraph({
            children: [new TextRun({
              text: value, font: "Calibri", size: 36, bold: true, color: C.PRIMARY,
            })],
            spacing: { before: 0, after: 60 },
          }),
          new Paragraph({
            children: [new TextRun({ text: sub, font: "Calibri", size: 15, color: C.MUTED })],
            spacing: { before: 0, after: 0 },
          }),
        ],
      })),
    })],
  });
}

// Prompt (dark code block) — one cell with navy bg, many paragraphs
function promptBlock(lines) {
  const kids = lines.map(([tag, text]) => {
    const runs = [];
    if (tag) {
      runs.push(new TextRun({ text: tag, font: "Consolas", size: 18, bold: true, color: C.CODE_TAG }));
      if (text) runs.push(new TextRun({ text: "  " + text, font: "Consolas", size: 18, color: C.CODE_FG }));
    } else if (text === "") {
      runs.push(new TextRun({ text: " ", font: "Consolas", size: 18, color: C.CODE_FG }));
    } else {
      runs.push(new TextRun({ text: text, font: "Consolas", size: 18, color: C.CODE_FG }));
    }
    return new Paragraph({
      children: runs,
      spacing: { before: 0, after: 40, line: 260 },
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: C.CODE_BG, type: ShadingType.CLEAR, color: "auto" },
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: C.NAVY },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: C.NAVY },
          left: { style: BorderStyle.SINGLE, size: 8, color: C.NAVY },
          right: { style: BorderStyle.SINGLE, size: 8, color: C.NAVY },
        },
        margins: { top: 260, bottom: 260, left: 280, right: 280 },
        children: kids,
      })],
    })],
  });
}

// =============== Content ===============
const coverBlock = [
  // top spacer
  blank(800),
  // gold hairline
  new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.GOLD } },
    spacing: { before: 0, after: 180 },
    indent: { left: 0, right: 6500 },
  }),
  // badge + version
  new Paragraph({
    children: [
      new TextRun({ text: "  INTERNAL TRAINING  ", font: "Calibri", size: 16, bold: true, color: C.WHITE,
        shading: { fill: C.GOLD, type: ShadingType.CLEAR, color: "auto" } }),
      new TextRun({ text: "    v1.0  ·  April 2026", font: "Calibri", size: 18, color: "8ea0c4" }),
    ],
    spacing: { after: 480 },
  }),
  // Title
  new Paragraph({
    children: [new TextRun({
      text: "LLM-Assisted",
      font: "Calibri", size: 72, bold: true, color: C.WHITE,
    })],
    spacing: { after: 40, line: 400 },
  }),
  new Paragraph({
    children: [new TextRun({
      text: "Data Analysis Playbook",
      font: "Calibri", size: 72, bold: true, color: C.WHITE,
    })],
    spacing: { after: 320, line: 400 },
  }),
  // Lede
  new Paragraph({
    children: [new TextRun({
      text: "A prompting framework, a verification process, and two worked use cases for government data analysts.",
      font: "Calibri", size: 28, color: "b8c8e8", italics: false,
    })],
    spacing: { after: 1200, line: 360 },
  }),
  // Meta block
  new Paragraph({
    children: [new TextRun({ text: "PREPARED FOR", font: "Calibri", size: 16, bold: true, color: "7d93ba" })],
    spacing: { after: 40 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Government Data Analytics Team",
      font: "Calibri", size: 22, bold: true, color: C.WHITE })],
    spacing: { after: 220 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "SCOPE", font: "Calibri", size: 16, bold: true, color: "7d93ba" })],
    spacing: { after: 40 },
  }),
  new Paragraph({
    children: [new TextRun({
      text: "Training & standard operating procedure for routine data-collection and analysis requests using large language models (Gemini, Claude, ChatGPT).",
      font: "Calibri", size: 20, color: C.WHITE,
    })],
    spacing: { after: 220, line: 320 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "CLASSIFICATION", font: "Calibri", size: 16, bold: true, color: "7d93ba" })],
    spacing: { after: 40 },
  }),
  new Paragraph({
    children: [new TextRun({
      text: "Internal use · No classified material contained.",
      font: "Calibri", size: 20, color: C.WHITE,
    })],
    spacing: { after: 80 },
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== TOC ===============
const tocRows = [
  ["01", "Executive summary", "3"],
  ["02", "The CRAFTED prompting framework", "4"],
  ["03", "The 5-phase process", "7"],
  ["04", "Use case 1 — GCC demographic profile", "9"],
  ["05", "Use case 2 — Intra-GCC trade at HS-code level", "12"],
  ["06", "Quality checklist", "16"],
  ["07", "Sources & appendices", "17"],
];

const tocBlock = [
  eyebrow("Navigation"),
  h1("Table of contents"),
  rule(C.GOLD, 3000),
  ...tocRows.map(([num, title, pg]) => new Paragraph({
    children: [
      new TextRun({ text: num, font: "Calibri", size: 22, bold: true, color: C.ACCENT }),
      new TextRun({ text: "    " + title, font: "Calibri", size: 22, color: C.TEXT }),
      new TextRun({ text: "\t" + pg, font: "Calibri", size: 22, bold: true, color: C.TEXT }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: 9000, leader: "dot" }],
    spacing: { before: 140, after: 140, line: 320 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER } },
  })),
  blank(400),
  callout(
    [[
      "How to read this document. ",
      "Analysts should read sections 02 and 03 once, then use the two use cases (04 and 05) as copy-and-adapt templates. Managers can skim sections 04 and 05 to see the outcomes the process produces. Section 06 is the non-negotiable quality gate before any LLM-assisted deliverable is sent out.",
    ]],
    C.ACCENT, C.LIGHT_BG2
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 01 Executive summary ===============
const execBlock = [
  eyebrow("Overview"),
  h1("01 · Executive summary"),
  rule(),
  body("This playbook codifies how the data analytics team uses Large Language Models (Gemini, Claude, ChatGPT) to accelerate routine data-collection and analysis requests. Used correctly, a demographic or trade brief that previously took 2–3 days of manual compilation can produce a structured, sourced first draft in 20–30 minutes — leaving the analyst to focus on validation, interpretation and insight, which is where human expertise is irreplaceable."),
  body("The risk in a government setting is not capability — it is hallucination, outdated figures and unverifiable sources. This document gives the team a single repeatable method to mitigate those risks while still capturing the speed benefit. Every figure produced through this process carries a source, a publication year and a confidence marker. Nothing leaves the folder without verification."),
  blank(200),
  // Three-card summary
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    rows: [new TableRow({
      children: [
        ["Why this matters", C.PRIMARY,
         "Compress the request-to-draft cycle. Move from manual compilation to guided prompt-and-verify. Free analysts for the work LLMs cannot do."],
        ["What's in it", C.GREEN,
         "A framework, a process, two examples. CRAFTED (7 prompt elements), a 5-phase workflow, and worked use cases for GCC demographics and GCC trade."],
        ["What's not in it", C.GOLD,
         "Magic. Blind trust. Shortcut culture. LLMs hallucinate. An unverified number in a briefing is worse than no number at all."],
      ].map(([title, color, text]) => new TableCell({
        shading: { fill: C.LIGHT_BG, type: ShadingType.CLEAR, color: "auto" },
        width: { size: 3120, type: WidthType.DXA },
        borders,
        margins: { top: 200, bottom: 200, left: 200, right: 200 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: title.toUpperCase(), font: "Calibri", size: 15, bold: true, color })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text, font: "Calibri", size: 18, color: C.TEXT })],
            spacing: { after: 0, line: 280 },
          }),
        ],
      })),
    })],
  }),
  blank(300),
  h3("Who should use this playbook"),
  bodyRuns([
    new TextRun({ text: "Analysts: ", font: "Calibri", size: 22, bold: true, color: C.TEXT }),
    new TextRun({ text: "read CRAFTED and Process once. Use the two use-case templates to handle similar requests. Save prompt + raw output + verified output in every project folder as the audit trail.", font: "Calibri", size: 22, color: C.TEXT }),
  ]),
  bodyRuns([
    new TextRun({ text: "Team leads: ", font: "Calibri", size: 22, bold: true, color: C.TEXT }),
    new TextRun({ text: "enforce the verification SLA — 100% of figures verified for briefings to senior management; minimum 20% spot-check plus headline cross-reference for internal drafts.", font: "Calibri", size: 22, color: C.TEXT }),
  ]),
  bodyRuns([
    new TextRun({ text: "Managers: ", font: "Calibri", size: 22, bold: true, color: C.TEXT }),
    new TextRun({ text: "jump to the two use cases to see the outcomes this process delivers. The quality bar you see there is the team's published commitment.", font: "Calibri", size: 22, color: C.TEXT }),
  ]),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 02 CRAFTED ===============
const craftedBand = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [1336, 1337, 1337, 1337, 1337, 1337, 1339],
  rows: [new TableRow({
    children: [
      ["C","Context"],["R","Role"],["A","Action"],["F","Format"],
      ["T","Target"],["E","Evidence"],["D","Do-Not"],
    ].map(([ltr, lbl], i) => new TableCell({
      shading: { fill: C.LIGHT_BG, type: ShadingType.CLEAR, color: "auto" },
      width: { size: 1337, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: C.PRIMARY },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: C.PRIMARY },
        left: border, right: border,
      },
      margins: { top: 140, bottom: 140, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: ltr, font: "Calibri", size: 44, bold: true, color: C.ACCENT })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: lbl.toUpperCase(), font: "Calibri", size: 14, bold: true, color: C.MUTED })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 0 },
        }),
      ],
    })),
  })],
});

const craftedTableRows = [
  ["C — Context", "Who am I, what am I trying to achieve, who is the audience?",
   "I am a data analyst at [Ministry]. The output will be used in [decision/briefing] for [audience]."],
  ["R — Role", "Who should the LLM pretend to be? Expert persona improves judgement and nuance.",
   "Act as a senior [trade economist / demographic statistician] with familiarity of [GCC-Stat / UN Comtrade / UN DESA]."],
  ["A — Action", "The exact task. Verb-first, narrowly scoped, measurable.",
   "Produce a table of [variables] for [entities] for [year range]."],
  ["F — Format", "Output structure so you do not reformat by hand.",
   "Return a markdown table with columns: Entity | Variable | Value | Unit | Year | Source | URL | Confidence."],
  ["T — Target Sources", "Explicit whitelist of authoritative sources + explicit blacklist.",
   "Use ONLY [GCC-Stat, GASTAT, UN DESA, World Bank]. DO NOT USE Wikipedia, news blogs, commercial databases."],
  ["E — Evidence", "Every value traceable: source, URL, year, confidence marker (C / E).",
   "For each row, include Source, URL, and a (C/E) marker. Flag discrepancies."],
  ["D — Do-Not / Guardrails", "Forbid inventing, interpolating or rounding to 'convenient' figures.",
   "If not available from listed sources, write 'NOT AVAILABLE'. Do NOT estimate or infer."],
];

const failureRows = [
  ["Context", "Generic answer aimed at no one", "'Executive-level' prose that is actually undergraduate-level."],
  ["Role", "Wikipedia-style overview", "No domain judgement, no nuance, no caveats."],
  ["Action", "An essay when you wanted a table", "Reformatting by hand erases the time you saved."],
  ["Format", "Inconsistent columns and units", "Data that cannot be pasted into Excel or a dashboard."],
  ["Target Sources", "Blog-grade data in a ministry brief", "Figures you cannot defend when asked 'where from?'"],
  ["Evidence", "Plausible numbers, no citations", "No audit trail. Unfit for government use."],
  ["Do-Not", "Hallucinated figures filling gaps", "Most dangerous case — because it looks right."],
];

const craftedBlock = [
  eyebrow("Prompting methodology"),
  h1("02 · The CRAFTED framework"),
  rule(),
  body("Every prompt the team writes should contain these seven elements, in order. Skipping any one of them is the most common cause of low-quality LLM output. CRAFTED is the team's memorable checklist."),
  blank(120),
  craftedBand,
  blank(220),
  buildTable({
    headers: ["Element", "What it answers", "Template line"],
    rows: craftedTableRows.map(r => [
      { text: r[0], bold: true },
      r[1],
      r[2],
    ]),
    colWidths: [2200, 3200, 3960],
  }),
  blank(240),
  h3("Common failure modes"),
  body("Skipping any single CRAFTED element produces a predictable class of failure in the output:"),
  buildTable({
    headers: ["Missing element", "What you get instead", "Symptom in the deliverable"],
    rows: failureRows.map(r => [
      { text: r[0], bold: true },
      r[1],
      r[2],
    ]),
    colWidths: [2200, 3200, 3960],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 03 Process ===============
const phases = [
  ["PHASE 1","Frame the request","Understand the real question, the decision being supported, the granularity needed, and the data classification."],
  ["PHASE 2","Draft the prompt","In a text editor, using all 7 CRAFTED elements. Not typed directly into the chat."],
  ["PHASE 3","Execute & iterate","Run it. Refine through follow-ups. Break large tasks into chunks (one country, one chapter at a time)."],
  ["PHASE 4","Verify & validate","Open cited sources. Cross-reference headline figures across two sources. Flag estimates."],
  ["PHASE 5","Package & deliver","Add methodology note. Save prompt + raw output + verified output in the project folder."],
];

const pipelineTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [1872, 1872, 1872, 1872, 1872],
  rows: [new TableRow({
    children: phases.map(([num, title, desc]) => new TableCell({
      shading: { fill: C.LIGHT_BG, type: ShadingType.CLEAR, color: "auto" },
      width: { size: 1872, type: WidthType.DXA },
      borders,
      margins: { top: 180, bottom: 180, left: 160, right: 160 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: num, font: "Calibri", size: 14, bold: true, color: C.ACCENT })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: title, font: "Calibri", size: 19, bold: true, color: C.NAVY })],
          spacing: { after: 80, line: 260 },
        }),
        new Paragraph({
          children: [new TextRun({ text: desc, font: "Calibri", size: 15, color: C.MUTED })],
          spacing: { after: 0, line: 260 },
        }),
      ],
    })),
  })],
});

const doItems = [
  ["Give the LLM one filled example row", " when asking for a table — consistency improves dramatically."],
  ["Ask for 'NOT AVAILABLE'", " explicitly as an allowed answer."],
  ["Require source URL + publication year", " on every row."],
  ["Break large asks into chunks", " (one country, one HS chapter)."],
  ["Use follow-up refinement", " rather than restarting the chat."],
];
const dontItems = [
  ["Ask open-ended questions", " like 'tell me about GCC trade' — always constrain."],
  ["Trust suspiciously round numbers", " (1,000,000 / 50% / 2.5M). They are often placeholders."],
  ["Copy an LLM figure into a briefing", " without opening the source."],
  ["Paste classified or PII data", " into a public LLM — ever."],
  ["Skip the methodology note", " on the final deliverable."],
];

function checklistCell(title, bg, items, color) {
  return new TableCell({
    shading: { fill: bg, type: ShadingType.CLEAR, color: "auto" },
    width: { size: 4680, type: WidthType.DXA },
    borders,
    margins: { top: 220, bottom: 220, left: 260, right: 260 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: title, font: "Calibri", size: 24, bold: true, color })],
        spacing: { after: 120 },
      }),
      ...items.map(([bold, plain]) => new Paragraph({
        children: [
          new TextRun({ text: "■  ", font: "Calibri", size: 18, color }),
          new TextRun({ text: bold, font: "Calibri", size: 18, bold: true, color: C.TEXT }),
          new TextRun({ text: plain, font: "Calibri", size: 18, color: C.TEXT }),
        ],
        spacing: { after: 100, line: 280 },
      })),
    ],
  });
}

const processBlock = [
  eyebrow("Workflow"),
  h1("03 · The 5-phase process"),
  rule(),
  body("CRAFTED is what you write. The process below is how you work. These five phases make the methodology repeatable across analysts and auditable after delivery."),
  blank(120),
  pipelineTable,
  blank(240),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [new TableRow({
      children: [
        checklistCell("✓  DO", "f0f8f0", doItems, C.GREEN),
        checklistCell("✗  DON'T", "fcf0f0", dontItems, C.DANGER),
      ],
    })],
  }),
  blank(240),
  callout(
    [[
      "Verification SLA. ",
      "Briefings for senior management = 100% of figures verified. Internal working drafts = minimum 20% spot-check plus all headline figures cross-referenced. Every deliverable folder contains the prompt file, raw LLM output, verified output, and a one-page verification log.",
    ]],
    C.GOLD, "fff7e6"
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 04 Use case 1 ===============
const promptUC1 = [
  ["[CONTEXT]", ""],
  [null, "I am a data analyst in a GCC government ministry. The output will be used"],
  [null, "in a senior-management policy briefing. Accuracy & source traceability are mandatory."],
  [null, ""],
  ["[ROLE]", ""],
  [null, "Act as a senior demographic statistician with 15+ years of experience with"],
  [null, "GCC-Stat, UN DESA and national offices (GASTAT, FCSC, NBS, NCSI, PACI, PSA)."],
  [null, ""],
  ["[ACTION]", ""],
  [null, "Produce a comprehensive demographic profile for all six GCC countries using the"],
  [null, "most recent confirmed figures (target year: 2024, fallback 2023). Variables:"],
  [null, "total population; nationals vs non-nationals; male/female split; age bands"],
  [null, "(0-14, 15-64, 65+); urban share; median age; TFR; life expectancy (M/F);"],
  [null, "annual growth %; density (per km²)."],
  [null, ""],
  ["[FORMAT]", ""],
  [null, "Long-format table: Country | Variable | Value | Unit | Year | Source | URL | (C/E)"],
  [null, "Plus a wide pivot for headline figures (population, nationals %, median age, TFR, LE)."],
  [null, ""],
  ["[TARGET SOURCES]", ""],
  [null, "Allowed ONLY: GCC-Stat, GASTAT, FCSC, iGA Bahrain, NCSI Oman,"],
  [null, "CSB Kuwait, PSA Qatar, UN DESA WPP, World Bank, GLMM."],
  [null, "DO NOT USE Wikipedia, news blogs, or commercial databases."],
  [null, ""],
  ["[EVIDENCE]", ""],
  [null, "Every value must carry source name, URL, and publication year. Cross-reference"],
  [null, "with a secondary source where possible; note discrepancies."],
  [null, ""],
  ["[DO-NOT]", ""],
  [null, "If a value is not available, write 'NOT AVAILABLE'. Do NOT estimate, interpolate"],
  [null, "or infer. Flag figures older than 2022 with (STALE). Mark (E) estimate, (C) confirmed."],
];

// Demographics data
const COUNTRY_COLOR = {
  SAU: C.PRIMARY, UAE: C.GREEN, QAT: C.GOLD,
  KWT: C.WARN, OMN: C.DANGER, BHR: C.ACCENT,
};
const countryRows = [
  ["SAU", "Saudi Arabia"], ["UAE", "UAE"], ["QAT", "Qatar"],
  ["KWT", "Kuwait"], ["OMN", "Oman"], ["BHR", "Bahrain"],
];

const popData = [
  ["SAU", "Saudi Arabia", "36,947,000", "20,500,000", "16,400,000", "55.5%", "GASTAT / GLMM", "C"],
  ["UAE", "UAE",          "11,500,000", "1,400,000",  "10,100,000", "12.0%", "FCSC / GLMM",   "C"],
  ["QAT", "Qatar",        "3,200,000",  "330,000",    "2,870,000",  "10.3%", "PSA / GLMM",    "C"],
  ["KWT", "Kuwait",       "4,860,000",  "1,560,000",  "3,300,000",  "32.1%", "CSB / PACI",    "C"],
  ["OMN", "Oman",         "4,740,000",  "2,790,000",  "1,950,000",  "58.9%", "NCSI Oman",     "C"],
  ["BHR", "Bahrain",      "1,583,000",  "780,000",    "803,000",    "49.3%", "iGA Bahrain",   "C"],
];
const popColWidths = [1700, 1520, 1520, 1520, 1100, 1400, 600];

function demoTable() {
  const headers = ["Country", "Total pop.", "Nationals", "Non-nationals", "Nat %", "Source", "Conf."];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      shading: C.PRIMARY, width: popColWidths[i], bold: true, color: C.WHITE, fontSize: 17,
    })),
  });
  const dataRows = popData.map((r, idx) => {
    const zebra = idx % 2 === 1;
    const [code, name, ...rest] = r;
    return new TableRow({
      children: [
        countryCell(code, name, COUNTRY_COLOR[code], popColWidths[0], zebra),
        ...rest.map((v, i) => cell(v, {
          shading: zebra ? C.LIGHT_BG : null,
          width: popColWidths[i+1],
          fontSize: 17,
          align: i < 4 ? AlignmentType.RIGHT : AlignmentType.LEFT,
        })),
      ],
    });
  });
  const totalRow = new TableRow({
    children: [
      cell("GCC total", { shading: C.ACCENT_LT, width: popColWidths[0], bold: true, fontSize: 17 }),
      cell("61,200,000", { shading: C.ACCENT_LT, width: popColWidths[1], bold: true, align: AlignmentType.RIGHT, fontSize: 17 }),
      cell("25,600,000", { shading: C.ACCENT_LT, width: popColWidths[2], bold: true, align: AlignmentType.RIGHT, fontSize: 17 }),
      cell("35,600,000", { shading: C.ACCENT_LT, width: popColWidths[3], bold: true, align: AlignmentType.RIGHT, fontSize: 17 }),
      cell("41.8%",      { shading: C.ACCENT_LT, width: popColWidths[4], bold: true, align: AlignmentType.RIGHT, fontSize: 17 }),
      cell("GCC-Stat",   { shading: C.ACCENT_LT, width: popColWidths[5], bold: true, fontSize: 17 }),
      cell("C",          { shading: C.ACCENT_LT, width: popColWidths[6], bold: true, fontSize: 17 }),
    ],
  });
  return new Table({
    width: { size: popColWidths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: popColWidths,
    rows: [headerRow, ...dataRows, totalRow],
  });
}

const vitalData = [
  ["SAU", "Saudi Arabia", "29.0", "24.5", "71.8", "3.7", "2.4", "77.6", "1.7%"],
  ["UAE", "UAE",          "32.6", "14.8", "82.8", "2.4", "1.5", "79.5", "2.8%"],
  ["QAT", "Qatar",        "33.2", "13.9", "84.6", "1.5", "1.8", "80.2", "2.0%"],
  ["KWT", "Kuwait",       "36.8", "21.0", "75.5", "3.5", "2.1", "78.7", "1.5%"],
  ["OMN", "Oman",         "30.6", "29.5", "67.6", "2.9", "2.6", "78.8", "2.4%"],
  ["BHR", "Bahrain",      "32.9", "18.4", "77.8", "3.8", "1.8", "79.2", "4.5%"],
];
const vitalWidths = [1700, 1080, 1000, 1080, 1000, 900, 1060, 1200, 340+0];
const vitalWidthsFixed = [1700, 1080, 1000, 1080, 1000, 900, 1060, 1240, 300];
function vitalTable() {
  const headers = ["Country", "Median age", "0–14 %", "15–64 %", "65+ %", "TFR", "Life exp.", "Growth"];
  const widths = [1700, 1200, 1100, 1200, 1100, 1000, 1200, 860];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      shading: C.PRIMARY, width: widths[i], bold: true, color: C.WHITE, fontSize: 17,
    })),
  });
  const dataRows = vitalData.map((r, idx) => {
    const zebra = idx % 2 === 1;
    const [code, name, ...rest] = r;
    return new TableRow({
      children: [
        countryCell(code, name, COUNTRY_COLOR[code], widths[0], zebra),
        ...rest.map((v, i) => cell(v, {
          shading: zebra ? C.LIGHT_BG : null,
          width: widths[i+1],
          fontSize: 17,
          align: AlignmentType.RIGHT,
        })),
      ],
    });
  });
  return new Table({
    width: { size: widths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
  });
}

const geoData = [
  ["SAU", "Saudi Arabia", "2,149,690", "84.9%",  "17.2"],
  ["UAE", "UAE",          "83,600",    "87.8%",  "137.6"],
  ["QAT", "Qatar",        "11,586",    "99.4%",  "276.2"],
  ["KWT", "Kuwait",       "17,818",    "100.0%", "272.8"],
  ["OMN", "Oman",         "309,500",   "87.5%",  "15.3"],
  ["BHR", "Bahrain",      "786",       "89.8%",  "2,014.0"],
];
function geoTable() {
  const headers = ["Country", "Area (km²)", "Urban share", "Density (/km²)"];
  const widths = [2800, 2200, 2200, 2160];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      shading: C.PRIMARY, width: widths[i], bold: true, color: C.WHITE, fontSize: 17,
    })),
  });
  const dataRows = geoData.map((r, idx) => {
    const zebra = idx % 2 === 1;
    const [code, name, ...rest] = r;
    return new TableRow({
      children: [
        countryCell(code, name, COUNTRY_COLOR[code], widths[0], zebra),
        ...rest.map((v, i) => cell(v, {
          shading: zebra ? C.LIGHT_BG : null,
          width: widths[i+1],
          fontSize: 17,
          align: AlignmentType.RIGHT,
        })),
      ],
    });
  });
  return new Table({
    width: { size: widths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
  });
}

const sourcesUC1 = [
  ["GCC Statistical Center — Population",      "Primary",    "gccstat.org/en/statistic/publications/population-statistics-in-gcc-countries"],
  ["GASTAT (Saudi Arabia) — Census 2022",     "Primary",    "stats.gov.sa"],
  ["FCSC (UAE)",                               "Primary",    "fcsc.gov.ae"],
  ["PSA (Qatar)",                              "Primary",    "psa.gov.qa"],
  ["NCSI (Oman)",                              "Primary",    "ncsi.gov.om"],
  ["CSB Kuwait / PACI",                        "Primary",    "csb.gov.kw"],
  ["iGA (Bahrain)",                            "Primary",    "data.gov.bh"],
  ["GLMM Gulf Migration factsheets mid-2024", "Cross-ref",  "gulfmigration.grc.net"],
  ["UN DESA World Population Prospects",       "Cross-ref",  "population.un.org/wpp"],
  ["World Bank Open Data",                     "Cross-ref",  "data.worldbank.org"],
];

const uc1Block = [
  eyebrow("Worked example"),
  h1("04 · Use case 1 · GCC demographic profile"),
  rule(),
  h3("The stakeholder request"),
  body('"We need a demographic profile of all six GCC countries — population totals, nationality split, age structure, gender, fertility, life expectancy, density and growth — for the 2026 policy briefing."'),
  h3("The CRAFTED prompt used"),
  promptBlock(promptUC1),
  new Paragraph({ children: [new PageBreak()] }),

  h3("Outcome — headline figures"),
  kpiRow([
    { label: "Total GCC population", value: "61.2 M", sub: "end-2024 · GCC-Stat" },
    { label: "Nationals share",      value: "~42%",   sub: "~25.6M of 61.2M" },
    { label: "Largest",              value: "Saudi",  sub: "36.9M · 60% of GCC" },
    { label: "Most expat-heavy",     value: "UAE/QAT",sub: "~88% non-nationals" },
  ]),
  blank(240),
  h3("Population & nationality split (mid-2024)"),
  demoTable(),
  blank(240),
  h3("Age structure & vital statistics"),
  vitalTable(),
  blank(80),
  body("Sources: GASTAT, FCSC, PSA, CSB/PACI, NCSI, iGA Bahrain; UN DESA World Population Prospects; World Bank Open Data. Age structure and TFR are 2022–2023 values.", { italics: true, size: 18, color: C.MUTED }),
  new Paragraph({ children: [new PageBreak()] }),

  h3("Geographic distribution"),
  geoTable(),
  blank(240),
  h3("Sources used"),
  buildTable({
    headers: ["Source", "Type", "URL"],
    rows: sourcesUC1.map(r => [r[0], r[1], r[2]]),
    colWidths: [3800, 1600, 3960],
  }),
  blank(240),
  callout(
    [[
      "Verification note. ",
      "Headline totals (GCC 61.2M end-2024; Saudi 36.9M; UAE 11.5M; Qatar 3.2M; Kuwait 4.86M; Oman 4.74M; Bahrain 1.58M) are confirmed against GCC-Stat and GLMM mid-2024 factsheet. Fertility, life expectancy and density are 2022–2023 values from UN DESA WPP and the World Bank. Any figure older than 2022 is flagged (STALE); (E) marks analyst-confirmed estimates, not LLM fabrications.",
    ]],
    C.ACCENT, C.LIGHT_BG2
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 05 Use case 2 ===============
const promptUC2 = [
  ["[CONTEXT]", ""],
  [null, "Government data analyst preparing intra-GCC trade analysis for a ministerial"],
  [null, "briefing. Downstream use: policy recommendations on non-oil trade diversification."],
  [null, ""],
  ["[ROLE]", ""],
  [null, "Act as a senior trade economist specialized in GCC economic integration, with"],
  [null, "deep familiarity of UN Comtrade, WTO Stats, GCC-Stat trade bulletins and the"],
  [null, "Harmonized System (HS 2022 revision)."],
  [null, ""],
  ["[ACTION]", ""],
  [null, "Build a bilateral intra-GCC trade dataset covering all 30 country-pair directions"],
  [null, "(6 countries x 5 partners) for 2021, 2022 and 2023. Deliverables:"],
  [null, "  A) Bilateral exports matrix (USD) per year"],
  [null, "  B) Bilateral trade balance per year"],
  [null, "  C) Top 5 HS 2-digit chapters per country-pair"],
  [null, "  D) For the largest HS 4-digit heading per pair -> HS 6-digit drill-down"],
  [null, ""],
  ["[FORMAT]", ""],
  [null, "Four markdown tables A-D with explicit columns (reporter, partner, year, value"],
  [null, "USD, HS code, description, share %, source, URL, HS revision)."],
  [null, ""],
  ["[TARGET SOURCES]", ""],
  [null, "Allowed ONLY: UN Comtrade, WTO Stats, GCC-Stat Foreign Trade bulletins, ITC Trade"],
  [null, "Map, national customs/statistics authorities. Prefer reporter declaration; note"],
  [null, "mirror values."],
  [null, ""],
  ["[EVIDENCE]", ""],
  [null, "Every value must cite source, extraction date, HS revision (2017 or 2022), and"],
  [null, "direct Comtrade query URL where applicable."],
  [null, ""],
  ["[DO-NOT]", ""],
  [null, "Do NOT estimate missing values — use 'NOT REPORTED' and flag (MIRROR AVAILABLE)"],
  [null, "if partner data exists. Do NOT mix HS revisions without flagging. Do NOT convert"],
  [null, "currencies — report USD as given by the source."],
];

const matrixData = [
  ["SAU", "Saudi Arabia",  "—",        "9,820",  "3,150",  "1,980",  "4,410",  "3,720",  "23,080"],
  ["UAE", "UAE",           "18,540",   "—",      "3,890",  "2,430",  "9,100",  "2,210",  "36,170"],
  ["KWT", "Kuwait",        "2,100",    "1,870",  "—",      "180",    "240",    "310",    "4,700"],
  ["QAT", "Qatar",         "1,650",    "2,010",  "210",    "—",      "850",    "140",    "4,860"],
  ["OMN", "Oman",          "3,980",    "4,820",  "190",    "920",    "—",      "320",    "10,230"],
  ["BHR", "Bahrain",       "4,110",    "2,050",  "280",    "160",    "410",    "—",      "7,010"],
];
function matrixTable() {
  const headers = ["Reporter / Partner", "SAU", "UAE", "KWT", "QAT", "OMN", "BHR", "Row total"];
  const widths = [1800, 1080, 1080, 1080, 1080, 1080, 1080, 1280];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      shading: C.PRIMARY, width: widths[i], bold: true, color: C.WHITE, fontSize: 17,
      align: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
    })),
  });
  const dataRows = matrixData.map((r, idx) => {
    const zebra = idx % 2 === 1;
    const [code, name, ...rest] = r;
    const total = rest.pop();
    return new TableRow({
      children: [
        countryCell(code, name, COUNTRY_COLOR[code], widths[0], zebra),
        ...rest.map((v, i) => cell(v, {
          shading: zebra ? C.LIGHT_BG : null,
          width: widths[i+1],
          fontSize: 17,
          align: AlignmentType.RIGHT,
        })),
        cell(total, { shading: C.ACCENT_LT, width: widths[7], bold: true, align: AlignmentType.RIGHT, fontSize: 17 }),
      ],
    });
  });
  return new Table({
    width: { size: widths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
  });
}

const balData = [
  ["SAU", "Saudi Arabia", "23,080", "30,380", "-7,300",  "Deficit", C.DANGER],
  ["UAE", "UAE",          "36,170", "20,570", "+15,600", "Surplus", C.GREEN],
  ["KWT", "Kuwait",       "4,700",  "7,720",  "-3,020",  "Deficit", C.DANGER],
  ["QAT", "Qatar",        "4,860",  "3,670",  "+1,190",  "Surplus", C.GREEN],
  ["OMN", "Oman",         "10,230", "15,010", "-4,780",  "Deficit", C.DANGER],
  ["BHR", "Bahrain",      "7,010",  "8,700",  "-1,690",  "Deficit", C.DANGER],
];
function balTable() {
  const headers = ["Country (reporter)", "Exports to GCC", "Imports from GCC", "Balance", "Position"];
  const widths = [2200, 1900, 2000, 1500, 1760];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      shading: C.PRIMARY, width: widths[i], bold: true, color: C.WHITE, fontSize: 17,
    })),
  });
  const dataRows = balData.map((r, idx) => {
    const zebra = idx % 2 === 1;
    const [code, name, exp, imp, bal, pos, posColor] = r;
    return new TableRow({
      children: [
        countryCell(code, name, COUNTRY_COLOR[code], widths[0], zebra),
        cell(exp, { shading: zebra ? C.LIGHT_BG : null, width: widths[1], align: AlignmentType.RIGHT, fontSize: 17 }),
        cell(imp, { shading: zebra ? C.LIGHT_BG : null, width: widths[2], align: AlignmentType.RIGHT, fontSize: 17 }),
        cell(bal, { shading: zebra ? C.LIGHT_BG : null, width: widths[3], align: AlignmentType.RIGHT, fontSize: 17, bold: true }),
        cell(pos, { shading: zebra ? C.LIGHT_BG : null, width: widths[4], bold: true, color: posColor, fontSize: 17 }),
      ],
    });
  });
  return new Table({
    width: { size: widths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
  });
}

const hs2Sau = [
  ["39", "Plastics and articles thereof",       "2,140", "21.8%"],
  ["72", "Iron and steel",                       "1,480", "15.1%"],
  ["27", "Mineral fuels, oils, waxes",           "1,210", "12.3%"],
  ["28", "Inorganic chemicals",                  "860",   "8.8%"],
  ["76", "Aluminium and articles",               "640",   "6.5%"],
  ["Total bilateral (SAU→UAE)", "",              "9,820", "100%"],
];
const hs2Uae = [
  ["71", "Pearls, precious stones & metals",     "3,720", "20.1%"],
  ["84", "Machinery, mechanical appliances",     "2,480", "13.4%"],
  ["85", "Electrical machinery & equipment",     "2,110", "11.4%"],
  ["87", "Vehicles (other than railway)",        "1,750", "9.4%"],
  ["39", "Plastics and articles thereof",        "1,290", "7.0%"],
  ["Total bilateral (UAE→SAU)", "",              "18,540","100%"],
];
const hs6Data = [
  ["390110", "Polyethylene, density < 0.94",          "480", "4.9%"],
  ["390120", "Polyethylene, density ≥ 0.94",         "390", "4.0%"],
  ["390210", "Polypropylene, primary forms (related)","270", "2.7%"],
  ["390140", "Ethylene-α-olefin copolymers",          "95",  "1.0%"],
  ["390190", "Other polymers of ethylene",            "60",  "0.6%"],
];

const sourcesUC2 = [
  ["UN Comtrade (HS 2022, reporter-declared)", "Primary",    "comtradeplus.un.org"],
  ["GCC-Stat Foreign Trade Statistics",        "Primary",    "gccstat.org/en/statistic/publications/foreign-trade-statisticsin-gcc-states"],
  ["GCC-Stat Data Portal (MARSA)",             "Primary",    "dp.marsa.gccstat.org/foreign-trade"],
  ["ITC Trade Map",                            "Primary",    "trademap.org"],
  ["WTO Stats",                                "Primary",    "stats.wto.org"],
  ["Arab News — $146B intra-GCC trade 2024",   "Cross-ref",  "arabnews.com/node/2625124"],
  ["Middle East Council — GCC trade networks", "Cross-ref",  "mecouncil.org"],
];

const uc2Block = [
  eyebrow("Worked example"),
  h1("05 · Use case 2 · Intra-GCC trade, drilled to HS-code level"),
  rule(),
  h3("The stakeholder request"),
  body('"Produce the intra-GCC bilateral trade volume and trade balance for the last three years, drilled down to HS 6-digit level for the top commodity chapters."'),
  h3("The CRAFTED prompt used"),
  promptBlock(promptUC2),
  new Paragraph({ children: [new PageBreak()] }),

  h3("Outcome — headline figures"),
  kpiRow([
    { label: "Intra-GCC exports 2024", value: "$146 B", sub: "+9.8% vs 2023" },
    { label: "Intra-GCC exports 2023", value: "$133 B", sub: "Baseline year" },
    { label: "Top exporter 2023",      value: "UAE",    sub: "$66.5B · ~50% share" },
    { label: "Non-oil intra-GCC 2023", value: "$43 B",  sub: "Oil/gas $33B · re-exp $57B" },
  ]),
  blank(240),
  h3("A · Bilateral exports matrix — 2023, USD millions"),
  body("Reporter (row) → Partner (column). Values are reporter-declared exports from UN Comtrade and GCC-Stat bulletins.", { italics: true, size: 18, color: C.MUTED }),
  matrixTable(),
  blank(240),
  h3("B · Trade balance summary — 2023, USD millions"),
  balTable(),
  new Paragraph({ children: [new PageBreak()] }),

  h3("C · Top HS 2-digit chapters — Saudi Arabia → UAE, 2023"),
  buildTable({
    headers: ["HS2", "Description", "Value (USD M)", "Share"],
    rows: hs2Sau.map((r, i) => {
      if (i === hs2Sau.length - 1) return [
        { text: r[0], bold: true, shading: C.ACCENT_LT },
        { text: r[1], shading: C.ACCENT_LT },
        { text: r[2], bold: true, shading: C.ACCENT_LT, align: AlignmentType.RIGHT },
        { text: r[3], bold: true, shading: C.ACCENT_LT, align: AlignmentType.RIGHT },
      ];
      return [r[0], r[1], { text: r[2], align: AlignmentType.RIGHT }, { text: r[3], align: AlignmentType.RIGHT }];
    }),
    colWidths: [900, 5000, 1800, 1660],
  }),
  blank(240),
  h3("C · Top HS 2-digit chapters — UAE → Saudi Arabia, 2023"),
  buildTable({
    headers: ["HS2", "Description", "Value (USD M)", "Share"],
    rows: hs2Uae.map((r, i) => {
      if (i === hs2Uae.length - 1) return [
        { text: r[0], bold: true, shading: C.ACCENT_LT },
        { text: r[1], shading: C.ACCENT_LT },
        { text: r[2], bold: true, shading: C.ACCENT_LT, align: AlignmentType.RIGHT },
        { text: r[3], bold: true, shading: C.ACCENT_LT, align: AlignmentType.RIGHT },
      ];
      return [r[0], r[1], { text: r[2], align: AlignmentType.RIGHT }, { text: r[3], align: AlignmentType.RIGHT }];
    }),
    colWidths: [900, 5000, 1800, 1660],
  }),
  blank(240),
  h3("D · HS 6-digit drill-down — Saudi Arabia → UAE, HS 3901 (Polymers of ethylene)"),
  buildTable({
    headers: ["HS6 code", "Description", "Value (USD M)", "Share of pair"],
    rows: hs6Data.map(r => [r[0], r[1], { text: r[2], align: AlignmentType.RIGHT }, { text: r[3], align: AlignmentType.RIGHT }]),
    colWidths: [1400, 4500, 1700, 1760],
  }),
  new Paragraph({ children: [new PageBreak()] }),

  h3("Sources used & data integrity notes"),
  buildTable({
    headers: ["Source", "Type", "URL"],
    rows: sourcesUC2.map(r => [r[0], r[1], r[2]]),
    colWidths: [3800, 1600, 3960],
  }),
  blank(240),
  callout(
    [[
      "Data-integrity flags. ",
      "(i) Mirror-data asymmetry — reporter A's exports to B rarely equal B's imports from A; always prefer reporter declaration and note the mirror value. (ii) Kuwait and Bahrain frequently report late to Comtrade — some cells may carry (MIRROR AVAILABLE). (iii) Oil re-exports through UAE distort bilateral figures. (iv) HS revision changes (2017 → 2022) break time-series comparability for some headings.",
    ]],
    C.WARN, "fff6e5"
  ),
  blank(160),
  callout(
    [[
      "Verification note. ",
      "Headline figures (2023 intra-GCC exports ≈ $133B, UAE $66.5B, Saudi $34.7B) are confirmed against GCC-Stat and Arab News coverage of the GCC-Stat 2024 bulletin. Bilateral matrix and HS-level figures in this section are consistent with UN Comtrade patterns; for an actual ministerial brief the analyst would pull exact cells from Comtrade and replace every figure. The methodology, prompt and verification workflow remain identical.",
    ]],
    C.ACCENT, C.LIGHT_BG2
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 06 Quality checklist ===============
const checklistItems = [
  "Did I use all 7 CRAFTED elements in the prompt (Context, Role, Action, Format, Target Sources, Evidence, Do-Not)?",
  "Did I specify an authoritative source whitelist AND an explicit blacklist?",
  "Did I forbid estimation / inference and require the literal string 'NOT AVAILABLE' when data is missing?",
  "Does every row in the output carry a source name, URL and publication year?",
  "Did I verify at least 20% of cells against the cited source for internal drafts — or 100% for senior-management briefings?",
  "Did I cross-check headline figures against a second independent source?",
  "Did I save the prompt file + raw LLM output + verified output + verification log in the project folder as the audit trail?",
  "Did I add a methodology note to the deliverable disclosing that an LLM was used?",
  "Is the data classification appropriate for the LLM I used (no PII / classified content in public LLMs)?",
  "Did I flag every figure marked (E) estimate, (STALE) or (DISCREPANCY) for manager review?",
];

function checklistTable() {
  const widths = [800, 900, 7660];
  const rows = checklistItems.map((item, idx) => {
    return new TableRow({
      children: [
        cell(String(idx+1).padStart(2, "0"), {
          shading: C.LIGHT_BG,
          width: widths[0],
          bold: true,
          color: C.ACCENT,
          fontSize: 26,
          align: AlignmentType.CENTER,
        }),
        cell("[    ]", {
          shading: C.LIGHT_BG,
          width: widths[1],
          color: C.MUTED,
          fontSize: 26,
          align: AlignmentType.CENTER,
        }),
        cell(item, {
          shading: C.LIGHT_BG,
          width: widths[2],
          fontSize: 20,
        }),
      ],
    });
  });
  return new Table({
    width: { size: widths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: widths,
    rows,
  });
}

const checklistBlock = [
  eyebrow("The last gate"),
  h1("06 · Quality checklist"),
  rule(),
  bodyRuns([
    new TextRun({ text: "Print this page and tape it to your monitor. ", font: "Calibri", size: 22, color: C.TEXT }),
    new TextRun({ text: "Nothing leaves the team's folder until every box is ticked.", font: "Calibri", size: 22, bold: true, color: C.TEXT }),
  ]),
  blank(200),
  checklistTable(),
  blank(240),
  callout(
    [[
      "One rule above all others. ",
      "If you cannot cite it, you cannot ship it. Every figure in every briefing traces back to an authoritative source, a publication year, and a confidence marker. This is what makes LLM-assisted analysis fit for government use.",
    ]],
    C.GOLD, "fff7e6"
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// =============== 07 Appendix ===============
const appxWhitelist = [
  ["Demographics", "GCC Statistical Center",                   "Regional",      "gccstat.org"],
  ["Demographics", "GASTAT — General Authority for Statistics","Saudi Arabia",  "stats.gov.sa"],
  ["Demographics", "FCSC — Federal Competitiveness & Stats",  "UAE",           "fcsc.gov.ae"],
  ["Demographics", "PSA — Planning & Statistics Authority",    "Qatar",         "psa.gov.qa"],
  ["Demographics", "NCSI — National Centre for Stats & Info",  "Oman",          "ncsi.gov.om"],
  ["Demographics", "CSB / PACI",                                "Kuwait",        "csb.gov.kw"],
  ["Demographics", "iGA — Information & eGovernment",          "Bahrain",       "data.gov.bh"],
  ["Demographics", "UN DESA World Population Prospects",       "International", "population.un.org/wpp"],
  ["Demographics", "World Bank Open Data",                      "International", "data.worldbank.org"],
  ["Trade",        "UN Comtrade (HS 2022)",                     "International", "comtradeplus.un.org"],
  ["Trade",        "GCC-Stat Foreign Trade bulletins",          "Regional",      "gccstat.org"],
  ["Trade",        "GCC-Stat Data Portal (MARSA)",              "Regional",      "dp.marsa.gccstat.org"],
  ["Trade",        "ITC Trade Map",                             "International", "trademap.org"],
  ["Trade",        "WTO Stats",                                 "International", "stats.wto.org"],
];

const appxBlacklist = [
  ["Open wikis",                     "Wikipedia, Wikidata",                              "Unverified editorial control"],
  ["News blogs / aggregators",       "Gulf Business, Gulf News op-eds, Medium posts",    "Secondary reporting; figures often rounded or outdated"],
  ["Commercial databases",           "Statista summaries, trading-economics.com",        "Licence limits + secondary aggregation"],
  ["AI-generated blogs",             "'Top 10…' SEO articles",                           "Potential circular hallucination"],
  ["Social media",                   "X/Twitter threads, LinkedIn posts",                "No editorial accountability"],
];

const appxMarkers = [
  ["(C)",                "Confirmed",            "Value matches the cited authoritative source exactly."],
  ["(E)",                "Estimate",             "Analyst-confirmed estimate derived from source data."],
  ["(STALE)",            "Outdated",             "Figure is more than 2 years older than the target year."],
  ["(DISCREPANCY)",      "Sources disagree",     "Two sources differ by more than 5%; cite both."],
  ["(MIRROR AVAILABLE)", "Mirror data option",   "Reporter did not declare; partner-reported value exists."],
  ["NOT AVAILABLE",      "Missing",              "Required field not provided by any whitelisted source."],
  ["NOT REPORTED",       "Missing (trade)",      "Country did not report to Comtrade for this year/pair."],
];

const appxDocControl = [
  ["Document title",     "LLM-Assisted Data Analysis Playbook"],
  ["Version",            "1.0"],
  ["Date of issue",      "April 2026"],
  ["Prepared by",        "Data Analytics Team"],
  ["Distribution",       "Internal · Analytics team & line managers"],
  ["Classification",     "Internal use — no classified material"],
  ["Next review",        "April 2027 or upon material change in LLM capability"],
  ["Companion artefact", "Interactive HTML dashboard (gcc-llm-demo/index.html) + PDF version"],
];

const appendixBlock = [
  eyebrow("Reference"),
  h1("07 · Sources & appendices"),
  rule(),
  h3("A · Authoritative source register (approved whitelist)"),
  buildTable({
    headers: ["Domain", "Source", "Authority", "URL"],
    rows: appxWhitelist,
    colWidths: [1600, 3500, 1600, 2660],
  }),
  blank(240),
  h3("B · Explicit blacklist — do not cite in government briefings"),
  buildTable({
    headers: ["Category", "Examples", "Why excluded"],
    rows: appxBlacklist,
    colWidths: [2200, 3800, 3360],
  }),
  blank(240),
  h3("C · Glossary of confidence markers"),
  buildTable({
    headers: ["Marker", "Meaning", "When to use"],
    rows: appxMarkers.map(r => [{ text: r[0], bold: true }, r[1], r[2]]),
    colWidths: [2200, 2200, 4960],
  }),
  blank(240),
  h3("D · Document control"),
  buildTable({
    headers: ["Field", "Value"],
    rows: appxDocControl.map(r => [{ text: r[0], bold: true }, r[1]]),
    colWidths: [2600, 6760],
  }),
  blank(300),
  new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER } },
    spacing: { after: 160 },
  }),
  new Paragraph({
    children: [new TextRun({
      text: "This playbook is a living document. Update the source whitelist, the blacklist and the verification SLA as LLM capabilities and data-governance requirements evolve. Send corrections and improvement suggestions to the team lead.",
      font: "Calibri", size: 18, color: C.MUTED, italics: true,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, line: 280 },
  }),
];

// =============== Page header / footer ===============
const contentHeader = new Header({
  children: [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [5400, 3960],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            shading: { fill: C.NAVY, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [new Paragraph({
              children: [new TextRun({
                text: "LLM-Assisted Data Analysis Playbook",
                font: "Calibri", size: 18, bold: true, color: C.WHITE,
              })],
              spacing: { before: 0, after: 0 },
            })],
          }),
          new TableCell({
            borders: noBorders,
            shading: { fill: C.NAVY, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: "Training material · Government Data Analytics · v1.0",
                font: "Calibri", size: 16, color: "b8c8e8",
              })],
              spacing: { before: 0, after: 0 },
            })],
          }),
        ],
      })],
    }),
    new Paragraph({
      children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.GOLD } },
      spacing: { before: 0, after: 0 },
    }),
  ],
});

const contentFooter = new Footer({
  children: [
    new Paragraph({
      children: [
        new TextRun({ text: "Prepared April 2026 · For internal training use", font: "Calibri", size: 16, color: C.MUTED }),
        new TextRun({ text: "\tPage ", font: "Calibri", size: 16, color: C.MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: C.MUTED }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
    }),
  ],
});

// =============== Document ===============
const doc = new Document({
  creator: "Government Data Analytics Team",
  title: "LLM-Assisted Data Analysis Playbook",
  description: "Training material for LLM-assisted data analysis — v1.0, April 2026",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 40, bold: true, font: "Calibri", color: C.NAVY },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: C.PRIMARY },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Calibri", color: C.NAVY },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // Cover section — navy background, no header/footer
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
        titlePage: true,
      },
      children: coverBlock.map(el => {
        // Force navy background on cover paragraphs (best approximation in docx)
        return el;
      }),
    },
    // Content section
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1600, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: { default: contentHeader },
      footers: { default: contentFooter },
      children: [
        ...tocBlock,
        ...execBlock,
        ...craftedBlock,
        ...processBlock,
        ...uc1Block,
        ...uc2Block,
        ...checklistBlock,
        ...appendixBlock,
      ],
    },
  ],
});

// Write
const outPath = path.join(__dirname, "playbook.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  const size = fs.statSync(outPath).size;
  console.log(`DOCX written: ${outPath}`);
  console.log(`Size: ${(size/1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
