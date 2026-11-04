"""
Query Analyzer & Expansion Layer for ResearchMind AI
====================================================
Performs:
  - Contextual query rewriting using chat history into standalone questions (LLM + Rule-based fallback)
  - Acronym & short name expansion using glossary.json + LLM expansion
  - Generation of 2-3 focused query variants for multi-query hybrid retrieval
  - Document-level routing detection for vague queries ("what about this pdf", "summarize", "explain this")
  - Structured logging of rewritten query and expansions
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.rag.terminology import get_user_term_mappings, normalize_acronym, load_glossary_json
from app.rag.config import get_config_section

logger = logging.getLogger("researchmind.rag.analyzer")

VAGUE_PATTERNS = [
    r"\bwhat\s+(is|about)\s+this\s+(pdf|document|paper|file|text)\b",
    r"\bexplain\s+this\s*(pdf|document|paper|file)?\b",
    r"\bsummarize\s+(this|the)?\s*(pdf|document|paper|file)?\b",
    r"\bgive\s+(me\s+)?(an?\s+)?overview(\s+of\s+this)?\b",
    r"\bwhat\s+does\s+this\s+(pdf|document|paper)\s+(say|discuss|cover)\b",
    r"\btell\s+me\s+about\s+this\s+(pdf|document|paper)\b",
    r"^(summarize|summary|overview|what\s+is\s+this|explain)$",
]


def is_vague_document_query(query: str) -> bool:
    """Detects whether query is a vague / document-level summary request."""
    q_clean = query.strip().lower()
    for pat in VAGUE_PATTERNS:
        if re.search(pat, q_clean):
            return True
    return False


def classify_query(query: str) -> str:
    """Classifies user query intent."""
    q = query.strip().lower()
    words = re.findall(r"\w+", q)

    if any(k in q for k in ["compare", "comparison", "difference between", "versus", " vs ", " vs."]):
        return "COMPARISON"
    if any(k in q for k in ["summarize", "summary", "overview", "abstract", "main findings", "key takeaways"]):
        return "SUMMARY"
    if is_vague_document_query(query):
        return "SUMMARY"
    if any(q.startswith(k) for k in ["what is ", "what are ", "define ", "definition of ", "meaning of "]):
        return "DEFINITION"
    if any(k in q for k in ["how to", "procedure", "steps", "workflow", "algorithm", "methodology", "architecture"]):
        return "PROCEDURE"
    if (" and " in q and "?" in q) or q.count("?") > 1:
        return "MULTI_HOP"
    if len(words) <= 3 and not q.endswith("?"):
        return "DEFINITION" if len(words) <= 2 else "FACTUAL"
    return "FACTUAL"



def rewrite_query_with_history(
    query: str,
    recent_history: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Contextually rewrites follow-up questions referencing pronouns or prior context
    into a complete, standalone question.
    Uses LLM if available, with deterministic pronoun-entity resolution fallback.
    """
    if not recent_history or len(recent_history) == 0:
        return query

    pronouns = {"it", "its", "this", "that", "these", "those", "they", "them", "he", "she"}
    words = set(re.findall(r"\w+", query.lower()))
    has_pronoun = bool(words.intersection(pronouns))
    is_short = len(query.split()) < 10

    if not (has_pronoun or is_short):
        return query

    # Try LLM query rewriting first
    try:
        from app.services import ai_service, TaskType
        formatted_history = []
        for h in recent_history[-4:]:
            role = "User" if h.get("role") == "user" else "Assistant"
            formatted_history.append(f"{role}: {h.get('text', '')}")
        hist_str = "\n".join(formatted_history)

        resp = ai_service.generate(
            task_type=TaskType.QUICK_QA,
            system_prompt="You are a query reformulator. Given recent conversation history and a follow-up question, rewrite the follow-up question into a single standalone search question. If it is already standalone, return it unchanged. Output ONLY the standalone question.",
            user_prompt=f"Chat History:\n{hist_str}\n\nFollow-up Question: {query}",
            max_tokens=60,
            temperature=0.0
        )
        if resp and resp.content:
            candidate = resp.content.strip().strip('"').strip("'")
            if len(candidate) > 5 and "\n" not in candidate:
                return candidate
    except Exception as exc:
        logger.debug(f"LLM query rewriting fallback: {exc}")

    # Fallback entity extraction from prior turn
    for turn in reversed(recent_history):
        if turn.get("role") == "user":
            prev_text = turn.get("text", "")
            # Find capitalized entity or noun phrase
            entities = re.findall(r"\b[A-Z][a-zA-Z0-9_\-]+\b", prev_text)
            if entities:
                focal_entity = entities[0]
                # Replace pronouns or append reference
                pattern = re.compile(r"\b(it|its|this|that|these|those|they|them)\b", re.IGNORECASE)
                if pattern.search(query):
                    rewritten = pattern.sub(focal_entity, query)
                    return rewritten
                return f"{query} regarding {focal_entity}"
            break

    return query


class AnalyzedQuery:
    def __init__(
        self,
        original_query: str,
        resolved_query: str,
        query_type: str,
        is_short_query: bool,
        is_vague_or_summary: bool,
        detected_terms: List[Tuple[str, str]],
        retrieval_variants: List[str],
        keywords: List[str]
    ):
        self.original_query = original_query
        self.resolved_query = resolved_query
        self.query_type = query_type
        self.is_short_query = is_short_query
        self.is_vague_or_summary = is_vague_or_summary
        self.detected_terms = detected_terms
        self.retrieval_variants = retrieval_variants
        self.keywords = keywords


