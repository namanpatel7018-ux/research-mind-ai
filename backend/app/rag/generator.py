"""
Grounded LLM Generation Layer for ResearchMind AI
=================================================
Enforces:
  - STRICT RAG GROUNDING using system prompt in PROMPT.md
  - Injection of {context}, {glossary}, {history}, and {question}
  - Threshold gating: if retrieved chunks have low relevance scores, states information
    was not found instead of guessing.
  - Strict citation verification according to PROMPT.md Rule 7.
"""

import os
import time
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from app.services import ai_service, TaskType
from app.rag.models import (
    RAGQueryResponse,
    CitationSource,
    RetrievalStats,
    UsageStats,
    UsedChunkDetail,
)
from app.rag.verifier import CitationVerifier, INSUFFICIENT_EVIDENCE_PHRASE
from app.rag.terminology import load_glossary_json
from app.rag.config import get_config_section

logger = logging.getLogger("researchmind.rag.generator")

PROMPT_FILE_PATHS = [
    Path(__file__).resolve().parents[3] / "PROMPT.md",
    Path(__file__).resolve().parents[2] / "PROMPT.md",
    Path.cwd() / "PROMPT.md",
]


def load_prompt_template() -> str:
    """Loads prompt template from PROMPT.md."""
    for p in PROMPT_FILE_PATHS:
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8")
                if content and content.strip():
                    return content
            except Exception:
                pass
    # Fallback to standard PROMPT.md content
    return (
        "You are a document assistant. Answer using ONLY the provided context from the user's documents.\n\n"
        "RULES\n"
        "1. Base every statement on the context. Never use outside knowledge. Never invent facts.\n"
        "2. If the answer is not in the context, say: \"I couldn't find this in the provided documents.\" Then suggest what the user could ask instead.\n"
        "3. Short names, abbreviations and nicknames may refer to terms in the documents. Use the glossary and context to interpret them. If a term is ambiguous, state your best interpretation and mention the alternative.\n"
        "4. If the user's question is vague (e.g. \"what about this pdf?\", \"explain this\", \"summarize\"), treat it as a request for an overview of the document(s): give the main purpose, key sections and key points.\n"
        "5. Combine information from multiple chunks and pages when needed. Do not rely on one chunk only.\n"
        "6. Be clear and simple. Use short paragraphs or bullets. Match the user's language.\n"
        "7. End with sources in this form: (Document name, page X). List only pages you actually used.\n\n"
        "CONTEXT:\n{context}\n\n"
        "GLOSSARY:\n{glossary}\n\n"
        "CHAT HISTORY:\n{history}\n\n"
        "QUESTION:\n{question}"
    )


# Backward-compatible prompt reference for legacy tests and external modules
STRICT_RAG_SYSTEM_PROMPT = (
    "You are a document assistant. Answer using ONLY the provided context from the user's documents.\n"
    "Do NOT use pretrained knowledge, outside knowledge, or assumptions.\n"
    "When comparing features or entities, structure the analysis using a Markdown table.\n"
    "If appropriate for workflow or sequential pipeline queries, you may describe processes or supply a mermaid diagram.\n"
    "If the answer is not in the context, say: \"I couldn't find this in the provided documents.\""
)


def mask_provider_name(text: str) -> str:
    """Removes any leaked model/provider identifiers from final user-facing text."""
    if not text:
        return text
    patterns = [
        r"\b(?:groq|gemini|openai|claude|chatgpt|gpt-4|gpt-3\.5|llama|cerebras|anthropic)\b",
    ]
    cleaned = text
    for p in patterns:
        cleaned = re.sub(p, "ResearchMind AI", cleaned, flags=re.IGNORECASE)
    return cleaned


