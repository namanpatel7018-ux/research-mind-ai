"""
Document Terminology Indexer & Extractor
========================================
Extracts acronyms and full definitions directly from user uploaded documents:
  - "Artificial Intelligence (AI)"
  - "Machine Learning (ML)"
  - "Convolutional Neural Network (CNN)"
  - "Retrieval-Augmented Generation (RAG)"
Stores bidirectional mappings per document in the database.
"""

import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.db import save_document_terminology, get_document_terminology

logger = logging.getLogger("researchmind.rag.terminology")

# Pattern: Full Term (ACRONYM)
# e.g., "Artificial Intelligence (AI)", "Large Language Model (LLM)"
P_FULL_ACRONYM = re.compile(
    r"\b([A-Z][a-zA-Z0-9\-\s]{2,45}?)\s*\(([A-Z0-9]{2,8}[sS]?|[A-Z]\.[A-Z]\.(?:[A-Z]\.)?)\)",
    re.MULTILINE
)

# Pattern: ACRONYM (Full Term)
# e.g., "AI (Artificial Intelligence)"
P_ACRONYM_FULL = re.compile(
    r"\b([A-Z0-9]{2,8})\s*\(([A-Z][a-zA-Z0-9\-\s]{2,45}?)\)",
    re.MULTILINE
)

# Pattern: ACRONYM stands for / denotes / refers to / is defined as Full Term
P_STANDS_FOR = re.compile(
    r"\b([A-Z0-9]{2,8})\s+(?:stands\s+for|is\s+short\s+for|denotes|refers\s+to|is\s+defined\s+as)\s+([A-Za-z0-9\-\s]{3,45}?)(?=[,\.\;\n])",
    re.IGNORECASE
)

# Standard fallback domain glossary for academic research if not defined in document
COMMON_RESEARCH_TERMS: Dict[str, str] = {
    "AI": "Artificial Intelligence",
    "A.I.": "Artificial Intelligence",
    "ML": "Machine Learning",
    "DL": "Deep Learning",
    "NLP": "Natural Language Processing",
    "CNN": "Convolutional Neural Network",
    "RNN": "Recurrent Neural Network",
    "LLM": "Large Language Model",
    "RAG": "Retrieval-Augmented Generation",
    "SVM": "Support Vector Machine",
    "GAN": "Generative Adversarial Network",
    "BERT": "Bidirectional Encoder Representations from Transformers",
    "GPT": "Generative Pre-trained Transformer",
    "RL": "Reinforcement Learning",
    "SGD": "Stochastic Gradient Descent",
    "API": "Application Programming Interface",
    "SOTA": "State of the Art"
}


import json
from pathlib import Path

GLOSSARY_PATHS = [
    Path(__file__).resolve().parents[2] / "data" / "glossary.json",
    Path(__file__).resolve().parents[3] / "data" / "glossary.json",
]


def normalize_acronym(token: str) -> str:
    """Normalize acronym (remove dots, strip trailing plural 's')."""
    clean = token.strip().replace(".", "").upper()
    if len(clean) > 2 and clean.endswith("S") and clean[:-1].isupper():
        clean = clean[:-1]
    return clean