def analyze_query(
    query: str,
    user_id: str,
    document_ids: Optional[List[str]] = None,
    recent_history: Optional[List[Dict[str, str]]] = None
) -> AnalyzedQuery:
    """
    Comprehensive query understanding step before retrieval:
      1. History rewriting into standalone question.
      2. Acronym & terminology expansion using glossary.json + LLM expansion.
      3. Generation of 2-3 query variants for multi-query retrieval.
      4. Vague / document-level routing detection.
    """
    # 1. Rewrite using chat history
    resolved = rewrite_query_with_history(query, recent_history)
    q_type = classify_query(resolved)
    words = re.findall(r"\w+", resolved)
    is_short = len(words) <= 4
    is_vague = (q_type == "DOCUMENT_SUMMARY") or is_vague_document_query(resolved)

    # 2. Load term mappings from document DB and glossary.json
    term_mappings = get_user_term_mappings(user_id=user_id, document_ids=document_ids)

    # Detect terms and acronyms in query
    detected_terms: List[Tuple[str, str]] = []
    
    # Check individual words (for acronyms like AI, ML, CNN, RAG, ResNet)
    for w in words:
        clean_w = w.lower()
        if clean_w in term_mappings:
            detected_terms.append((w, term_mappings[clean_w]))
        else:
            norm = normalize_acronym(w).lower()
            if norm in term_mappings:
                detected_terms.append((w, term_mappings[norm]))

    # Check multi-word phrases
    resolved_lower = resolved.lower()
    for term_lower, expansion in term_mappings.items():
        if " " in term_lower and term_lower in resolved_lower:
            detected_terms.append((term_lower, expansion))

    # If any 2-6 letter uppercase word not in glossary, try quick LLM acronym resolution
    upper_tokens = [w for w in words if w.isupper() and 2 <= len(w) <= 6 and not any(t[0].upper() == w for t in detected_terms)]
    if upper_tokens:
        try:
            from app.services import ai_service, TaskType
            lookup_str = ", ".join(upper_tokens)
            resp = ai_service.generate(
                task_type=TaskType.QUICK_QA,
                system_prompt="Given an acronym in research or engineering, expand it. Output in format: ACRONYM: Full Name. One per line.",
                user_prompt=f"Expand: {lookup_str}",
                max_tokens=60,
                temperature=0.0
            )
            if resp and resp.content:
                for line in resp.content.splitlines():
                    if ":" in line:
                        parts = line.split(":", 1)
                        acr = parts[0].strip().upper()
                        exp = parts[1].strip()
                        if acr in upper_tokens and len(exp) > 3:
                            detected_terms.append((acr, exp))
        except Exception:
            pass

    # 3. Generate 2-3 focused query variants
    variants: List[str] = [resolved]

    for matched_token, expansion in detected_terms:
        # Variant A: Substitute the expanded form
        pattern = re.compile(rf"\b{re.escape(matched_token)}\b", re.IGNORECASE)
        expanded_query = pattern.sub(expansion, resolved)
        if expanded_query.lower() != resolved.lower() and expanded_query not in variants:
            variants.append(expanded_query)

        # Variant B: Both forms together
        combined_phrase = f"{expansion} ({matched_token.upper()})"
        both_variant = pattern.sub(combined_phrase, resolved)
        if both_variant not in variants:
            variants.append(both_variant)

        # Variant C: Definition-targeted variant
        if q_type == "DEFINITION" or is_short:
            def_variant = f"{expansion} definition and key concepts"
            if def_variant not in variants:
                variants.append(def_variant)

    # Ensure 2-3 variants
    if len(variants) == 1:
        if is_vague:
            variants.append("main purpose, core methodology, key findings and summary")
            variants.append("executive overview and document structure")
        else:
            # Extract key nouns for keyword search variant
            content_words = [w for w in words if len(w) > 3]
            if content_words:
                variants.append(" ".join(content_words))

    # 4. Extract keywords
    stopwords = {
        "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or",
        "is", "are", "was", "were", "what", "which", "how", "why", "who",
        "when", "where", "can", "could", "would", "should", "do", "does",
        "did", "tell", "me", "about", "explain", "describe", "please", "this", "that"
    }
    keywords = [w for w in words if w.lower() not in stopwords]
    for _, expansion in detected_terms:
        for exp_w in expansion.split():
            if exp_w.lower() not in stopwords and exp_w not in keywords:
                keywords.append(exp_w)

    # Required logging: rewritten query, variants, detected terms
    logger.info("=" * 60)
    logger.info(f"[Query Understanding] Original Query: {query}")
    logger.info(f"[Query Understanding] Rewritten Standalone Query: {resolved}")
    logger.info(f"[Query Understanding] Query Type: {q_type} (Vague/Summary Route: {is_vague})")
    logger.info(f"[Query Understanding] Detected Glossary Terms: {detected_terms}")
    logger.info(f"[Query Understanding] Generated Variants: {variants[:3]}")
    logger.info("=" * 60)

    return AnalyzedQuery(
        original_query=query,
        resolved_query=resolved,
        query_type=q_type,
        is_short_query=is_short,
        is_vague_or_summary=is_vague,
        detected_terms=detected_terms,
        retrieval_variants=variants[:3],
        keywords=keywords
    )
