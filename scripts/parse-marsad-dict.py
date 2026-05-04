"""Parse the Marsad Integration Data Dictionary text export into structured JSON.

Reads the pdftotext -layout output, splits it into domains and numbered elements,
and extracts the well-known metadata fields (Definition, Data Type, Format,
Mandatory/Optional, Encounter Types, Code Set, Validation Rules, Maximum
Occurrences, Element Classification, Guidance for Use) plus any code tables.
"""

import json
import re
import sys
from pathlib import Path

SRC = Path(r"C:/Users/FahadAlsaawi/Downloads/marsad_dict.txt")
DST = Path(r"C:/Users/FahadAlsaawi/Documents/Tadawul Devlopment/src/lib/marsad-dictionary.json")

# Top-level domain headers exactly as they appear in the TOC.
DOMAINS = [
    "PATIENT PROFILE",
    "HIS SCHEDULING",
    "OUTPATIENT",
    "EMERGENCY",
    "INPATIENT",
    "INPATIENT ADMISSION ASSESSMENT",
    "BED MANAGEMENT",
    "IMMUNIZATION / VACCINATION",
    "LABORATORY",
    "RADIOLOGY",
    "PHARMACY (DISPENSED)",
    "SURGERY",
    "BLOOD BANK",
    "CHILDBIRTH",
    "DEATH",
    "DIALYSIS",
    "DENTAL OPD",
    "MAWID APPOINTMENT",
    "MAWID SCHEDULING",
]

# Order matters — match longest first so "INPATIENT ADMISSION ASSESSMENT" wins
# over "INPATIENT".
DOMAINS_SORTED = sorted(DOMAINS, key=len, reverse=True)

PAGE_FOOTER = re.compile(r"^Marsad Integration Data Dictionary V4\.4.*\d+\s*\|\s*P\s*a\s*g\s*e\s*$")

# A line like "1. PATIENT NAME [1]" or "23. PRINCIPAL DIAGNOSIS [1]".
ELEMENT_HEADER = re.compile(r"^\s*(\d{1,2})\.\s+([A-Z][A-Z0-9 /\-\(\)\[\]&\.\,]+?)\s*$")

# Field labels we try to extract. Order = preferred display order.
FIELDS = [
    ("definition", ["Definition"]),
    ("dataType", ["Data Type"]),
    ("format", ["Format"]),
    ("mandatory", ["Mandatory / Optional", "Mandatory/Optional"]),
    ("encounterTypes", ["Valid Encounter Types", "Encounter Types"]),
    ("codeSet", ["Code Set", "Code set"]),
    ("guidance", ["Guidance for Use"]),
    ("validationRules", ["Validation Rules"]),
    ("maxOccurrences", ["Maximum Occurrences"]),
    ("classification", ["Element Classification"]),
]
ALL_LABELS = [lab for _, labs in FIELDS for lab in labs]


def strip_pages(lines):
    """Remove page-footer lines and blank lines that bracket them."""
    out = []
    for ln in lines:
        if PAGE_FOOTER.match(ln.strip()):
            continue
        out.append(ln)
    return out


def find_domain_starts(lines):
    """Return list of (line_idx, domain_name) for the first occurrence of each
    domain header *after* the table of contents (i.e. after the 'OVERVIEW'
    section). Body headers look like ``DOMAIN:`` optionally followed by table
    headers (``Requirement  Confidential``). TOC entries are excluded by
    rejecting lines containing dot leaders."""
    overview_idx = next((i for i, l in enumerate(lines) if l.strip() == "OVERVIEW"), 0)
    starts = []
    seen = set()
    for i in range(overview_idx, len(lines)):
        line = lines[i]
        stripped = line.strip()
        if "..." in stripped:  # TOC dot leaders
            continue
        for d in DOMAINS_SORTED:
            if d in seen:
                continue
            # match "DOMAIN" or "DOMAIN:" optionally followed by whitespace and
            # extra column headers.
            if stripped == d or stripped == d + ":" or stripped.startswith(d + ":"):
                starts.append((i, d))
                seen.add(d)
                break
    starts.sort()
    return starts


