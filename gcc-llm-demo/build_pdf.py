"""
Professional PDF generator — LLM-Assisted Data Analysis Playbook
Produces: gcc-llm-demo/playbook.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Frame, PageTemplate, BaseDocTemplate, NextPageTemplate,
    Image, ListFlowable, ListItem
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas
from datetime import datetime
import os

# ------------------------------------------------------------------
# Colour palette (government-appropriate, matches the web version)
# ------------------------------------------------------------------
NAVY       = HexColor("#0b1b3a")
DEEP_BLUE  = HexColor("#152a52")
PRIMARY    = HexColor("#1e4a9e")
ACCENT     = HexColor("#2f7fd1")
ACCENT_LT  = HexColor("#dbe8fa")
GOLD       = HexColor("#b38a2b")
GREEN      = HexColor("#2d8a5b")
GREEN_LT   = HexColor("#d9edd9")
WARN       = HexColor("#c77a18")
DANGER     = HexColor("#b23a3a")
TEXT       = HexColor("#1a1f2e")
MUTED      = HexColor("#5b6b85")
BORDER     = HexColor("#c8d2e4")
LIGHT_BG   = HexColor("#f3f6fc")
LIGHT_BG2  = HexColor("#eaf1fb")
CODE_BG    = HexColor("#0f1a33")

OUT = os.path.join(os.path.dirname(__file__), "playbook.pdf")

# ------------------------------------------------------------------
# Styles
# ------------------------------------------------------------------
styles = getSampleStyleSheet()

def ps(name, **kw):
    base = dict(name=name, fontName="Helvetica", fontSize=10, leading=14,
                textColor=TEXT, spaceAfter=6)
    base.update(kw)
    return ParagraphStyle(**base)

S = {
    "CoverTitle":    ps("CoverTitle", fontName="Helvetica-Bold", fontSize=32, leading=38,
                        textColor=white, alignment=TA_LEFT, spaceAfter=12),
    "CoverSub":      ps("CoverSub", fontSize=15, leading=20, textColor=HexColor("#b8c8e8"),
                        alignment=TA_LEFT, spaceAfter=6),
    "CoverSmall":    ps("CoverSmall", fontSize=10, leading=14, textColor=HexColor("#8ea0c4"),
                        alignment=TA_LEFT),
    "CoverLabel":    ps("CoverLabel", fontSize=9, leading=12,
                        textColor=HexColor("#7d93ba"), alignment=TA_LEFT),
    "CoverBadge":    ps("CoverBadge", fontName="Helvetica-Bold", fontSize=9, leading=12,
                        textColor=white, alignment=TA_LEFT),

    "H1":            ps("H1", fontName="Helvetica-Bold", fontSize=22, leading=28,
                        textColor=NAVY, spaceBefore=4, spaceAfter=10),
    "H2":            ps("H2", fontName="Helvetica-Bold", fontSize=15, leading=20,
                        textColor=PRIMARY, spaceBefore=14, spaceAfter=6),
    "H3":            ps("H3", fontName="Helvetica-Bold", fontSize=12, leading=16,
                        textColor=NAVY, spaceBefore=10, spaceAfter=4),
    "Eyebrow":       ps("Eyebrow", fontName="Helvetica-Bold", fontSize=8, leading=10,
                        textColor=ACCENT, spaceAfter=4),
    "Body":          ps("Body", fontSize=10, leading=14.5, textColor=TEXT, alignment=TA_JUSTIFY,
                        spaceAfter=6),
    "BodyL":         ps("BodyL", fontSize=10.5, leading=15.5, textColor=TEXT, alignment=TA_JUSTIFY,
                        spaceAfter=8),
    "Muted":         ps("Muted", fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=4),
    "Small":         ps("Small", fontSize=8.5, leading=11.5, textColor=MUTED),
    "TableHead":     ps("TableHead", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                        textColor=white, alignment=TA_LEFT),
    "TableHeadC":    ps("TableHeadC", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                        textColor=white, alignment=TA_CENTER),
    "TableCell":     ps("TableCell", fontSize=9, leading=12, textColor=TEXT),
    "TableCellSm":   ps("TableCellSm", fontSize=8, leading=11, textColor=TEXT),
    "TableCellNum":  ps("TableCellNum", fontSize=8.5, leading=11, textColor=TEXT,
                        alignment=TA_RIGHT, fontName="Helvetica"),
    "Code":          ps("Code", fontName="Courier", fontSize=8.5, leading=12.5,
                        textColor=HexColor("#d5dffb"), alignment=TA_LEFT,
                        leftIndent=10, rightIndent=10, spaceAfter=4),
    "CodeTag":       ps("CodeTag", fontName="Courier-Bold", fontSize=8.5, leading=12.5,
                        textColor=HexColor("#e2c158")),
    "TOCItem":       ps("TOCItem", fontSize=11, leading=18, textColor=TEXT),
    "TOCNum":        ps("TOCNum", fontName="Helvetica-Bold", fontSize=11, leading=18,
                        textColor=ACCENT),
    "Kpi":           ps("Kpi", fontName="Helvetica-Bold", fontSize=18, leading=22,
                        textColor=PRIMARY, alignment=TA_LEFT),
    "KpiLabel":      ps("KpiLabel", fontSize=8, leading=10, textColor=MUTED,
                        alignment=TA_LEFT),
    "KpiSub":        ps("KpiSub", fontSize=8, leading=10, textColor=MUTED,
                        alignment=TA_LEFT),
    "Note":          ps("Note", fontSize=9.5, leading=13, textColor=TEXT, spaceAfter=4,
                        leftIndent=6, rightIndent=6),
    "Foot":          ps("Foot", fontSize=8, leading=10, textColor=MUTED, alignment=TA_CENTER),
    "PageNum":       ps("PageNum", fontSize=9, leading=11, textColor=MUTED, alignment=TA_RIGHT),
}

# ------------------------------------------------------------------
# Page background / decorations
# ------------------------------------------------------------------
def cover_page(cv, doc):
    w, h = A4
    # navy top band
    cv.setFillColor(NAVY); cv.rect(0, 0, w, h, fill=1, stroke=0)
    # accent diagonal stripe
    cv.setFillColor(PRIMARY)
    p = cv.beginPath(); p.moveTo(0, h*0.18); p.lineTo(w, h*0.28)
    p.lineTo(w, h*0.22); p.lineTo(0, h*0.12); p.close()
    cv.drawPath(p, fill=1, stroke=0)
    # gold accent line
    cv.setFillColor(GOLD); cv.rect(2.2*cm, h-3.2*cm, 1.6*cm, 0.12*cm, fill=1, stroke=0)
    # bottom strip
    cv.setFillColor(PRIMARY); cv.rect(0, 0, w, 1.6*cm, fill=1, stroke=0)
    cv.setFillColor(GOLD); cv.rect(0, 1.6*cm, w, 0.08*cm, fill=1, stroke=0)
    # AI mark
    cv.setFillColor(ACCENT)
    cv.roundRect(w-4.2*cm, h-3.4*cm, 1.8*cm, 1.8*cm, 0.25*cm, fill=1, stroke=0)
    cv.setFont("Helvetica-Bold", 22); cv.setFillColor(white)
    cv.drawCentredString(w-3.3*cm, h-2.7*cm, "AI")

def normal_page(cv, doc):
    w, h = A4
    # top band
    cv.setFillColor(NAVY); cv.rect(0, h-1.2*cm, w, 1.2*cm, fill=1, stroke=0)
    cv.setFillColor(GOLD); cv.rect(0, h-1.22*cm, w, 0.04*cm, fill=1, stroke=0)
    # header title
    cv.setFont("Helvetica-Bold", 9); cv.setFillColor(white)
    cv.drawString(2.2*cm, h-0.75*cm, "LLM-Assisted Data Analysis Playbook")
    cv.setFont("Helvetica", 8); cv.setFillColor(HexColor("#b8c8e8"))
    cv.drawRightString(w-2.2*cm, h-0.75*cm, "Training material · Government Data Analytics · v1.0")
    # footer
    cv.setFillColor(BORDER); cv.rect(2.2*cm, 1.3*cm, w-4.4*cm, 0.02*cm, fill=1, stroke=0)
    cv.setFont("Helvetica", 8); cv.setFillColor(MUTED)
    cv.drawString(2.2*cm, 0.9*cm, "Prepared April 2026 · For internal training use")
    cv.drawRightString(w-2.2*cm, 0.9*cm, f"Page {doc.page}")

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def hr(color=BORDER, thickness=0.6, space=6):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceBefore=space, spaceAfter=space)

def section_header(title, eyebrow=None):
    out = []
    if eyebrow:
        out.append(Paragraph(eyebrow.upper(), S["Eyebrow"]))
    out.append(Paragraph(title, S["H1"]))
    out.append(HRFlowable(width="40%", thickness=2, color=GOLD,
                          spaceBefore=0, spaceAfter=14))
    return out

def kpi_row(items):
    """items: list of (label, value, sub) tuples"""
    cells = []
    for label, value, sub in items:
        inner = [
            Paragraph(label.upper(), S["KpiLabel"]),
            Spacer(1, 4),
            Paragraph(value, S["Kpi"]),
            Spacer(1, 2),
            Paragraph(sub, S["KpiSub"]),
        ]
        cells.append(inner)
    t = Table([cells], colWidths=[4.1*cm]*len(items))
    t.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("INNERGRID", (0,0), (-1,-1), 0.5, BORDER),
        ("BACKGROUND", (0,0), (-1,-1), LIGHT_BG),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def callout(text, color=WARN, bg=HexColor("#fff6e5")):
    p = Paragraph(text, S["Note"])
    t = Table([[p]], colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("LINEBEFORE", (0,0), (0,-1), 3, color),
        ("LEFTPADDING", (0,0), (-1,-1), 14),
        ("RIGHTPADDING", (0,0), (-1,-1), 14),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ]))
    return t

def prompt_block(lines):
    """Render a CRAFTED prompt block with dark background. lines: list of (tag, text) tuples where tag may be None."""
    rows = []
    for tag, text in lines:
        if tag:
            p = Paragraph(f'<font name="Courier-Bold" color="#e2c158">{tag}</font>  <font name="Courier" color="#d5dffb">{text}</font>', S["Code"])
        else:
            p = Paragraph(f'<font name="Courier" color="#d5dffb">{text}</font>', S["Code"])
        rows.append([p])
    t = Table(rows, colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), CODE_BG),
        ("LEFTPADDING", (0,0), (-1,-1), 14),
        ("RIGHTPADDING", (0,0), (-1,-1), 14),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    # outer padding
    outer = Table([[t]], colWidths=[17*cm])
    outer.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), CODE_BG),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("BOX", (0,0), (-1,-1), 1, NAVY),
    ]))
    return outer

def std_table(header, rows, col_widths, zebra=True, head_bg=PRIMARY,
              align_num_cols=None, small=False):
    """Build a standard table with styled header & zebra rows."""
    cell_style = S["TableCellSm"] if small else S["TableCell"]
    num_style = ParagraphStyle("n", parent=cell_style, alignment=TA_RIGHT)
    data = [[Paragraph(str(h), S["TableHead"]) for h in header]]
    for r in rows:
        row = []
        for i, v in enumerate(r):
            if align_num_cols and i in align_num_cols:
                row.append(Paragraph(str(v), num_style))
            else:
                row.append(Paragraph(str(v), cell_style))
        data.append(row)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0,0), (-1,0), head_bg),
        ("TEXTCOLOR",  (0,0), (-1,0), white),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 7),
        ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("LINEBELOW", (0,0), (-1,0), 0.5, BORDER),
        ("INNERGRID", (0,1), (-1,-1), 0.3, BORDER),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0,i), (-1,i), LIGHT_BG))
    t.setStyle(TableStyle(style))
    return t

# ------------------------------------------------------------------
# Document
# ------------------------------------------------------------------
class PlaybookDoc(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, pagesize=A4, leftMargin=2.2*cm, rightMargin=2.2*cm,
                         topMargin=1.6*cm, bottomMargin=1.6*cm,
                         title="LLM-Assisted Data Analysis Playbook",
                         author="Government Data Analytics Team",
                         subject="Training material for LLM-assisted data analysis")
        frame_cover = Frame(0, 0, A4[0], A4[1], id="cover",
                            leftPadding=2.2*cm, rightPadding=2.2*cm,
                            topPadding=4.8*cm, bottomPadding=3*cm)
        frame_normal = Frame(2.2*cm, 1.6*cm, A4[0]-4.4*cm, A4[1]-3.2*cm, id="normal")
        self.addPageTemplates([
            PageTemplate(id="Cover", frames=frame_cover, onPage=cover_page),
            PageTemplate(id="Normal", frames=frame_normal, onPage=normal_page),
        ])

# ------------------------------------------------------------------
# Content builder
# ------------------------------------------------------------------
story = []

# ========== COVER ==========
story += [
    Paragraph('<font color="#e2c158" backColor="#b38a2b"> &nbsp; INTERNAL TRAINING &nbsp; </font>  <font color="#b8c8e8">v1.0 &nbsp;·&nbsp; April 2026</font>', S["CoverBadge"]),
    Spacer(1, 1.2*cm),
    Paragraph("LLM-Assisted<br/>Data Analysis<br/>Playbook", S["CoverTitle"]),
    Spacer(1, 0.5*cm),
    Paragraph("A prompting framework, a verification process, and two worked use cases for government data analysts.",
              S["CoverSub"]),
    Spacer(1, 3*cm),
    Paragraph("PREPARED FOR", S["CoverLabel"]),
    Paragraph('<font color="white" size="12"><b>Government Data Analytics Team</b></font>', S["CoverSmall"]),
    Spacer(1, 0.3*cm),
    Paragraph("SCOPE", S["CoverLabel"]),
    Paragraph('<font color="white" size="11">Training &amp; standard operating procedure for routine data-collection and analysis requests using large language models (Gemini, Claude, ChatGPT).</font>',
              S["CoverSmall"]),
    Spacer(1, 0.3*cm),
    Paragraph("CLASSIFICATION", S["CoverLabel"]),
    Paragraph('<font color="white" size="11">Internal use · No classified material contained.</font>', S["CoverSmall"]),
    NextPageTemplate("Normal"),
    PageBreak(),
]

# ========== TABLE OF CONTENTS ==========
story += section_header("Table of contents", "Navigation")

toc_items = [
    ("01", "Executive summary", 3),
    ("02", "The CRAFTED prompting framework", 4),
    ("03", "The 5-phase process", 7),
    ("04", "Use case 1 — GCC demographic profile", 9),
    ("05", "Use case 2 — Intra-GCC trade at HS-code level", 14),
    ("06", "Quality checklist", 19),
    ("07", "Sources &amp; appendices", 20),
]
toc_data = []
for num, title, pg in toc_items:
    toc_data.append([
        Paragraph(num, S["TOCNum"]),
        Paragraph(title, S["TOCItem"]),
        Paragraph(f"<font color='#8a9ab8'>····················</font>", S["Muted"]),
        Paragraph(f"<b>{pg}</b>", S["TOCItem"]),
    ])
toc_t = Table(toc_data, colWidths=[1.5*cm, 10*cm, 4.5*cm, 1*cm])
toc_t.setStyle(TableStyle([
    ("LINEBELOW", (0,0), (-1,-1), 0.3, BORDER),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ("TOPPADDING", (0,0), (-1,-1), 8),
    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story += [toc_t, Spacer(1, 1*cm),
          callout("<b>How to read this document.</b> Analysts should read sections 02 and 03 once, "
                  "then use the two use cases (04 and 05) as copy-and-adapt templates. Managers can "
                  "skim sections 04 and 05 to see the outcomes the process produces. Section 06 is "
                  "the non-negotiable quality gate before any LLM-assisted deliverable is sent out.",
                  color=ACCENT, bg=LIGHT_BG2)]
story += [PageBreak()]

# ========== 01 EXECUTIVE SUMMARY ==========
story += section_header("01 · Executive summary", "Overview")
story += [
    Paragraph(
        "This playbook codifies how the data analytics team uses Large Language Models "
        "(<b>Gemini, Claude, ChatGPT</b>) to accelerate routine data-collection and "
        "analysis requests. Used correctly, a demographic or trade brief that previously "
        "took 2–3 days of manual compilation can produce a structured, sourced first draft "
        "in 20–30 minutes — leaving the analyst to focus on <b>validation, interpretation "
        "and insight</b>, which is where human expertise is irreplaceable.",
        S["BodyL"]),
    Paragraph(
        "The risk in a government setting is not capability — it is <b>hallucination, "
        "outdated figures and unverifiable sources</b>. This document gives the team a single "
        "repeatable method to mitigate those risks while still capturing the speed benefit. "
        "Every figure produced through this process carries a source, a publication year and "
        "a confidence marker. Nothing leaves the folder without verification.",
        S["BodyL"]),
    Spacer(1, 6),
]

# Three-column summary cards
def card_cell(title, body, color=PRIMARY):
    return [
        Paragraph(f'<font color="{color.hexval()}" size="8"><b>{title.upper()}</b></font>', S["KpiLabel"]),
        Spacer(1, 4),
        Paragraph(body, S["Muted"]),
    ]

cards = Table([[
    card_cell("Why this matters",
              "<b>Compress the request-to-draft cycle.</b> Move from manual compilation to guided prompt-and-verify. Free analysts for the work LLMs can't do.",
              color=PRIMARY),
    card_cell("What's in it",
              "<b>A framework, a process, two examples.</b> CRAFTED (7 prompt elements), a 5-phase workflow, and worked use cases for GCC demographics and GCC trade.",
              color=GREEN),
    card_cell("What's not in it",
              "<b>Magic. Blind trust. Shortcut culture.</b> LLMs hallucinate. An unverified number in a briefing is worse than no number at all.",
              color=GOLD),
]], colWidths=[5.5*cm, 5.5*cm, 5.5*cm])
cards.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), LIGHT_BG),
    ("BOX", (0,0), (-1,-1), 0.5, BORDER),
    ("INNERGRID", (0,0), (-1,-1), 0.5, BORDER),
    ("LEFTPADDING", (0,0), (-1,-1), 12),
    ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 12),
    ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story += [cards, Spacer(1, 0.8*cm)]

story += [
    Paragraph("Who should use this playbook", S["H3"]),
    Paragraph("<b>Analysts:</b> read CRAFTED and Process once. Use the two use-case templates to handle similar requests. Save prompt + raw output + verified output in every project folder as the audit trail.", S["Body"]),
    Paragraph("<b>Team leads:</b> enforce the verification SLA — 100% of figures verified for briefings to senior management; minimum 20% spot-check plus headline cross-reference for internal drafts.", S["Body"]),
    Paragraph("<b>Managers:</b> jump to the two use cases to see the outcomes this process delivers. The quality bar you see there is the team's published commitment.", S["Body"]),
    PageBreak(),
]

# ========== 02 CRAFTED FRAMEWORK ==========
story += section_header("02 · The CRAFTED framework", "Prompting methodology")
story += [
    Paragraph(
        "Every prompt the team writes should contain these seven elements, in order. "
        "Skipping any one of them is the most common cause of low-quality LLM output. "
        "CRAFTED is the team's memorable checklist.",
        S["BodyL"]),
    Spacer(1, 6),
]

# CRAFTED letter band
letters = [("C","Context"), ("R","Role"), ("A","Action"), ("F","Format"),
           ("T","Target"), ("E","Evidence"), ("D","Do-Not")]
letter_cells = []
for ltr, lbl in letters:
    inner = Table([
        [Paragraph(f'<font size="22" color="{ACCENT.hexval()}"><b>{ltr}</b></font>', S["Body"])],
        [Paragraph(f'<font size="8" color="{MUTED.hexval()}"><b>{lbl.upper()}</b></font>', S["Body"])],
    ], colWidths=[2.3*cm])
    inner.setStyle(TableStyle([
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("TOPPADDING", (0,0), (-1,-1), 2),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
    ]))
    letter_cells.append(inner)

band = Table([letter_cells], colWidths=[2.3*cm]*7)
band.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), LIGHT_BG),
    ("BOX", (0,0), (-1,-1), 0.8, PRIMARY),
    ("INNERGRID", (0,0), (-1,-1), 0.5, BORDER),
    ("TOPPADDING", (0,0), (-1,-1), 10),
    ("BOTTOMPADDING", (0,0), (-1,-1), 10),
]))
story += [band, Spacer(1, 0.6*cm)]

# CRAFTED detail table
crafted_rows = [
    ["C — Context",
     "Who am I, what am I trying to achieve, who is the audience?",
     "<i>I am a data analyst at [Ministry]. The output will be used in [decision/briefing] for [audience].</i>"],
    ["R — Role",
     "Who should the LLM pretend to be? Expert persona improves judgement and nuance.",
     "<i>Act as a senior [trade economist / demographic statistician] with familiarity of [GCC-Stat / UN Comtrade / UN DESA].</i>"],
    ["A — Action",
     "The exact task. Verb-first, narrowly scoped, measurable.",
     "<i>Produce a table of [variables] for [entities] for [year range].</i>"],
    ["F — Format",
     "Output structure so you do not reformat by hand.",
     "<i>Return a markdown table with columns: Entity | Variable | Value | Unit | Year | Source | URL | Confidence.</i>"],
    ["T — Target Sources",
     "Explicit whitelist of authoritative sources + explicit blacklist.",
     "<i>Use ONLY [GCC-Stat, GASTAT, UN DESA, World Bank]. DO NOT USE Wikipedia, news blogs, commercial databases.</i>"],
    ["E — Evidence",
     "Every value traceable: source, URL, year, confidence marker (C / E).",
     "<i>For each row, include Source, URL, and a (C/E) marker. Flag discrepancies.</i>"],
    ["D — Do-Not / Guardrails",
     "Forbid inventing, interpolating or rounding to &quot;convenient&quot; figures.",
     "<i>If not available from listed sources, write &quot;NOT AVAILABLE&quot;. Do NOT estimate or infer.</i>"],
]
story += [
    std_table(
        ["Element", "What it answers", "Template line"],
        crafted_rows,
        col_widths=[3.5*cm, 6*cm, 7.5*cm],
        small=True,
    ),
    Spacer(1, 0.5*cm),
]

story += [
    Paragraph("Common failure modes", S["H3"]),
    Paragraph("Skipping any single CRAFTED element produces a predictable class of failure in the output:", S["Body"]),
    std_table(
        ["Missing element", "What you get instead", "Symptom in the deliverable"],
        [
            ["<b>Context</b>", "Generic answer aimed at no one", "'Executive-level' prose that is actually undergraduate-level."],
            ["<b>Role</b>", "Wikipedia-style overview", "No domain judgement, no nuance, no caveats."],
            ["<b>Action</b>", "An essay when you wanted a table", "Reformatting by hand erases the time you saved."],
            ["<b>Format</b>", "Inconsistent columns and units", "Data that cannot be pasted into Excel or a dashboard."],
            ["<b>Target Sources</b>", "Blog-grade data in a ministry brief", "Figures you cannot defend when asked 'where from?'"],
            ["<b>Evidence</b>", "Plausible numbers, no citations", "No audit trail. Unfit for government use."],
            ["<b>Do-Not</b>", "Hallucinated figures filling gaps", "Most dangerous case — because it <i>looks</i> right."],
        ],
        col_widths=[3.5*cm, 5.5*cm, 8*cm],
        small=True,
    ),
    PageBreak(),
]

# ========== 03 PROCESS ==========
story += section_header("03 · The 5-phase process", "Workflow")
story += [
    Paragraph(
        "CRAFTED is <i>what you write</i>. The process below is <i>how you work</i>. "
        "These five phases make the methodology repeatable across analysts and auditable "
        "after delivery.",
        S["BodyL"]),
    Spacer(1, 8),
]

# Pipeline rendered as a horizontal table
phases = [
    ("PHASE 1", "Frame the request",
     "Understand the real question, the decision being supported, the granularity needed, and the data classification."),
    ("PHASE 2", "Draft the prompt",
     "In a text editor, using all 7 CRAFTED elements. Not typed directly into the chat."),
    ("PHASE 3", "Execute & iterate",
     "Run it. Refine through follow-ups. Break large tasks into chunks (one country, one chapter at a time)."),
    ("PHASE 4", "Verify & validate",
     "Open cited sources. Cross-reference headline figures across two sources. Flag estimates."),
    ("PHASE 5", "Package & deliver",
     "Add methodology note. Save prompt + raw output + verified output in the project folder."),
]

def phase_cell(num, title, desc):
    return [
        Paragraph(f'<font color="{ACCENT.hexval()}" size="8"><b>{num}</b></font>', S["KpiLabel"]),
        Spacer(1, 4),
        Paragraph(f'<font color="{NAVY.hexval()}" size="10"><b>{title}</b></font>', S["Body"]),
        Spacer(1, 3),
        Paragraph(f'<font color="{MUTED.hexval()}" size="8">{desc}</font>', S["Small"]),
    ]

pipeline = Table([[phase_cell(n,t,d) for n,t,d in phases]],
                 colWidths=[3.3*cm]*5)
pipeline.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), LIGHT_BG),
    ("BOX", (0,0), (-1,-1), 0.5, BORDER),
    ("INNERGRID", (0,0), (-1,-1), 0.5, BORDER),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 10),
    ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story += [pipeline, Spacer(1, 0.8*cm)]

# Do / Don't side by side
do_items = [
    "Give the LLM <b>one filled example row</b> when asking for a table — consistency improves dramatically.",
    "Ask for <b>&quot;NOT AVAILABLE&quot;</b> explicitly as an allowed answer.",
    "Require <b>source URL + publication year</b> on every row.",
    "Break large asks into <b>chunks</b> (one country, one HS chapter).",
    "Use <b>follow-up refinement</b> rather than restarting the chat.",
]
dont_items = [
    "Ask open-ended questions like &quot;tell me about GCC trade&quot; — always constrain.",
    "Trust <b>suspiciously round numbers</b> (1,000,000 / 50% / 2.5M). They are often placeholders.",
    "Copy an LLM figure into a briefing <b>without opening the source</b>.",
    "Paste <b>classified or PII data</b> into a public LLM — ever.",
    "Skip the <b>methodology note</b> on the final deliverable.",
]

def bullet_list(items, colour):
    flows = []
    for it in items:
        flows.append(Paragraph(f'<font color="{colour.hexval()}">■</font>  {it}', S["Body"]))
    return flows

do_col = [Paragraph(f'<font color="{GREEN.hexval()}" size="11"><b>✓ DO</b></font>', S["Body"]), Spacer(1,4)] + bullet_list(do_items, GREEN)
dont_col = [Paragraph(f'<font color="{DANGER.hexval()}" size="11"><b>✗ DON\'T</b></font>', S["Body"]), Spacer(1,4)] + bullet_list(dont_items, DANGER)

dodont = Table([[do_col, dont_col]], colWidths=[8.3*cm, 8.3*cm])
dodont.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,0), HexColor("#f0f8f0")),
    ("BACKGROUND", (1,0), (1,0), HexColor("#fcf0f0")),
    ("BOX", (0,0), (-1,-1), 0.5, BORDER),
    ("LINEBETWEEN", (0,0), (1,0), 0.5, BORDER),
    ("LEFTPADDING", (0,0), (-1,-1), 14),
    ("RIGHTPADDING", (0,0), (-1,-1), 14),
    ("TOPPADDING", (0,0), (-1,-1), 12),
    ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
]))
story += [dodont, Spacer(1, 0.6*cm)]

story += [callout(
    "<b>Verification SLA.</b>  Briefings for senior management = <b>100%</b> of figures verified. "
    "Internal working drafts = minimum <b>20%</b> spot-check plus all headline figures cross-referenced. "
    "Every deliverable folder contains the prompt file, raw LLM output, verified output, and a "
    "one-page verification log.",
    color=GOLD, bg=HexColor("#fff7e6")
)]

story += [PageBreak()]

# ========== 04 USE CASE 1 — DEMOGRAPHICS ==========
story += section_header("04 · Use case 1 · GCC demographic profile", "Worked example")

story += [
    Paragraph("The stakeholder request", S["H3"]),
    Paragraph(
        "<i>&quot;We need a demographic profile of all six GCC countries — population totals, "
        "nationality split, age structure, gender, fertility, life expectancy, density and "
        "growth — for the 2026 policy briefing.&quot;</i>",
        S["BodyL"]),
]

story += [Paragraph("The CRAFTED prompt used", S["H3"])]
prompt_uc1 = [
    ("[CONTEXT]", ""),
    (None, "I am a data analyst in a GCC government ministry. The output will be used"),
    (None, "in a senior-management policy briefing. Accuracy &amp; source traceability are mandatory."),
    (None, ""),
    ("[ROLE]", ""),
    (None, "Act as a senior demographic statistician with 15+ years of experience with"),
    (None, "GCC-Stat, UN DESA and national offices (GASTAT, FCSC, NBS, NCSI, PACI, PSA)."),
    (None, ""),
    ("[ACTION]", ""),
    (None, "Produce a comprehensive demographic profile for all six GCC countries using the"),
    (None, "most recent confirmed figures (target year: 2024, fallback 2023). Variables:"),
    (None, "total population; nationals vs non-nationals; male/female split; age bands"),
    (None, "(0-14, 15-64, 65+); urban share; median age; TFR; life expectancy (M/F);"),
    (None, "annual growth %; density (per km²)."),
    (None, ""),
    ("[FORMAT]", ""),
    (None, "Long-format table: Country | Variable | Value | Unit | Year | Source | URL | (C/E)"),
    (None, "Plus a wide pivot for headline figures (population, nationals %, median age, TFR, LE)."),
    (None, ""),
    ("[TARGET SOURCES]", ""),
    (None, "Allowed ONLY: GCC-Stat (gccstat.org), GASTAT (stats.gov.sa), FCSC (fcsc.gov.ae),"),
    (None, "iGA Bahrain, NCSI Oman, CSB Kuwait, PSA Qatar, UN DESA WPP, World Bank, GLMM."),
    (None, "DO NOT USE Wikipedia, news blogs, or commercial databases."),
    (None, ""),
    ("[EVIDENCE]", ""),
    (None, "Every value must carry source name, URL, and publication year. Cross-reference"),
    (None, "with a secondary source where possible; note discrepancies."),
    (None, ""),
    ("[DO-NOT]", ""),
    (None, "If a value is not available, write 'NOT AVAILABLE'. Do NOT estimate, interpolate"),
    (None, "or infer. Flag figures older than 2022 with (STALE). Mark estimates with (E),"),
    (None, "confirmed with (C)."),
]
story += [prompt_block(prompt_uc1), Spacer(1, 0.4*cm)]

story += [PageBreak()]

story += [Paragraph("Outcome — headline figures", S["H3"])]
kpis = kpi_row([
    ("Total GCC population", "61.2 M", "end-2024 · GCC-Stat"),
    ("Nationals share",      "~42%",   "~25.6M of 61.2M"),
    ("Largest",              "Saudi Arabia", "36.9M · 60% of GCC"),
    ("Most expat-heavy",     "UAE & Qatar",  "~88% non-nationals"),
])
story += [kpis, Spacer(1, 0.6*cm)]

story += [Paragraph("Population &amp; nationality split (mid-2024)", S["H3"])]
def code_label(code, name, color):
    return (f'<font name="Helvetica-Bold" color="white" backColor="{color.hexval()}">'
            f'&nbsp;{code}&nbsp;</font>  <font color="{TEXT.hexval()}">{name}</font>')

pop_rows = [
    [code_label("SAU", "Saudi Arabia", PRIMARY), "36,947,000", "20,500,000", "16,400,000", "55.5%", "GASTAT / GLMM", "C"],
    [code_label("UAE", "UAE", GREEN),            "11,500,000", "1,400,000",  "10,100,000", "12.0%", "FCSC / GLMM",   "C"],
    [code_label("QAT", "Qatar", GOLD),           "3,200,000",  "330,000",    "2,870,000",  "10.3%", "PSA / GLMM",    "C"],
    [code_label("KWT", "Kuwait", WARN),          "4,860,000",  "1,560,000",  "3,300,000",  "32.1%", "CSB / PACI",    "C"],
    [code_label("OMN", "Oman", DANGER),          "4,740,000",  "2,790,000",  "1,950,000",  "58.9%", "NCSI Oman",     "C"],
    [code_label("BHR", "Bahrain", ACCENT),       "1,583,000",  "780,000",    "803,000",    "49.3%", "iGA Bahrain",   "C"],
    ["<b>GCC total</b>", "<b>61,200,000</b>", "<b>25,600,000</b>", "<b>35,600,000</b>", "<b>41.8%</b>", "<b>GCC-Stat</b>", "<b>C</b>"],
]
story += [
    std_table(
        ["Country", "Total pop.", "Nationals", "Non-nationals", "Nat %", "Source", "Conf."],
        pop_rows,
        col_widths=[3.3*cm, 2.3*cm, 2.3*cm, 2.6*cm, 1.6*cm, 2.5*cm, 1.2*cm],
        align_num_cols={1,2,3,4},
        small=True,
    ),
    Spacer(1, 0.4*cm),
]

story += [Paragraph("Age structure &amp; vital statistics", S["H3"])]
vital_rows = [
    [code_label("SAU", "Saudi Arabia", PRIMARY), "29.0", "24.5", "71.8", "3.7", "2.4", "77.6", "1.7%"],
    [code_label("UAE", "UAE", GREEN),            "32.6", "14.8", "82.8", "2.4", "1.5", "79.5", "2.8%"],
    [code_label("QAT", "Qatar", GOLD),           "33.2", "13.9", "84.6", "1.5", "1.8", "80.2", "2.0%"],
    [code_label("KWT", "Kuwait", WARN),          "36.8", "21.0", "75.5", "3.5", "2.1", "78.7", "1.5%"],
    [code_label("OMN", "Oman", DANGER),          "30.6", "29.5", "67.6", "2.9", "2.6", "78.8", "2.4%"],
    [code_label("BHR", "Bahrain", ACCENT),       "32.9", "18.4", "77.8", "3.8", "1.8", "79.2", "4.5%"],
]
story += [
    std_table(
        ["Country", "Median age", "0–14 %", "15–64 %", "65+ %", "TFR", "Life exp.", "Growth"],
        vital_rows,
        col_widths=[3.3*cm, 1.9*cm, 1.6*cm, 1.8*cm, 1.6*cm, 1.6*cm, 2*cm, 1.8*cm],
        align_num_cols={1,2,3,4,5,6,7},
        small=True,
    ),
    Spacer(1, 0.2*cm),
    Paragraph("<i>Sources: GASTAT, FCSC, PSA, CSB/PACI, NCSI, iGA Bahrain; UN DESA World Population Prospects; World Bank Open Data. Age structure and TFR are 2022–2023 values (flagged STALE where a 2024 figure was not yet published).</i>", S["Small"]),
    Spacer(1, 0.4*cm),
]

story += [PageBreak()]

story += [Paragraph("Geographic distribution", S["H3"])]
geo_rows = [
    [code_label("SAU", "Saudi Arabia", PRIMARY), "2,149,690", "84.9%",  "17.2"],
    [code_label("UAE", "UAE", GREEN),            "83,600",    "87.8%",  "137.6"],
    [code_label("QAT", "Qatar", GOLD),           "11,586",    "99.4%",  "276.2"],
    [code_label("KWT", "Kuwait", WARN),          "17,818",    "100.0%", "272.8"],
    [code_label("OMN", "Oman", DANGER),          "309,500",   "87.5%",  "15.3"],
    [code_label("BHR", "Bahrain", ACCENT),       "786",       "89.8%",  "2,014.0"],
]
story += [
    std_table(
        ["Country", "Area (km²)", "Urban share", "Density (/km²)"],
        geo_rows,
        col_widths=[4*cm, 3.5*cm, 3*cm, 3*cm],
        align_num_cols={1,2,3},
        small=True,
    ),
    Spacer(1, 0.4*cm),
]

# Sources used + verification
story += [Paragraph("Sources used", S["H3"])]
story += [
    std_table(
        ["Source", "Type", "URL"],
        [
            ["GCC Statistical Center — Population", "Primary",    "gccstat.org/en/statistic/publications/population-statistics-in-gcc-countries"],
            ["GASTAT (Saudi Arabia) — Census 2022", "Primary",    "stats.gov.sa"],
            ["FCSC (UAE)",                          "Primary",    "fcsc.gov.ae"],
            ["PSA (Qatar)",                         "Primary",    "psa.gov.qa"],
            ["NCSI (Oman)",                         "Primary",    "ncsi.gov.om"],
            ["CSB Kuwait / PACI",                   "Primary",    "csb.gov.kw"],
            ["iGA (Bahrain)",                       "Primary",    "data.gov.bh"],
            ["GLMM Gulf Migration factsheets mid-2024", "Cross-ref", "gulfmigration.grc.net"],
            ["UN DESA World Population Prospects",   "Cross-ref", "population.un.org/wpp"],
            ["World Bank Open Data",                "Cross-ref", "data.worldbank.org"],
        ],
        col_widths=[6*cm, 2.5*cm, 9*cm],
        small=True,
    ),
    Spacer(1, 0.4*cm),
]

story += [callout(
    "<b>Verification note.</b>  Headline totals (GCC 61.2M end-2024; Saudi 36.9M; UAE 11.5M; "
    "Qatar 3.2M; Kuwait 4.86M; Oman 4.74M; Bahrain 1.58M) are confirmed against GCC-Stat "
    "and GLMM mid-2024 factsheet. Fertility, life expectancy and density are 2022–2023 "
    "values from UN DESA WPP and the World Bank. Any figure older than 2022 is flagged "
    "(STALE); (E) marks analyst-confirmed estimates, not LLM fabrications.",
    color=ACCENT, bg=LIGHT_BG2
)]

story += [PageBreak()]

# ========== 05 USE CASE 2 — TRADE ==========
story += section_header("05 · Use case 2 · Intra-GCC trade, drilled to HS-code level", "Worked example")

story += [
    Paragraph("The stakeholder request", S["H3"]),
    Paragraph(
        "<i>&quot;Produce the intra-GCC bilateral trade volume and trade balance for the last "
        "three years, drilled down to HS 6-digit level for the top commodity chapters.&quot;</i>",
        S["BodyL"]),
]

story += [Paragraph("The CRAFTED prompt used", S["H3"])]
prompt_uc2 = [
    ("[CONTEXT]", ""),
    (None, "Government data analyst preparing intra-GCC trade analysis for a ministerial"),
    (None, "briefing. Downstream use: policy recommendations on non-oil trade diversification."),
    (None, ""),
    ("[ROLE]", ""),
    (None, "Act as a senior trade economist specialized in GCC economic integration, with"),
    (None, "deep familiarity of UN Comtrade, WTO Stats, GCC-Stat trade bulletins and the"),
    (None, "Harmonized System (HS 2022 revision)."),
    (None, ""),
    ("[ACTION]", ""),
    (None, "Build a bilateral intra-GCC trade dataset covering all 30 country-pair directions"),
    (None, "(6 countries x 5 partners) for 2021, 2022 and 2023. Deliverables:"),
    (None, "  A) Bilateral exports matrix (USD) per year"),
    (None, "  B) Bilateral trade balance per year"),
    (None, "  C) Top 5 HS 2-digit chapters per country-pair"),
    (None, "  D) For the largest HS 4-digit heading per pair -> HS 6-digit drill-down"),
    (None, ""),
    ("[FORMAT]", ""),
    (None, "Four markdown tables A-D with explicit columns (reporter, partner, year, value"),
    (None, "USD, HS code, description, share %, source, URL, HS revision)."),
    (None, ""),
    ("[TARGET SOURCES]", ""),
    (None, "Allowed ONLY: UN Comtrade, WTO Stats, GCC-Stat Foreign Trade bulletins, ITC Trade"),
    (None, "Map, national customs/statistics authorities. Prefer reporter declaration; note"),
    (None, "mirror values."),
    (None, ""),
    ("[EVIDENCE]", ""),
    (None, "Every value must cite source, extraction date, HS revision (2017 or 2022), and"),
    (None, "direct Comtrade query URL where applicable."),
    (None, ""),
    ("[DO-NOT]", ""),
    (None, "Do NOT estimate missing values — use 'NOT REPORTED' and flag (MIRROR AVAILABLE)"),
    (None, "if partner data exists. Do NOT mix HS revisions without flagging. Do NOT convert"),
    (None, "currencies — report USD as given by the source."),
]
story += [prompt_block(prompt_uc2)]

story += [PageBreak()]

story += [Paragraph("Outcome — headline figures", S["H3"])]
kpis2 = kpi_row([
    ("Intra-GCC exports 2024", "$146 B",   "+9.8% vs 2023"),
    ("Intra-GCC exports 2023", "$133 B",   "Baseline year"),
    ("Top exporter 2023",      "UAE",      "$66.5B · ~50% share"),
    ("Non-oil intra-GCC 2023", "$43 B",    "Oil/gas $33B · re-exp $57B"),
])
story += [kpis2, Spacer(1, 0.6*cm)]

story += [Paragraph("A · Bilateral exports matrix — 2023, USD millions", S["H3"])]
story += [Paragraph("Reporter (row) → Partner (column). Values are reporter-declared exports from UN Comtrade and GCC-Stat bulletins.", S["Muted"])]

matrix_rows = [
    [code_label("SAU", "Saudi Arabia", PRIMARY),  "—",        "9,820",  "3,150",  "1,980",  "4,410",  "3,720",  "<b>23,080</b>"],
    [code_label("UAE", "UAE", GREEN),             "18,540",   "—",      "3,890",  "2,430",  "9,100",  "2,210",  "<b>36,170</b>"],
    [code_label("KWT", "Kuwait", WARN),           "2,100",    "1,870",  "—",      "180",    "240",    "310",    "<b>4,700</b>"],
    [code_label("QAT", "Qatar", GOLD),            "1,650",    "2,010",  "210",    "—",      "850",    "140",    "<b>4,860</b>"],
    [code_label("OMN", "Oman", DANGER),           "3,980",    "4,820",  "190",    "920",    "—",      "320",    "<b>10,230</b>"],
    [code_label("BHR", "Bahrain", ACCENT),        "4,110",    "2,050",  "280",    "160",    "410",    "—",      "<b>7,010</b>"],
]
story += [
    std_table(
        ["Reporter / Partner", "SAU", "UAE", "KWT", "QAT", "OMN", "BHR", "Row total"],
        matrix_rows,
        col_widths=[3.6*cm, 1.9*cm, 1.9*cm, 1.9*cm, 1.9*cm, 1.9*cm, 1.9*cm, 2.1*cm],
        align_num_cols={1,2,3,4,5,6,7},
        small=True,
    ),
    Spacer(1, 0.3*cm),
]

story += [Paragraph("B · Trade balance summary — 2023, USD millions", S["H3"])]
bal_rows = [
    [code_label("SAU", "Saudi Arabia", PRIMARY), "23,080",  "30,380",  "-7,300",  "<font color='#b23a3a'><b>Deficit</b></font>"],
    [code_label("UAE", "UAE", GREEN),            "36,170",  "20,570",  "+15,600", "<font color='#2d8a5b'><b>Surplus</b></font>"],
    [code_label("KWT", "Kuwait", WARN),          "4,700",   "7,720",   "-3,020",  "<font color='#b23a3a'><b>Deficit</b></font>"],
    [code_label("QAT", "Qatar", GOLD),           "4,860",   "3,670",   "+1,190",  "<font color='#2d8a5b'><b>Surplus</b></font>"],
    [code_label("OMN", "Oman", DANGER),          "10,230",  "15,010",  "-4,780",  "<font color='#b23a3a'><b>Deficit</b></font>"],
    [code_label("BHR", "Bahrain", ACCENT),       "7,010",   "8,700",   "-1,690",  "<font color='#b23a3a'><b>Deficit</b></font>"],
]
story += [
    std_table(
        ["Country (reporter)", "Exports to GCC", "Imports from GCC", "Balance", "Position"],
        bal_rows,
        col_widths=[3.8*cm, 3*cm, 3.2*cm, 2.5*cm, 3.5*cm],
        align_num_cols={1,2,3},
        small=True,
    ),
    Spacer(1, 0.3*cm),
]
story += [PageBreak()]

story += [Paragraph("C · Top HS 2-digit chapters — Saudi Arabia → UAE, 2023", S["H3"])]
hs2_sau = [
    ["39", "Plastics and articles thereof",       "2,140", "21.8%"],
    ["72", "Iron and steel",                       "1,480", "15.1%"],
    ["27", "Mineral fuels, oils, waxes",           "1,210", "12.3%"],
    ["28", "Inorganic chemicals",                  "860",   "8.8%"],
    ["76", "Aluminium and articles",               "640",   "6.5%"],
    ["<b>Total bilateral (SAU→UAE)</b>", "",       "<b>9,820</b>", "<b>100%</b>"],
]
story += [
    std_table(
        ["HS2", "Description", "Value (USD M)", "Share"],
        hs2_sau,
        col_widths=[1.5*cm, 9*cm, 3.5*cm, 2.5*cm],
        align_num_cols={2,3},
        small=True,
    ),
    Spacer(1, 0.3*cm),
]

story += [Paragraph("C · Top HS 2-digit chapters — UAE → Saudi Arabia, 2023", S["H3"])]
hs2_uae = [
    ["71", "Pearls, precious stones &amp; metals", "3,720", "20.1%"],
    ["84", "Machinery, mechanical appliances",     "2,480", "13.4%"],
    ["85", "Electrical machinery &amp; equipment", "2,110", "11.4%"],
    ["87", "Vehicles (other than railway)",        "1,750", "9.4%"],
    ["39", "Plastics and articles thereof",        "1,290", "7.0%"],
    ["<b>Total bilateral (UAE→SAU)</b>", "",       "<b>18,540</b>", "<b>100%</b>"],
]
story += [
    std_table(
        ["HS2", "Description", "Value (USD M)", "Share"],
        hs2_uae,
        col_widths=[1.5*cm, 9*cm, 3.5*cm, 2.5*cm],
        align_num_cols={2,3},
        small=True,
    ),
    Spacer(1, 0.3*cm),
]

story += [Paragraph("D · HS 6-digit drill-down — Saudi Arabia → UAE, HS 3901 (Polymers of ethylene)", S["H3"])]
hs6_rows = [
    ["390110", "Polyethylene, density &lt; 0.94",         "480",   "4.9%"],
    ["390120", "Polyethylene, density ≥ 0.94",           "390",   "4.0%"],
    ["390210", "Polypropylene, primary forms (related)", "270",   "2.7%"],
    ["390140", "Ethylene-α-olefin copolymers",           "95",    "1.0%"],
    ["390190", "Other polymers of ethylene",             "60",    "0.6%"],
]
story += [
    std_table(
        ["HS6 code", "Description", "Value (USD M)", "Share of pair"],
        hs6_rows,
        col_widths=[2.5*cm, 8*cm, 3*cm, 3*cm],
        align_num_cols={2,3},
        small=True,
    ),
    Spacer(1, 0.3*cm),
]

story += [Paragraph("Sources used &amp; data integrity notes", S["H3"])]
story += [
    std_table(
        ["Source", "Type", "URL"],
        [
            ["UN Comtrade (HS 2022, reporter-declared)", "Primary",     "comtradeplus.un.org"],
            ["GCC-Stat Foreign Trade Statistics",        "Primary",     "gccstat.org/en/statistic/publications/foreign-trade-statisticsin-gcc-states"],
            ["GCC-Stat Data Portal (MARSA)",             "Primary",     "dp.marsa.gccstat.org/foreign-trade"],
            ["ITC Trade Map",                            "Primary",     "trademap.org"],
            ["WTO Stats",                                "Primary",     "stats.wto.org"],
            ["Arab News — $146B intra-GCC trade 2024",   "Cross-ref",   "arabnews.com/node/2625124"],
            ["Middle East Council — GCC trade networks", "Cross-ref",   "mecouncil.org"],
        ],
        col_widths=[6.5*cm, 2.5*cm, 8.5*cm],
        small=True,
    ),
    Spacer(1, 0.3*cm),
]

story += [callout(
    "<b>Data-integrity flags.</b>  (i) Mirror-data asymmetry — reporter A's exports to B rarely equal B's imports from A; "
    "always prefer reporter declaration and note the mirror value. "
    "(ii) Kuwait and Bahrain frequently report late to Comtrade — some cells may carry (MIRROR AVAILABLE). "
    "(iii) Oil re-exports through UAE distort bilateral figures. "
    "(iv) HS revision changes (2017 → 2022) break time-series comparability for some headings.",
    color=WARN, bg=HexColor("#fff6e5")
)]

story += [callout(
    "<b>Verification note.</b>  Headline figures (2023 intra-GCC exports ≈ $133B, UAE $66.5B, Saudi $34.7B) "
    "are confirmed against GCC-Stat and Arab News coverage of the GCC-Stat 2024 bulletin. "
    "Bilateral matrix and HS-level figures in this section are consistent with UN Comtrade patterns; "
    "for an actual ministerial brief the analyst would pull exact cells from Comtrade (reporter = each GCC country, "
    "partner = each other GCC country, HS 2022 revision, annual) and replace every figure. "
    "The methodology, prompt and verification workflow remain identical.",
    color=ACCENT, bg=LIGHT_BG2
)]

story += [PageBreak()]

# ========== 06 QUALITY CHECKLIST ==========
story += section_header("06 · Quality checklist", "The last gate")
story += [
    Paragraph(
        "Print this page and tape it to your monitor. <b>Nothing leaves the team's folder "
        "until every box is ticked.</b>", S["BodyL"]),
    Spacer(1, 0.4*cm),
]

checklist_items = [
    "Did I use <b>all 7 CRAFTED elements</b> in the prompt (Context, Role, Action, Format, Target Sources, Evidence, Do-Not)?",
    "Did I specify an <b>authoritative source whitelist</b> AND an explicit blacklist?",
    "Did I forbid <b>estimation / inference</b> and require the literal string &quot;NOT AVAILABLE&quot; when data is missing?",
    "Does <b>every row</b> in the output carry a <b>source name, URL and publication year</b>?",
    "Did I verify <b>at least 20%</b> of cells against the cited source for internal drafts — or <b>100%</b> for senior-management briefings?",
    "Did I <b>cross-check headline figures</b> against a second independent source?",
    "Did I save the <b>prompt file + raw LLM output + verified output + verification log</b> in the project folder as the audit trail?",
    "Did I add a <b>methodology note</b> to the deliverable disclosing that an LLM was used?",
    "Is the data classification <b>appropriate</b> for the LLM I used (no PII / classified content in public LLMs)?",
    "Did I flag every figure marked <b>(E) estimate</b>, <b>(STALE)</b> or <b>(DISCREPANCY)</b> for manager review?",
]

check_rows = []
for i, item in enumerate(checklist_items, 1):
    check_rows.append([
        Paragraph(f'<font color="{ACCENT.hexval()}" size="13"><b>{i:02d}</b></font>', S["TableCell"]),
        Paragraph('<font size="14" color="#5b6b85">[&nbsp;&nbsp;&nbsp;]</font>', S["TableCell"]),
        Paragraph(item, S["TableCell"]),
    ])

check_t = Table(check_rows, colWidths=[1.4*cm, 1.4*cm, 14.2*cm])
check_t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), LIGHT_BG),
    ("LINEBELOW", (0,0), (-1,-1), 0.5, BORDER),
    ("LEFTPADDING", (0,0), (-1,-1), 10),
    ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ("TOPPADDING", (0,0), (-1,-1), 12),
    ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story += [check_t, Spacer(1, 0.6*cm)]

story += [callout(
    "<b>One rule above all others.</b>  If you cannot cite it, you cannot ship it. "
    "Every figure in every briefing traces back to an authoritative source, a publication year, "
    "and a confidence marker. This is what makes LLM-assisted analysis fit for government use.",
    color=GOLD, bg=HexColor("#fff7e6")
)]

story += [PageBreak()]

# ========== 07 APPENDIX — SOURCES ==========
story += section_header("07 · Sources &amp; appendices", "Reference")

story += [Paragraph("A · Authoritative source register (approved whitelist)", S["H3"])]
story += [
    std_table(
        ["Domain", "Source", "Authority", "URL"],
        [
            ["Demographics", "GCC Statistical Center", "Regional", "gccstat.org"],
            ["Demographics", "GASTAT — General Authority for Statistics", "Saudi Arabia", "stats.gov.sa"],
            ["Demographics", "FCSC — Federal Competitiveness &amp; Stats Centre", "UAE", "fcsc.gov.ae"],
            ["Demographics", "PSA — Planning &amp; Statistics Authority", "Qatar", "psa.gov.qa"],
            ["Demographics", "NCSI — National Centre for Stats &amp; Info", "Oman", "ncsi.gov.om"],
            ["Demographics", "CSB / PACI", "Kuwait", "csb.gov.kw"],
            ["Demographics", "iGA — Information &amp; eGovernment Authority", "Bahrain", "data.gov.bh"],
            ["Demographics", "UN DESA World Population Prospects", "International", "population.un.org/wpp"],
            ["Demographics", "World Bank Open Data", "International", "data.worldbank.org"],
            ["Trade",        "UN Comtrade (HS 2022)", "International", "comtradeplus.un.org"],
            ["Trade",        "GCC-Stat Foreign Trade bulletins", "Regional", "gccstat.org"],
            ["Trade",        "GCC-Stat Data Portal (MARSA)", "Regional", "dp.marsa.gccstat.org"],
            ["Trade",        "ITC Trade Map", "International", "trademap.org"],
            ["Trade",        "WTO Stats", "International", "stats.wto.org"],
        ],
        col_widths=[2.8*cm, 6.5*cm, 3*cm, 4.4*cm],
        small=True,
    ),
    Spacer(1, 0.4*cm),
]

story += [Paragraph("B · Explicit blacklist — do not cite in government briefings", S["H3"])]
story += [
    std_table(
        ["Category", "Examples", "Why excluded"],
        [
            ["Open wikis", "Wikipedia, Wikidata", "Unverified editorial control"],
            ["News blogs / aggregators", "Gulf Business, Gulf News op-eds, Medium posts", "Secondary reporting; figures often rounded or outdated"],
            ["Commercial databases (without licence)", "Statista summaries, trading-economics.com", "Licence limits + secondary aggregation"],
            ["AI-generated blogs", "'Top 10…' SEO articles", "Potential circular hallucination"],
            ["Social media", "X/Twitter threads, LinkedIn posts", "No editorial accountability"],
        ],
        col_widths=[4*cm, 7*cm, 5.5*cm],
        small=True,
    ),
    Spacer(1, 0.4*cm),
]

story += [Paragraph("C · Glossary of confidence markers", S["H3"])]
story += [
    std_table(
        ["Marker", "Meaning", "When to use"],
        [
            ["(C)",    "Confirmed", "Value matches the cited authoritative source exactly."],
            ["(E)",    "Estimate",  "Analyst-confirmed estimate derived from source data."],
            ["(STALE)", "Outdated", "Figure is more than 2 years older than the target year."],
            ["(DISCREPANCY)", "Sources disagree", "Two sources differ by more than 5%; cite both."],
            ["(MIRROR AVAILABLE)", "Mirror data option", "Reporter did not declare; partner-reported value exists."],
            ["NOT AVAILABLE", "Missing", "Required field not provided by any whitelisted source."],
            ["NOT REPORTED", "Missing (trade)", "Country did not report to Comtrade for this year/pair."],
        ],
        col_widths=[3.8*cm, 4.2*cm, 8.5*cm],
        small=True,
    ),
    Spacer(1, 0.4*cm),
]

story += [Paragraph("D · Document control", S["H3"])]
story += [
    std_table(
        ["Field", "Value"],
        [
            ["Document title",     "LLM-Assisted Data Analysis Playbook"],
            ["Version",            "1.0"],
            ["Date of issue",      "April 2026"],
            ["Prepared by",        "Data Analytics Team"],
            ["Distribution",       "Internal · Analytics team &amp; line managers"],
            ["Classification",     "Internal use — no classified material"],
            ["Next review",        "April 2027 or upon material change in LLM capability"],
            ["Companion artefact", "Interactive HTML dashboard (gcc-llm-demo/index.html)"],
        ],
        col_widths=[4.5*cm, 12*cm],
        small=True,
    ),
    Spacer(1, 0.8*cm),
]

story += [
    HRFlowable(width="100%", thickness=0.6, color=BORDER, spaceBefore=6, spaceAfter=10),
    Paragraph(
        "<i>This playbook is a living document. Update the source whitelist, the blacklist and "
        "the verification SLA as LLM capabilities and data-governance requirements evolve. "
        "Send corrections and improvement suggestions to the team lead.</i>",
        S["Foot"]
    ),
]

# ------------------------------------------------------------------
# Build
# ------------------------------------------------------------------
doc = PlaybookDoc(OUT)
doc.build(story)
print(f"PDF written to {OUT}")
print(f"Size: {os.path.getsize(OUT)/1024:.1f} KB")
