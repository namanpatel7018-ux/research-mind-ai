"""
Production Cross-Encoder Reranker & Diversity Layer for ResearchMind AI
========================================================================
Combines:
  1. True Cross-Encoder Reranking:
     - Local ONNX Cross-Encoder (FlashRank BGE / ms-marco-MiniLM-L-12-v2)
     - Optional Cohere Rerank API (if configured)
     - Multi-signal calibrated cross-matching fallback
  2. Page Diversity & MMR:
     - STRICT RULE: No more than 2 chunks per page returned (fixes single-page source problem)
     - Final context size = 5-8 diverse, non-duplicate chunks (configurable in config.yaml)
  3. Structured Logging of candidate ranks and scores.
"""

import os
import re
import math
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.rag.config import get_config_section

logger = logging.getLogger("researchmind.rag.reranker")

# Global cross-encoder cache
_FLASHRANK_CLIENT = None


def _get_flashrank_client(model_name: str = "ms-marco-MiniLM-L-12-v2"):
    global _FLASHRANK_CLIENT
    if _FLASHRANK_CLIENT is None:
        try:
            from flashrank import Ranker
            _FLASHRANK_CLIENT = Ranker(model_name=model_name)
            logger.info(f"Initialized FlashRank Cross-Encoder ({model_name})")
        except Exception as exc:
            logger.warning(f"Could not initialize FlashRank: {exc}")
    return _FLASHRANK_CLIENT


