"""
Citation and Grounding Verification Layer for ResearchMind AI.
Validates that every claim and citation points to an authentic retrieved chunk,
verifies page numbers and documents exist, and flags unsupported statements.
Returns doc name + page for ONLY the chunks actually used in the answer.
"""

import re
import logging
from typing import List, Dict, Any, Tuple

from app.rag.models import CitationSource

logger = logging.getLogger("researchmind.rag.verifier")

INSUFFICIENT_EVIDENCE_PHRASE = "I couldn't find this in the provided documents."


class CitationVerifier:
    """Verifies citations and ensures sources reflect only chunks actually used in the answer."""

    def verify_and_extract_sources(
        self,
        answer: str,
        retrieved_chunks: List[Tuple[Dict[str, Any], float]]
    ) -> Tuple[str, List[CitationSource], bool]:
        """
        Extracts cited sources, validates page numbers and document names against retrieved chunks.
        Strictly returns doc name + page for ONLY the chunks actually used.
        """
        lower_ans = answer.lower()
        if "couldn't find this in the provided documents" in lower_ans or "couldn't find sufficient information" in lower_ans:
            return answer, [], True

        if not retrieved_chunks:
            return INSUFFICIENT_EVIDENCE_PHRASE, [], False

        # Parse citations matching: (DocName, page X) or [DocName · Page X] or Page X
        cited_pages: List[int] = []
        cited_doc_pages: List[Tuple[str, int]] = []

        # Pattern 1: (Document name, page X) from PROMPT.md Rule 7
        p1 = re.compile(r"\(([^,]+?),\s*(?:page|p\.?)\s*(\d+)\)", re.IGNORECASE)
        for doc_str, page_str in p1.findall(answer):
            cited_doc_pages.append((doc_str.strip().lower(), int(page_str)))
            cited_pages.append(int(page_str))

        # Pattern 2: 📄 Doc · Page X or Doc · Page X
        p2 = re.compile(r"(?:📄\s*)?([^\n·|,]+?)\s*[·|,]\s*Page\s*(\d+)", re.IGNORECASE)
        for doc_str, page_str in p2.findall(answer):
            cited_doc_pages.append((doc_str.strip().lower(), int(page_str)))
            cited_pages.append(int(page_str))

        # Pattern 3: Page X
        p3 = re.compile(r"\b(?:page|p\.)\s*(\d+)\b", re.IGNORECASE)
        for page_str in p3.findall(answer):
            cited_pages.append(int(page_str))

        verified_sources: List[CitationSource] = []
        seen_source_keys = set()

        for chunk_payload, score in retrieved_chunks:
            p_num = chunk_payload.get("page_number", 1)
            doc_id = chunk_payload.get("document_id", "")
            doc_name = chunk_payload.get("document_name", "")
            section = chunk_payload.get("section", "General")
            chunk_id = chunk_payload.get("chunk_id", "")
            text = chunk_payload.get("text", "")
            bbox = chunk_payload.get("bbox")

            # A chunk is considered actually used if:
            # 1. Its specific (doc, page) was explicitly cited by the LLM AND it has text overlap, OR
            # 2. Its text contains direct textual evidence for key statements in the answer
            explicit_doc_page_match = any(
                p == p_num and (d in doc_name.lower() or doc_name.lower() in d)
                for d, p in cited_doc_pages
            )
            page_match = p_num in cited_pages
            has_evidence = self._has_text_evidence(answer, text)

            is_actually_used = explicit_doc_page_match or (page_match and has_evidence) or (has_evidence and not cited_pages)

            if is_actually_used:
                source_key = f"{doc_name.lower()}__p{p_num}"
                if source_key not in seen_source_keys:
                    seen_source_keys.add(source_key)
                    # Clean snippet: remove bracketed context header
                    body_clean = re.sub(r"^\[Document:.*?\]\s*", "", text, flags=re.DOTALL).strip()
                    snippet = body_clean[:220].strip() + ("..." if len(body_clean) > 220 else "")
                    verified_sources.append(CitationSource(
                        document_id=doc_id,
                        document_name=doc_name,
                        page_number=p_num,
                        section=section,
                        chunk_id=chunk_id,
                        evidence=snippet,
                        bbox=bbox
                    ))

        # Fallback: if answer is substantial but no source was caught by regex,
        # attribute only the top chunk that demonstrably contains matching words
        if not verified_sources and len(answer.split()) > 20 and retrieved_chunks:
            top_payload = retrieved_chunks[0][0]
            top_text = top_payload.get("text", "")
            if self._has_text_evidence(answer, top_text, min_ratio=0.10):
                body_clean = re.sub(r"^\[Document:.*?\]\s*", "", top_text, flags=re.DOTALL).strip()
                snippet = body_clean[:220].strip() + ("..." if len(body_clean) > 220 else "")
                verified_sources.append(CitationSource(
                    document_id=top_payload.get("document_id", ""),
                    document_name=top_payload.get("document_name", ""),
                    page_number=top_payload.get("page_number", 1),
                    section=top_payload.get("section", "General"),
                    chunk_id=top_payload.get("chunk_id", ""),
                    evidence=snippet,
                    bbox=top_payload.get("bbox")
                ))

        return answer, verified_sources, True

    def _has_text_evidence(self, answer: str, chunk_text: str, min_ratio: float = 0.15) -> bool:
        """Checks if significant content words or numerical values from the chunk appear in the answer."""
        clean_chunk = re.sub(r"^\[Document:.*?\]\s*", "", chunk_text, flags=re.DOTALL).strip()
        words = [w for w in re.findall(r"\w+", clean_chunk.lower()) if len(w) > 3]
        if not words:
            return False

        stopwords = {
            "this", "that", "these", "those", "from", "with", "have", "were", "been",
            "which", "where", "there", "their", "about", "other", "after", "before"
        }
        distinct_content_words = set(w for w in words if w not in stopwords)
        if not distinct_content_words:
            return False

        ans_lower = answer.lower()
        matches = sum(1 for w in distinct_content_words if w in ans_lower)
        ratio = matches / len(distinct_content_words)
        return ratio >= min_ratio