class GroundedGenerator:
    def __init__(self, verifier: Optional[CitationVerifier] = None):
        self.verifier = verifier or CitationVerifier()
        cfg_gen = get_config_section("generation")
        self.min_relevance_threshold = float(cfg_gen.get("min_relevance_threshold", 0.15))
        self.strict_missing_phrase = cfg_gen.get("strict_missing_phrase", INSUFFICIENT_EVIDENCE_PHRASE)

    def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[Tuple[Dict[str, Any], float]],
        retrieval_meta: Dict[str, Any],
        mode: str = "strict",
        recent_history: Optional[List[Dict[str, str]]] = None,
        min_relevance_threshold: Optional[float] = None
    ) -> RAGQueryResponse:
        """
        Synthesizes an answer grounded strictly in retrieved context using PROMPT.md.
        """
        start_time = time.time()
        is_deepthink = (mode.lower() == "deepthink")
        thresh = min_relevance_threshold or self.min_relevance_threshold

        # Step G: Threshold check - If retrieved context has low relevance scores, say information was not found
        top_score = retrieved_chunks[0][1] if retrieved_chunks else 0.0
        is_vague = retrieval_meta.get("query_type") == "DOCUMENT_SUMMARY"

        if not is_deepthink and not is_vague and (not retrieved_chunks or top_score < thresh):
            elapsed_ms = (time.time() - start_time) * 1000
            missing_answer = self.strict_missing_phrase
            logger.info(f"[Generator] Low relevance ({top_score:.4f} < {thresh}). Returning standard not-found response.")
            return RAGQueryResponse(
                query=query,
                answer=missing_answer,
                sources=[],
                retrieval=RetrievalStats(
                    total_chunks=retrieval_meta.get("total_user_chunks", 0),
                    retrieved_chunks=retrieval_meta.get("retrieved_count", 0),
                    reranked_chunks=retrieval_meta.get("reranked_count", 0),
                    used_chunks=0,
                    query_type=retrieval_meta.get("query_type", "FACTUAL"),
                    methods=retrieval_meta.get("methods", [])
                ),
                usage=UsageStats(
                    input_tokens=0,
                    output_tokens=len(missing_answer.split()),
                    total_tokens=len(missing_answer.split()),
                    latency_ms=round(elapsed_ms, 2)
                ),
                used_chunks_detail=[],
                provider="ResearchMind AI"
            )

        # 1. Format CONTEXT
        context_blocks = []
        used_details: List[UsedChunkDetail] = []

        for chunk_payload, score in retrieved_chunks:
            doc_name = chunk_payload.get("document_name", "Document")
            page_num = chunk_payload.get("page_number", 1)
            section = chunk_payload.get("section", "General")
            chunk_id = chunk_payload.get("chunk_id", "")
            text = chunk_payload.get("text", "").strip()
            bbox = chunk_payload.get("bbox")

            # Remove redundant internal header if already present in text
            clean_text = re.sub(r"^\[Document:.*?\]\s*", "", text, flags=re.DOTALL).strip()
            block_header = f"[Document: {doc_name} | Page: {page_num} | Section: {section}]"
            context_blocks.append(f"{block_header}\n{clean_text}")

            used_details.append(UsedChunkDetail(
                chunk_id=chunk_id,
                document_name=doc_name,
                page_number=page_num,
                section=section,
                score=round(score, 3),
                text_snippet=clean_text[:160] + ("..." if len(clean_text) > 160 else ""),
                bbox=bbox
            ))

        formatted_context = "\n\n---\n\n".join(context_blocks) if context_blocks else "No relevant document chunks found."

        # 2. Format GLOSSARY
        glossary_items = []
        detected = retrieval_meta.get("detected_terms", [])
        glossary_dict = load_glossary_json()

        for item in detected:
            if " ↔ " in item:
                k, v = item.split(" ↔ ", 1)
                glossary_items.append(f"- {k}: {v}")

        for term, full_exp in glossary_dict.items():
            if re.search(rf"\b{re.escape(term)}\b", query, re.IGNORECASE):
                line = f"- {term}: {full_exp}"
                if line not in glossary_items:
                    glossary_items.append(line)

        formatted_glossary = "\n".join(glossary_items) if glossary_items else "None defined for this query."

        # 3. Format CHAT HISTORY
        formatted_history = "None"
        if recent_history and len(recent_history) > 0:
            hist_lines = []
            for h in recent_history[-4:]:
                role = "User" if h.get("role") == "user" else "Assistant"
                hist_lines.append(f"{role}: {h.get('text', '')}")
            formatted_history = "\n".join(hist_lines)

        # 4. Construct System and User prompts directly matching PROMPT.md
        system_prompt = (
            "You are a document assistant. Answer using ONLY the provided context from the user's documents.\n\n"
            "RULES\n"
            "1. Base every statement on the context. Never use outside knowledge. Never invent facts.\n"
            "2. If the answer is not in the context, say: \"I couldn't find this in the provided documents.\"\n"
            "3. Short names, abbreviations and nicknames may refer to terms in the documents. Use the glossary and context to interpret them. If a term is ambiguous, state your best interpretation and mention the alternative.\n"
            "4. If the user's question is vague (e.g. \"what about this pdf?\", \"explain this\", \"summarize\"), treat it as a request for an overview of the document(s): give the main purpose, key sections and key points.\n"
            "5. Combine information from multiple chunks and pages when needed. Do not rely on one chunk only.\n"
            "6. Be clear and simple. Use short paragraphs or bullets. Match the user's language.\n"
            "7. End with sources in this form: (Document name, page X). List only pages you actually used."
        )

        user_prompt = (
            f"CONTEXT:\n{formatted_context}\n\n"
            f"GLOSSARY:\n{formatted_glossary}\n\n"
            f"CHAT HISTORY:\n{formatted_history}\n\n"
            f"QUESTION:\n{query}"
        )

        approx_input_tokens = int(len(user_prompt.split()) * 1.3) + int(len(system_prompt.split()) * 1.3)

        # Call AI service with low temperature for strict factual grounding
        ai_resp = ai_service.generate(
            task_type=TaskType.DEEP_ANALYSIS if is_deepthink else TaskType.QUICK_QA,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=3072 if is_deepthink else 2048,
            temperature=0.3 if is_deepthink else 0.1,
            context_size=len(formatted_context)
        )


        raw_answer = mask_provider_name(ai_resp.content.strip())
        approx_output_tokens = int(len(raw_answer.split()) * 1.3)
        elapsed_ms = (time.time() - start_time) * 1000

        # Step H: Extract verified citations for ONLY the chunks actually used
        verified_answer, sources, is_valid = self.verifier.verify_and_extract_sources(
            answer=raw_answer,
            retrieved_chunks=retrieved_chunks
        )

        public_provider = "DeepThink" if is_deepthink else "ResearchMind AI"

        return RAGQueryResponse(
            query=query,
            answer=verified_answer,
            sources=sources,
            retrieval=RetrievalStats(
                total_chunks=retrieval_meta.get("total_user_chunks", 0),
                retrieved_chunks=retrieval_meta.get("retrieved_count", 0),
                reranked_chunks=retrieval_meta.get("reranked_count", 0),
                used_chunks=len(sources),
                query_type=retrieval_meta.get("query_type", "FACTUAL"),
                methods=retrieval_meta.get("methods", [])
            ),
            usage=UsageStats(
                input_tokens=approx_input_tokens,
                output_tokens=approx_output_tokens,
                total_tokens=approx_input_tokens + approx_output_tokens,
                latency_ms=round(elapsed_ms, 2)
            ),
            used_chunks_detail=used_details,
            provider=public_provider,
            fallback_used=False
        )