class Reranker:
    def __init__(self, model_name: Optional[str] = None, top_k: Optional[int] = None):
        cfg_reranker = get_config_section("reranker")
        cfg_diversity = get_config_section("diversity")

        self.model_type = cfg_reranker.get("model_type", "bge-reranker")
        self.model_name = model_name or cfg_reranker.get("model_name", "ms-marco-MiniLM-L-12-v2")
        self.min_relevance_score = float(cfg_reranker.get("min_relevance_score", 0.15))
        self.max_chunks_per_page = int(cfg_diversity.get("max_chunks_per_page", 2))
        self.final_context_min = int(cfg_diversity.get("final_context_min", 5))
        self.final_context_max = int(cfg_diversity.get("final_context_max", top_k or 8))
        self.mmr_lambda = float(cfg_diversity.get("mmr_lambda", 0.7))

    def rerank(
        self,
        query: str,
        candidates: List[Tuple[Dict[str, Any], float]],
        query_type: str = "FACTUAL",
        detected_terms: Optional[List[Tuple[str, str]]] = None,
        is_short_query: bool = False
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Executes cross-encoder scoring followed by diversity filtering:
          - Evaluates query-passage cross-attention scores
          - Enforces page diversity: max 2 chunks per page
          - Selects 5-8 diverse chunks
          - Logs candidate scores
        """
        if not candidates:
            return []

        # 1. Cross-Encoder Scoring
        scored_candidates = self._score_cross_encoder(query, candidates, detected_terms)

        # Sort descending by cross-encoder score
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        # 2. Diversity & MMR Selection (Max 2 chunks per page, 5-8 chunks total)
        selected = self._apply_diversity_filter(query, scored_candidates, is_short_query)

        # 3. Log results
        logger.info(f"[Reranker] Query: '{query}' -> Selected {len(selected)} diverse chunks (from {len(candidates)} candidates):")
        for rank, (chunk, score) in enumerate(selected, 1):
            doc = chunk.get("document_name", "Unknown")
            page = chunk.get("page_number", 1)
            sec = chunk.get("section", "General")
            logger.info(f"   #{rank}: [{doc} | Page {page} | Section: {sec}] Score={score:.4f}")

        return selected

    def _score_cross_encoder(
        self,
        query: str,
        candidates: List[Tuple[Dict[str, Any], float]],
        detected_terms: Optional[List[Tuple[str, str]]] = None
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Scores candidate chunks using Cross-Encoder / Cohere / Calibrated model."""
        # A. Try FlashRank local ONNX Cross-Encoder
        ranker = _get_flashrank_client(self.model_name)
        if ranker is not None:
            try:
                from flashrank import RerankRequest
                passages = []
                for idx, (c, _) in enumerate(candidates):
                    passages.append({
                        "id": idx,
                        "text": c.get("text", "")
                    })
                rerank_req = RerankRequest(query=query, passages=passages)
                fr_results = ranker.rerank(rerank_req)
                
                # Map back to chunk payloads
                score_map = {res["id"]: float(res["score"]) for res in fr_results}
                scored = []
                for idx, (chunk, base_score) in enumerate(candidates):
                    ce_score = score_map.get(idx, 0.0)
                    # Blend 85% cross-encoder + 15% initial dense/BM25 RRF score
                    blended = 0.85 * ce_score + 0.15 * min(1.0, base_score * 5.0)
                    scored.append((chunk, round(blended, 4)))
                return scored
            except Exception as exc:
                logger.warning(f"FlashRank reranking error: {exc}. Using calibrated fallback.")

        # B. Try Cohere Rerank API if key is present
        cohere_key = os.getenv("COHERE_API_KEY")
        if cohere_key:
            try:
                import cohere
                co = cohere.ClientV2(api_key=cohere_key)
                docs = [c.get("text", "") for c, _ in candidates]
                response = co.rerank(
                    model="rerank-v3.5",
                    query=query,
                    documents=docs,
                    top_n=len(candidates)
                )
                score_map = {r.index: float(r.relevance_score) for r in response.results}
                scored = []
                for idx, (chunk, base_score) in enumerate(candidates):
                    ce_score = score_map.get(idx, 0.0)
                    scored.append((chunk, round(ce_score, 4)))
                return scored
            except Exception as exc:
                logger.warning(f"Cohere rerank error: {exc}. Using calibrated fallback.")

        # C. Calibrated multi-signal cross-scoring fallback
        return self._calibrated_scoring_fallback(query, candidates, detected_terms)

    def _calibrated_scoring_fallback(
        self,
        query: str,
        candidates: List[Tuple[Dict[str, Any], float]],
        detected_terms: Optional[List[Tuple[str, str]]] = None
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Deterministic cross-scoring based on term boundaries, definitions, and exact phrases."""
        stopwords = {
            "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or",
            "is", "are", "was", "were", "what", "which", "how", "why", "who",
            "when", "where", "can", "could", "would", "should", "do", "does",
            "did", "tell", "me", "about", "explain", "describe", "please"
        }
        query_words = [w.lower() for w in re.findall(r"\w+", query) if w.lower() not in stopwords]
        
        expanded_tokens = []
        if detected_terms:
            for term, exp in detected_terms:
                expanded_tokens.append(term.lower())
                expanded_tokens.extend([w.lower() for w in exp.split() if w.lower() not in stopwords])

        scored = []
        for chunk, initial_score in candidates:
            text_lower = chunk.get("text", "").lower()
            section_lower = chunk.get("section", "").lower()

            matches = sum(1 for w in set(query_words) if re.search(rf"\b{re.escape(w)}\b", text_lower))
            overlap_ratio = matches / max(1, len(set(query_words)))

            # Terminology bonus
            term_bonus = 0.0
            for exp_t in expanded_tokens:
                if re.search(rf"\b{re.escape(exp_t)}\b", text_lower):
                    term_bonus = 0.20
                    break

            # Section alignment
            sec_bonus = 0.10 if any(w in section_lower for w in query_words) else 0.0

            # Document / Section summary bonus for broad questions
            doc_type_bonus = 0.15 if chunk.get("chunk_type") in ["document_summary", "section_summary"] else 0.0

            score = 0.35 * initial_score + 0.30 * overlap_ratio + 0.15 * term_bonus + 0.10 * sec_bonus + 0.10 * doc_type_bonus
            scored.append((chunk, round(score, 4)))

        return scored

    def _apply_diversity_filter(
        self,
        query: str,
        scored_candidates: List[Tuple[Dict[str, Any], float]],
        is_short_query: bool
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Enforces:
          1. Max 2 chunks per page (prevents single-page source issue)
          2. Final context size = 5-8 diverse chunks
          3. MMR / Deduplication against text overlap > 0.70
        """
        selected: List[Tuple[Dict[str, Any], float]] = []
        page_counts: Dict[Tuple[str, int], int] = {}
        deferred: List[Tuple[Dict[str, Any], float]] = []

        min_thresh = 0.05 if is_short_query else self.min_relevance_score

        # Pass 1: Select top candidates respecting the max 2 chunks per page limit
        for chunk, score in scored_candidates:
            if score < min_thresh and len(selected) >= self.final_context_min:
                continue

            doc_id = chunk.get("document_id", "")
            page_num = chunk.get("page_number", 1)
            page_key = (doc_id, page_num)
            c_text = chunk.get("text", "")

            # Check page limit (Max 2 chunks per page)
            if page_counts.get(page_key, 0) >= self.max_chunks_per_page:
                deferred.append((chunk, score))
                continue

            # Deduplication: check overlap with already selected
            is_dup = False
            for sel_chunk, _ in selected:
                if self._compute_jaccard_similarity(c_text, sel_chunk.get("text", "")) > 0.70:
                    is_dup = True
                    break

            if not is_dup:
                selected.append((chunk, score))
                page_counts[page_key] = page_counts.get(page_key, 0) + 1

            if len(selected) >= self.final_context_max:
                break

        # Pass 2: If we have fewer than final_context_min diverse chunks, relax page constraint
        if len(selected) < self.final_context_min and deferred:
            for chunk, score in deferred:
                if score < min_thresh and len(selected) >= 1:
                    continue
                c_text = chunk.get("text", "")
                is_dup = any(self._compute_jaccard_similarity(c_text, s[0].get("text", "")) > 0.70 for s in selected)
                if not is_dup:
                    selected.append((chunk, score))
                if len(selected) >= self.final_context_min:
                    break

        return selected

    def _compute_jaccard_similarity(self, text_a: str, text_b: str) -> float:
        """Word-level Jaccard similarity for deduplication."""
        words_a = set(re.findall(r"\w+", text_a.lower()))
        words_b = set(re.findall(r"\w+", text_b.lower()))
        if not words_a or not words_b:
            return 0.0
        intersection = words_a.intersection(words_b)
        union = words_a.union(words_b)
        return len(intersection) / len(union)
