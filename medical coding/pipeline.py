"""
Clinical note → medical codes pipeline.

Flow:
  1. Claude extracts candidate concepts from the note with evidence spans.
  2. Each candidate is validated against an authoritative code set.
  3. Output: structured JSON with codes, evidence, and confidence.

Never let the LLM invent final codes — it hallucinates them. The LLM proposes
a code and rationale; the validator accepts, rejects, or re-maps it using
the terminology service.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

MODEL = "claude-opus-4-7"

SYSTEM_PROMPT = """You are a clinical coding assistant. You read clinical notes and extract
billable concepts for downstream validation against authoritative code sets
(ICD-10-CM for diagnoses, CPT for procedures).

Rules:
- Extract ONLY what is explicitly documented in the note. Do not infer.
- For each concept, quote the exact supporting text from the note (evidence).
- Propose a candidate code you believe is correct, but understand a validator
  will verify and may override it.
- Respect negation and hedging. "denies chest pain" is NOT a chest pain code.
  "rule out MI" is NOT an MI code.
- Distinguish PMH (history of) from active problems. History gets a Z-code
  or "history_of" category, not the active condition code.
- For each concept, classify it as: diagnosis | procedure | history.
- If a concept is ambiguous or under-specified, set confidence to "low" and
  explain in rationale."""


class Concept(BaseModel):
    kind: Literal["diagnosis", "procedure", "history"]
    description: str = Field(description="Clinical description in plain English")
    candidate_code: str = Field(description="Proposed ICD-10-CM or CPT code")
    code_system: Literal["ICD-10-CM", "CPT"]
    evidence: str = Field(description="Exact quoted text from the note")
    confidence: Literal["high", "medium", "low"]
    rationale: str = Field(description="Why this code — note any ambiguity")


class Extraction(BaseModel):
    concepts: list[Concept]


def extract(note: str, client: anthropic.Anthropic) -> Extraction:
    response = client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"Clinical note:\n\n{note}\n\nExtract all billable concepts.",
            }
        ],
        output_config={"format": {"type": "json_schema", "schema": Extraction.model_json_schema()}},
    )
    return Extraction.model_validate(response.parsed_output)


class ValidatedCode(BaseModel):
    concept: Concept
    validated_code: str | None
    validated_description: str | None
    status: Literal["accepted", "remapped", "rejected", "unverified"]
    validator_note: str


def validate_code(concept: Concept) -> ValidatedCode:
    """Stub validator.

    Replace with a real terminology service:
      - NLM UMLS API:       https://documentation.uts.nlm.nih.gov/rest/home.html
      - WHO ICD-11 API:     https://icd.who.int/icdapi
      - Local SNOMED CT / ICD-10-CM table from CMS.gov

    The real check: does `concept.candidate_code` exist in the authoritative
    table, and does its description match `concept.description`? If not,
    search for the concept and remap.
    """
    code = concept.candidate_code.strip().upper()

    if not code or code in {"UNKNOWN", "N/A"}:
        return ValidatedCode(
            concept=concept,
            validated_code=None,
            validated_description=None,
            status="rejected",
            validator_note="No candidate code provided.",
        )

    return ValidatedCode(
        concept=concept,
        validated_code=code,
        validated_description=concept.description,
        status="unverified",
        validator_note="Stub validator — plug in UMLS/ICD API here.",
    )


def run(note: str) -> dict:
    client = anthropic.Anthropic()
    extraction = extract(note, client)
    validated = [validate_code(c) for c in extraction.concepts]
    return {
        "concepts_extracted": len(extraction.concepts),
        "results": [v.model_dump() for v in validated],
    }


if __name__ == "__main__":
    note_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "sample_note.txt"
    note_text = note_path.read_text(encoding="utf-8")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY in your environment.")

    result = run(note_text)
    print(json.dumps(result, indent=2))
