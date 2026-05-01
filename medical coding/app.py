"""Streamlit UI for the clinical note → medical codes pipeline."""

from __future__ import annotations

import html
import os
from pathlib import Path

import streamlit as st

from pipeline import extract, validate_code
import anthropic

st.set_page_config(page_title="Clinical Coding Assistant", page_icon="+", layout="wide")

KIND_COLORS = {
    "diagnosis": ("#1E3A8A", "#DBEAFE"),
    "procedure": ("#065F46", "#D1FAE5"),
    "history": ("#78350F", "#FEF3C7"),
}

CONFIDENCE_COLORS = {
    "high": "#10B981",
    "medium": "#F59E0B",
    "low": "#EF4444",
}

STATUS_COLORS = {
    "accepted": "#10B981",
    "remapped": "#3B82F6",
    "rejected": "#EF4444",
    "unverified": "#6B7280",
}


def highlight_note(note: str, evidence_spans: list[str]) -> str:
    escaped = html.escape(note)
    for span in sorted(set(evidence_spans), key=len, reverse=True):
        escaped_span = html.escape(span)
        if escaped_span in escaped:
            escaped = escaped.replace(
                escaped_span,
                f'<mark style="background:#FEF3C7;padding:2px 4px;border-radius:3px">{escaped_span}</mark>',
                1,
            )
    return f'<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:13px;line-height:1.6">{escaped}</pre>'


def concept_card(result: dict) -> None:
    concept = result["concept"]
    kind = concept["kind"]
    fg, bg = KIND_COLORS.get(kind, ("#111", "#EEE"))
    conf_color = CONFIDENCE_COLORS.get(concept["confidence"], "#999")
    status_color = STATUS_COLORS.get(result["status"], "#999")

    st.markdown(
        f"""
        <div style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:12px;background:white">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
            <span style="background:{bg};color:{fg};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase">{kind}</span>
            <span style="background:#F3F4F6;color:#111;padding:2px 10px;border-radius:12px;font-size:12px;font-family:ui-monospace,monospace;font-weight:600">{html.escape(concept["candidate_code"])}</span>
            <span style="color:#6B7280;font-size:11px">{concept["code_system"]}</span>
            <span style="margin-left:auto;display:flex;gap:6px">
              <span style="background:{conf_color};color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600">{concept["confidence"].upper()}</span>
              <span style="background:{status_color};color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600">{result["status"].upper()}</span>
            </span>
          </div>
          <div style="font-size:15px;font-weight:500;color:#111;margin-bottom:6px">{html.escape(concept["description"])}</div>
          <div style="font-size:12px;color:#6B7280;font-style:italic;border-left:3px solid #E5E7EB;padding-left:8px;margin-bottom:6px">"{html.escape(concept["evidence"])}"</div>
          <div style="font-size:12px;color:#4B5563">{html.escape(concept["rationale"])}</div>
          {f'<div style="font-size:11px;color:#9CA3AF;margin-top:6px">Validator: {html.escape(result["validator_note"])}</div>' if result["validator_note"] else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


st.markdown(
    """
    <div style="padding:16px 0;border-bottom:2px solid #E5E7EB;margin-bottom:24px">
      <h1 style="margin:0;font-size:24px;color:#111">Clinical Coding Assistant</h1>
      <p style="margin:4px 0 0 0;color:#6B7280;font-size:14px">LLM extraction + terminology validation pipeline</p>
    </div>
    """,
    unsafe_allow_html=True,
)

sample_path = Path(__file__).parent / "sample_note.txt"
default_note = sample_path.read_text(encoding="utf-8") if sample_path.exists() else ""

col_input, col_output = st.columns([1, 1.3], gap="large")

with col_input:
    st.markdown("### Clinical Note")
    note = st.text_area("Note", value=default_note, height=420, label_visibility="collapsed")
    run_btn = st.button("Extract & Validate Codes", type="primary", use_container_width=True)

    if not os.environ.get("ANTHROPIC_API_KEY"):
        st.warning("Set `ANTHROPIC_API_KEY` to run extraction.")

with col_output:
    st.markdown("### Extracted Codes")

    if run_btn and note.strip():
        with st.spinner("Extracting concepts..."):
            try:
                client = anthropic.Anthropic()
                extraction = extract(note, client)
                results = [validate_code(c).model_dump() for c in extraction.concepts]
                st.session_state["results"] = results
                st.session_state["note"] = note
            except anthropic.APIError as e:
                st.error(f"API error: {e}")
                st.session_state["results"] = []

    results = st.session_state.get("results", [])

    if results:
        groups: dict[str, list[dict]] = {"diagnosis": [], "procedure": [], "history": []}
        for r in results:
            groups.setdefault(r["concept"]["kind"], []).append(r)

        c1, c2, c3 = st.columns(3)
        c1.metric("Diagnoses", len(groups["diagnosis"]))
        c2.metric("Procedures", len(groups["procedure"]))
        c3.metric("History", len(groups["history"]))

        st.markdown("#### Evidence in note")
        evidence_spans = [r["concept"]["evidence"] for r in results]
        st.markdown(highlight_note(st.session_state.get("note", note), evidence_spans), unsafe_allow_html=True)

        for label in ("diagnosis", "procedure", "history"):
            if groups[label]:
                st.markdown(f"#### {label.title()}")
                for r in groups[label]:
                    concept_card(r)
    else:
        st.info("Click **Extract & Validate Codes** to run the pipeline.")
