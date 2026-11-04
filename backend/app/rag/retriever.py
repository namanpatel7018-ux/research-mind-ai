"""
Hybrid Retriever combining Dense Vector Similarity and BM25 Lexical Search with
Reciprocal Rank Fusion (RRF), Multi-Query Expansion, and Document-Level Routing.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from rank_bm25 import BM25Okapi

from app.rag.vector_store import QdrantVectorStore
from app.rag.reranker import Reranker
from app.rag.query_analyzer import analyze_query, AnalyzedQuery
from app.rag.config import get_config_section

logger = logging.getLogger("researchmind.rag.retriever")


class HybridRetriever:
    """
    Combines Qdrant Dense Similarity Search and BM25 Sparse Lexical Search.
    Fuses results using Reciprocal Rank Fusion (RRF) across query variants,
    supports Document-Level Routing for vague/summary questions,
    and passes candidates to the Cross-Encoder Reranker.
    """

    def __init__(
        self,
        vector_store: Optional[QdrantVectorStore] = None,
        reranker: Optional[Reranker] = None,
        top_k_retrieval: Optional[int] = None
    ):
        cfg = get_config_section("retrieval")
        self.vector_store = vector_store or QdrantVectorStore()
        self.reranker = reranker or Reranker()
        self.top_k_candidates = int(cfg.get("top_k_candidates", top_k_retrieval or 25))
        self.rrf_k = float(cfg.get("rrf_k", 60.0))

    def retrieve(
        self,
        query: str,
        user_id: str,
        document_ids: Optional[List[str]] = None,
        recent_history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[List[Tuple[Dict[str, Any], float]], Dict[str, Any]]:
        """
        Executes complete hybrid retrieval:
          1. Query Understanding (history rewriting, acronym expansion, 2-3 variants, vague detection)
          2. Document-Level Routing (if query is vague / summary request)
          3. Multi-Query Dense Vector Search across all variants
          4. BM25 Lexical Search with acronym expansion tokens
          5. Reciprocal Rank Fusion (RRF)
          6. Cross-Encoder Reranking & Page Diversity Enforcement (5-8 diverse chunks)
        """
        # 1. Analyze query
        analyzed = analyze_query(
            query=query,
            user_id=user_id,
            document_ids=document_ids,
            recent_history=recent_history
        )

        all_user_chunks = self.vector_store.get_user_chunks(user_id=user_id, document_ids=document_ids)

        # 2. DOCUMENT-LEVEL ROUTING for vague / overview queries
        if analyzed.is_vague_or_summary:
            logger.info(f"[Retrieval] Routing query '{query}' to DOCUMENT-LEVEL path.")
            doc_level_candidates: List[Tuple[Dict[str, Any], float]] = []
            
            # Prioritize document summary chunks, section summaries, and leading chunks
            for c in all_user_chunks:
                c_type = c.get("chunk_type", "content")
                if c_type == "document_summary":
                    doc_level_candidates.append((c, 1.0))
                elif c_type == "section_summary":
                    doc_level_candidates.append((c, 0.85))
                elif c.get("page_number", 1) == 1:
                    doc_level_candidates.append((c, 0.70))

            if doc_level_candidates:
                # Deduplicate and rank
                seen_cids = set()
                unique_doc_candidates = []
                for c, s in doc_level_candidates:
                    cid = c.get("chunk_id")
                    if cid not in seen_cids:
                        seen_cids.add(cid)
                        unique_doc_candidates.append((c, s))

                reranked = self.reranker.rerank(
                    query=analyzed.resolved_query,
                    candidates=unique_doc_candidates[:self.top_k_candidates],
                    query_type="DOCUMENT_SUMMARY",
                    detected_terms=analyzed.detected_terms,
                    is_short_query=analyzed.is_short_query
                )
                retrieval_meta = {
                    "total_user_chunks": len(all_user_chunks),
                    "retrieved_count": len(unique_doc_candidates),
                    "reranked_count": len(reranked),
                    "query_type": "DOCUMENT_SUMMARY",
                    "resolved_query": analyzed.resolved_query,
                    "detected_terms": [f"{t[0]} ↔ {t[1]}" for t in analyzed.detected_terms],
                    "is_short_query": analyzed.is_short_query,
                    "methods": [
                        "Document-Level Hierarchical Routing",
                        "Executive Document Summary Matching",
                        "Cross-Encoder Relevance & Diversity"
                    ]
                }
                return reranked, retrieval_meta

        # 3. Standard Multi-Query Hybrid Search (Vector + BM25 + RRF)
        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, Dict[str, Any]] = {}

        # Run dense search across the 2-3 query variants
        variants_to_search = analyzed.retrieval_variants[:3]
        for v_idx, variant_query in enumerate(variants_to_search):
            weight = 1.0 if v_idx == 0 else 0.85
            dense_hits = self.vector_store.search_dense(
                query=variant_query,
                user_id=user_id,
                document_ids=document_ids,
                top_k=self.top_k_candidates
            )
            for rank, (payload, _) in enumerate(dense_hits):
                cid = payload.get("chunk_id", "")
                if cid:
                    chunk_map[cid] = payload
                    rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (weight / (self.rrf_k + rank + 1))

        # 4. BM25 Lexical Retrieval with query terms + expanded acronyms
        if all_user_chunks:
            corpus_tokens = []
            for c in all_user_chunks:
                t = c.get("text", "").lower()
                tokens = [w.strip("(),;:.[]\"'") for w in t.split() if w.strip("(),;:.[]\"'")]
                corpus_tokens.append(tokens)

            bm25 = BM25Okapi(corpus_tokens)

            # Build query tokens
            query_tokens = [w.lower().strip("(),;:.[]\"'") for w in analyzed.resolved_query.split() if w.strip("(),;:.[]\"'")]
            for kw in analyzed.keywords:
                kw_clean = kw.lower().strip("(),;:.[]\"'")
                if kw_clean and kw_clean not in query_tokens:
                    query_tokens.append(kw_clean)

            bm25_scores = bm25.get_scores(query_tokens)
            indexed_bm25 = [(all_user_chunks[i], float(bm25_scores[i])) for i in range(len(all_user_chunks))]
            indexed_bm25.sort(key=lambda x: x[1], reverse=True)
            top_bm25 = indexed_bm25[:self.top_k_candidates]

            for rank, (payload, _) in enumerate(top_bm25):
                cid = payload.get("chunk_id", "")
                if cid:
                    chunk_map[cid] = payload
                    rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank + 1))

        # 5. Sort candidates by RRF score (Retrieve top 20-30 candidates)
        fused_candidates: List[Tuple[Dict[str, Any], float]] = []
        for cid, rrf_score in sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True):
            fused_candidates.append((chunk_map[cid], rrf_score))

        top_candidates = fused_candidates[:self.top_k_candidates]

        # 6. Cross-Encoder Reranker + Page Diversity
        reranked_chunks = self.reranker.rerank(
            query=analyzed.resolved_query,
            candidates=top_candidates,
            query_type=analyzed.query_type,
            detected_terms=analyzed.detected_terms,
            is_short_query=analyzed.is_short_query
        )

        retrieval_meta = {
            "total_user_chunks": len(all_user_chunks),
            "retrieved_count": len(top_candidates),
            "reranked_count": len(reranked_chunks),
            "query_type": analyzed.query_type,
            "resolved_query": analyzed.resolved_query,
            "detected_terms": [f"{t[0]} ↔ {t[1]}" for t in analyzed.detected_terms],
            "is_short_query": analyzed.is_short_query,
            "methods": [
                "Multi-Query Dense Semantic Search (Qdrant)",
                "BM25 Lexical Search (Acronym Expanded)",
                "Reciprocal Rank Fusion (RRF)",
                "Cross-Encoder Reranker",
                "Max-2-Per-Page Diversity Filter"
            ]
        }

        return reranked_chunks, retrieval_meta
