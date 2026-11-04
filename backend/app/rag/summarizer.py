"""
Document & Section Summarization Layer for ResearchMind AI RAG Pipeline.
Generates document-level and section-level summaries at ingest time,
used for document-level routing and hierarchical retrieval.
"""

import re
import logging
from typing import List, Dict, Any, Tuple
from app.rag.models import Chunk
from app.rag.parser import approximate_tokens

logger = logging.getLogger("researchmind.rag.summarizer")


def generate_document_summary(chunks: List[Chunk], document_name: str) -> str:
    """
    Produces a comprehensive, grounded executive summary of the document.
    Uses AI service if accessible, with guaranteed deterministic extractive fallback.
    """
    if not chunks:
        return f"Summary of {document_name}: No content available."

    # Identify abstract, introduction, and conclusion chunks
    lead_chunks = chunks[:3]
    tail_chunks = chunks[-2:] if len(chunks) > 3 else []
    sample_text = "\n\n".join(c.text for c in (lead_chunks + tail_chunks))

    try:
        from app.services import ai_service, TaskType
        resp = ai_service.generate(
            task_type=TaskType.SUMMARY,
            system_prompt="You are a research document analyst. Provide a clear, objective 2-3 paragraph executive summary covering main purpose, core methodology, key findings, and conclusion.",
            user_prompt=f"Document: {document_name}\n\nKey Content:\n{sample_text[:3500]}",
            max_tokens=600,
            temperature=0.2
        )
        if resp and resp.content and len(resp.content.strip()) > 50:
            return resp.content.strip()
    except Exception as exc:
        logger.debug(f"LLM doc summary fallback for {document_name}: {exc}")

    # Deterministic extractive summary fallback
    summary_paras = []
    summary_paras.append(f"Document Overview for {document_name}:")
    
    # Extract first 2-3 clean paragraphs from leading chunks
    for c in lead_chunks:
        # Strip header prefix
        clean = re.sub(r"^\[Document:.*?\]\s*", "", c.text, flags=re.DOTALL).strip()
        first_para = clean.split("\n\n")[0]
        if len(first_para.split()) >= 15 and first_para not in summary_paras:
            summary_paras.append(first_para)
        if len(summary_paras) >= 3:
            break

    # Add conclusion or final finding if available
    if tail_chunks:
        tail_clean = re.sub(r"^\[Document:.*?\]\s*", "", tail_chunks[-1].text, flags=re.DOTALL).strip()
        last_para = tail_clean.split("\n\n")[-1]
        if len(last_para.split()) >= 15 and last_para not in summary_paras:
            summary_paras.append(f"Conclusion & Highlights: {last_para}")

    return "\n\n".join(summary_paras)


def generate_section_summaries(chunks: List[Chunk], document_name: str) -> List[Tuple[str, int, str]]:
    """
    Groups chunks by section and extracts a concise summary for each substantive section.
    Returns list of (section_title, first_page_number, summary_text).
    """
    sections: Dict[str, List[Chunk]] = {}
    for c in chunks:
        sec = c.section or "General"
        if sec in ["Table", "Document Summary", "Acronym Glossary"]:
            continue
        if sec not in sections:
            sections[sec] = []
        sections[sec].append(c)

    results: List[Tuple[str, int, str]] = []
    for sec_name, sec_chunks in sections.items():
        if len(sec_chunks) == 0:
            continue
        first_page = min(c.page_number for c in sec_chunks)
        combined_text = " ".join(
            re.sub(r"^\[Document:.*?\]\s*", "", c.text, flags=re.DOTALL).strip()
            for c in sec_chunks
        )
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", combined_text) if len(s.strip()) > 20]
        
        # Take key representative sentences for the section
        summary_sentences = sentences[:3]
        summary_text = f"Summary of section '{sec_name}': " + " ".join(summary_sentences)
        results.append((sec_name, first_page, summary_text))

    return results