def find_element_starts(lines, lo, hi):
    """Find element headers between [lo, hi)."""
    out = []
    for i in range(lo, hi):
        m = ELEMENT_HEADER.match(lines[i])
        if not m:
            continue
        # Filter out footnote-only lines or stray TOC dribbles. Real element
        # headers have a blank line above (or are right after the domain
        # header) and have the "DATA ELEMENT" / "DESCRIPTION" header somewhere
        # within the next ~10 lines.
        window = "\n".join(lines[i + 1 : i + 12])
        if "DATA ELEMENT" not in window and "Definition" not in window:
            continue
        name = m.group(2).strip()
        # Skip lines that look like dotted TOC entries (already filtered by
        # ELEMENT_HEADER, but be safe).
        if "..." in lines[i]:
            continue
        out.append((i, int(m.group(1)), name))
    return out


def extract_fields(body):
    """Given the raw body text of one element, return a dict of extracted
    fields. We do this by walking line by line and assigning text to whichever
    label was last seen until the next label is hit."""
    text = body
    # Build a regex that matches any known label as the leading non-space
    # content of a line.
    label_alt = "|".join(re.escape(l) for l in ALL_LABELS)
    label_re = re.compile(rf"^\s*({label_alt})\b\s*(.*)$")

    sections = {}
    current = None
    for raw in text.splitlines():
        line = raw.rstrip()
        m = label_re.match(line)
        if m:
            current = m.group(1)
            rest = m.group(2).strip()
            sections.setdefault(current, []).append(rest)
        else:
            if current is None:
                continue
            sections[current].append(line.strip())

    # Normalize: collapse blank-trail lines, strip empty leading/trailing.
    out = {}
    for label, parts in sections.items():
        # Drop leading empties
        while parts and not parts[0]:
            parts.pop(0)
        while parts and not parts[-1]:
            parts.pop()
        out[label] = "\n".join(parts).strip()

    # Map label -> our key.
    extracted = {}
    for key, labels in FIELDS:
        for lab in labels:
            if lab in out and out[lab]:
                extracted[key] = out[lab]
                break

    # Strip the redundant inline code table from `codeSet` — we extract it
    # separately into `codeTable`. Keep only the standard/scheme line(s) above
    # the "Code   Short Description ..." header.
    if "codeSet" in extracted:
        cs = extracted["codeSet"]
        cut = re.split(r"\n\s*Code\s{2,}", cs, maxsplit=1)
        head = cut[0].strip()
        extracted["codeSet"] = head if head else cs.strip()

    # Trim trailing blank/empty bullets and noise.
    for k, v in list(extracted.items()):
        v = re.sub(r"\n{3,}", "\n\n", v).strip()
        extracted[k] = v

    # The PDF's two-column layout sometimes wraps long Definition / Guidance
    # text onto rows that visually align with shorter labels, so an extracted
    # "Data Type" or "Classification" can end up being prose. Whitelist the
    # canonical enum values and reject anything else for these fields.
    CANONICAL = {
        "dataType": {
            "numeric", "alphabet", "alphanumeric", "date", "date time stamp",
            "time stamp", "text", "variable character", "number", "boolean",
            "free text",
        },
        "mandatory": {"mandatory", "optional"},
        "classification": {"public", "confidential", "secret", "top secret"},
    }
    SHORT_FIELDS = {"dataType", "format", "mandatory", "encounterTypes", "maxOccurrences", "classification"}
    for k in list(extracted.keys()):
        if k not in SHORT_FIELDS:
            continue
        v = extracted[k]
        first = v.split("\n")[0].strip()
        if k in CANONICAL:
            # Match case-insensitive against canonical values; allow trailing
            # extra words like "Mandatory All Encounters" -> "Mandatory".
            lower = first.lower()
            chosen = None
            for canon in sorted(CANONICAL[k], key=len, reverse=True):
                if lower == canon or lower.startswith(canon + " ") or lower.startswith(canon + "/"):
                    chosen = canon.title()
                    if canon == "top secret":
                        chosen = "Top Secret"
                    break
            if chosen:
                extracted[k] = chosen
            else:
                del extracted[k]
            continue
        # Generic short-value sanity for format / encounterTypes / maxOccurrences:
        word_count = len(first.split())
        if (
            len(first) > 80
            or word_count > 12
            or first.endswith(".")
        ):
            del extracted[k]
            continue
        extracted[k] = first
    return extracted