def extract_document_terminology(
    chunks: List[Any],
    document_id: str,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Scans chunk texts for acronym definitions and stores them in the database.
    Returns list of discovered terminology items.
    """
    discovered: Dict[str, Dict[str, Any]] = {}

    for chunk in chunks:
        # Support chunk as Chunk model or dict
        text = chunk.text if hasattr(chunk, "text") else chunk.get("text", "")
        page_num = chunk.page_number if hasattr(chunk, "page_number") else chunk.get("page_number", 1)
        chunk_id = chunk.chunk_id if hasattr(chunk, "chunk_id") else chunk.get("chunk_id", "")

        # 1. Full Term (ACRONYM)
        for full, acr in P_FULL_ACRONYM.findall(text):
            norm_acr = normalize_acronym(acr)
            clean_full = full.strip()
            # Verify clean_full looks like a real phrase (at least one word starts with acronym letter)
            if 2 <= len(norm_acr) <= 8 and len(clean_full.split()) >= 1:
                key = f"{norm_acr.lower()}::{clean_full.lower()}"
                if key not in discovered:
                    discovered[key] = {
                        "term": norm_acr,
                        "expanded_term": clean_full,
                        "document_id": document_id,
                        "page_number": page_num,
                        "chunk_id": chunk_id,
                    }

        # 2. ACRONYM (Full Term)
        for acr, full in P_ACRONYM_FULL.findall(text):
            norm_acr = normalize_acronym(acr)
            clean_full = full.strip()
            if 2 <= len(norm_acr) <= 8 and len(clean_full.split()) >= 1:
                key = f"{norm_acr.lower()}::{clean_full.lower()}"
                if key not in discovered:
                    discovered[key] = {
                        "term": norm_acr,
                        "expanded_term": clean_full,
                        "document_id": document_id,
                        "page_number": page_num,
                        "chunk_id": chunk_id,
                    }

        # 3. Stands for / denotes
        for acr, full in P_STANDS_FOR.findall(text):
            norm_acr = normalize_acronym(acr)
            clean_full = full.strip()
            if 2 <= len(norm_acr) <= 8:
                key = f"{norm_acr.lower()}::{clean_full.lower()}"
                if key not in discovered:
                    discovered[key] = {
                        "term": norm_acr,
                        "expanded_term": clean_full,
                        "document_id": document_id,
                        "page_number": page_num,
                        "chunk_id": chunk_id,
                    }

    terms_list = list(discovered.values())
    if terms_list:
        save_document_terminology(user_id=user_id, document_id=document_id, terms=terms_list)
        _update_glossary_json(terms_list)
        logger.info(f"Indexed {len(terms_list)} terminology entries for document {document_id}")
    return terms_list



def get_user_term_mappings(user_id: str, document_ids: Optional[List[str]] = None) -> Dict[str, str]:
    """
    Returns a unified mapping of term -> expanded_term and expanded_term -> term
    for the user's documents, incorporating glossary.json and COMMON_RESEARCH_TERMS.
    """
    records = get_document_terminology(user_id=user_id, document_ids=document_ids)
    mappings: Dict[str, str] = {}

    # 1. Load document-grounded terminology
    for r in records:
        term = r["term"].strip()
        expanded = r["expanded_term"].strip()
        mappings[term.lower()] = expanded
        mappings[expanded.lower()] = term

    # 2. Load glossary.json
    glossary_data = load_glossary_json()
    for term, exp in glossary_data.items():
        if term.lower() not in mappings:
            mappings[term.lower()] = exp
        if exp.lower() not in mappings:
            mappings[exp.lower()] = term

    # 3. Supplement with common research terms
    for acr, exp in COMMON_RESEARCH_TERMS.items():
        if acr.lower() not in mappings:
            mappings[acr.lower()] = exp
        if exp.lower() not in mappings:
            mappings[exp.lower()] = acr

    return mappings



def _update_glossary_json(new_terms: List[Dict[str, Any]]):
    """Saves accumulated terminology dictionary to glossary.json."""
    data: Dict[str, str] = {}
    for p in GLOSSARY_PATHS:
        if p.exists():
            try:
                data.update(json.loads(p.read_text(encoding="utf-8")))
            except Exception:
                pass

    for t in new_terms:
        term = t.get("term", "").strip()
        exp = t.get("expanded_term", "").strip()
        if term and exp:
            data[term] = exp

    # Ensure defaults are included
    for acr, exp in COMMON_RESEARCH_TERMS.items():
        if acr not in data:
            data[acr] = exp

    for p in GLOSSARY_PATHS:
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass


def load_glossary_json() -> Dict[str, str]:
    """Loads glossary.json mapping term -> full definition."""
    data: Dict[str, str] = dict(COMMON_RESEARCH_TERMS)
    for p in GLOSSARY_PATHS:
        if p.exists():
            try:
                file_terms = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(file_terms, dict):
                    data.update(file_terms)
                break
            except Exception:
                pass
    return data


def create_glossary_chunk(
    terms: List[Dict[str, Any]],
    document_id: str,
    document_name: str,
    user_id: str,
    chunk_index: int
) -> Optional[Any]:
    """Creates a retrievable Chunk representing the document's acronym glossary."""
    if not terms:
        return None
    from app.rag.models import Chunk
    lines = [f"- {t.get('term')}: {t.get('expanded_term')}" for t in terms]
    text = (
        f"[Document: {document_name} | Section: Acronym Glossary & Abbreviations | Page: 1]\n\n"
        f"Document Terminology & Acronyms for {document_name}:\n" + "\n".join(lines)
    )
    words = text.split()
    tokens = max(1, int(len(words) * 1.3))
    return Chunk(
        chunk_id=f"{document_id}_glossary_{chunk_index:03d}",
        document_id=document_id,
        document_name=document_name,
        user_id=user_id,
        page_number=1,
        section="Acronym Glossary",
        chunk_index=chunk_index,
        text=text,
        token_count=tokens,
        bbox=None,
        chunk_type="glossary"
    )