CODE_LINE = re.compile(r"^\s*([0-9A-Za-z\-\+]{1,15})\s{2,}(.+?)\s*$")


def extract_code_table(body):
    """Heuristic: grab the block that follows a "Code" / "Description" header
    until we hit a known field label or a long prose line.
    """
    lines = body.splitlines()
    rows = []
    in_table = False
    header_seen_at = -1
    label_alt = re.compile(rf"^\s*({'|'.join(re.escape(l) for l in ALL_LABELS)})\b")
    for i, raw in enumerate(lines):
        line = raw.rstrip()
        stripped = line.strip()
        if not in_table:
            # Header rows look like: "Code   Description" or "Code   Short Description   Long Description"
            if re.match(r"^\s*Code\s{2,}", line) and ("Description" in line):
                in_table = True
                header_seen_at = i
                continue
        else:
            if not stripped:
                continue
            if label_alt.match(line):
                break
            # Stop on a likely prose line (starts with bullet "•" / "·" or has many words)
            if stripped.startswith(("•", "·", "�")) or stripped.startswith("Guidance"):
                break
            m = CODE_LINE.match(line)
            if m:
                code = m.group(1).strip()
                desc = m.group(2).strip()
                # If table has 3 cols (Short / Long), split on >=2 spaces in desc.
                parts = re.split(r"\s{2,}", desc, maxsplit=1)
                if len(parts) == 2:
                    rows.append({"code": code, "shortDescription": parts[0].strip(), "longDescription": parts[1].strip()})
                else:
                    rows.append({"code": code, "description": desc})
            else:
                # Could be a continuation of the previous row's description.
                if rows and stripped:
                    last = rows[-1]
                    key = "longDescription" if "longDescription" in last else "description"
                    last[key] = (last.get(key, "") + " " + stripped).strip()
    return rows


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    raw = SRC.read_text(encoding="utf-8", errors="replace")
    lines = raw.splitlines()
    lines = strip_pages(lines)

    domain_starts = find_domain_starts(lines)
    if not domain_starts:
        print("No domain starts found", file=sys.stderr)
        sys.exit(1)

    domains_out = []
    for idx, (line_i, dname) in enumerate(domain_starts):
        next_i = domain_starts[idx + 1][0] if idx + 1 < len(domain_starts) else len(lines)
        # Stop at the appendices.
        appendix_i = next(
            (k for k in range(line_i, next_i) if lines[k].strip().startswith("Appendix ") or lines[k].strip().startswith("Appendix ")),
            next_i,
        )
        end_i = min(next_i, appendix_i) if appendix_i > line_i else next_i

        elements = find_element_starts(lines, line_i + 1, end_i)
        domain_elements = []
        for eidx, (el_i, num, name) in enumerate(elements):
            el_end = elements[eidx + 1][0] if eidx + 1 < len(elements) else end_i
            body = "\n".join(lines[el_i + 1 : el_end])
            fields = extract_fields(body)
            code_table = extract_code_table(body)
            domain_elements.append(
                {
                    "id": f"{slugify(dname)}-{num}-{slugify(name)}"[:120],
                    "number": num,
                    "name": name,
                    **fields,
                    "codeTable": code_table or None,
                    "rawText": body.strip(),
                }
            )
        domains_out.append(
            {
                "id": slugify(dname),
                "name": dname,
                "elementCount": len(domain_elements),
                "elements": domain_elements,
            }
        )

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(json.dumps({"version": "4.4", "domains": domains_out}, indent=2, ensure_ascii=False), encoding="utf-8")
    total = sum(d["elementCount"] for d in domains_out)
    print(f"Wrote {DST} — {len(domains_out)} domains, {total} elements")


if __name__ == "__main__":
    main()
