# RAG Codebase Audit & System Diagnosis

**Date:** 2026-09-29  
**Auditor:** Senior RAG Engineer  
**Repository:** ResearchMind AI  
**Scope:** Ingestion, Chunking, Embeddings, Vector Storage, Retrieval, Reranking, Prompt Construction, and Generation.

---

## 1. Executive Summary

An audit of the ResearchMind AI RAG pipeline reveals that while the foundation (FastAPI, PyMuPDF, Qdrant, BM25, and Pydantic models) is architecturally clean, five core architectural bottlenecks produce the issues reported:
1. **No Contextual Prefixing & Fragile Chunking:** Chunks are created from per-page layout blocks without prepending document title and structural section hierarchy.
2. **Lack of Acronym & Glossary Grounding:** Ingested acronyms are stored in a database table but never exported to an accessible `glossary.json`, never injected into the LLM prompt's `{glossary}` block, and not expanded via LLM query understanding.
3. **Zero Page Diversity / Redundancy Clustering:** Retriever and Reranker lack Maximal Marginal Relevance (MMR) or per-page clustering limits (max 2 chunks per page), causing multiple chunks from Page 1 to saturate top-k.
4. **No Document-Level Route for Vague/Summary Queries:** Ingestion only creates local text chunks. Global or vague queries ("what about this pdf?", "summarize this") fail similarity search because no document-level or section-level summaries exist.
5. **Prompt Disconnect & Heuristic Reranker:** The system was hardcoded with a lengthy prompt in `generator.py`, ignoring `PROMPT.md`. The reranker was a heuristic formula rather than a true cross-encoder or calibrated ranking pipeline.

---

## 2. Baseline Architecture Diagnosis

| Dimension | Current Implementation | Findings & Vulnerabilities |
| :--- | :--- | :--- |
| **Chunk Size & Overlap** | Target: 500 tokens, Max: 700 tokens, Overlap: 75 tokens (~15%). | Hardcoded via env defaults in `parser.py`. Splits on layout blocks per page without crossing page boundaries. Text chunks lack document title and section name prefixes. |
| **Embedding Model** | `gemini-embedding-001` (3072-dim) with fallback to `LocalSemanticEmbedder` (768-dim). | Fallback silently switches dimensions from 3072 to 768, which can crash Qdrant collections with dimension mismatches. Model names and thresholds are hardcoded in python files. |
| **Vector Store** | Qdrant (`qdrant_client`) using local storage `data/qdrant_storage` or in-memory, paired with `data/rag_metadata.json`. | Multi-tenant user isolation is properly enforced via payload filters, but metadata does not index document summaries, section summaries, or glossary entries as retrievable units. |
| **Retrieval Top-K** | `top_k_retrieval`: 20. Fuses Dense (up to 2 variants) + BM25 via Reciprocal Rank Fusion ($k=60$). | Candidates retrieved: 20. Does not scale to 20–30 candidates consistently across multi-query expansions. |
| **Reranker Top-K** | `top_k_rerank`: 5 (reduced to 4 for FACTUAL/DEFINITION, 6 for COMPARISON/SUMMARY). | Scoring uses a handcrafted rule-based formula (overlap + bonuses). No cross-encoder reranker model (e.g., BGE-reranker or Cohere) or calibrated semantic scoring. |
| **Metadata Storage** | `chunk_id`, `document_id`, `document_name`, `user_id`, `page_number`, `section`, `token_count`, `bbox`. | Essential per-chunk fields exist, but document summaries, section summaries, and acronym glossary mappings are NOT indexed as searchable items. |
| **Prompt Construction** | Hardcoded in `generator.py` (`STRICT_RAG_SYSTEM_PROMPT`). | `PROMPT.md` is completely bypassed. `{glossary}` and `{history}` slots are absent. Citations are requested in a format different from `PROMPT.md` Rule 7. |

---

## 3. Root Cause Analysis of User-Reported Problems

### Problem 1: "The answer often does not come from my provided documents."
- **Root Cause:** In `generator.py`, when context had weak similarity, the model was instructed with heavy formatting directives that encouraged structural hallucination.
- **Root Cause:** Chunks in vector store lacked document title and section context. A chunk discussing "the methodology results in 94% accuracy" had no embedded indication of which document, algorithm, or dataset it pertained to.

### Problem 2: "Short names, abbreviations and acronyms are not understood."
- **Root Cause:** Although `extract_document_terminology()` regex-extracted definitions into a SQLite table, the mappings were never written to a standardized `glossary.json`.
- **Root Cause:** The LLM prompt had no `{glossary}` section. When a user asked "What is CNN?", the generation prompt did not contain the document-grounded definition.
- **Root Cause:** Query expansion did not use LLM acronym resolution for domain-specific nicknames not caught by simple regex.

### Problem 3: "Sources always show the same page, even when the answer is on other pages."
- **Root Cause:** `reranker.py` and `retriever.py` had no page-level diversity constraints. If Page 1 (e.g., abstract and introduction) had high lexical and semantic overlap with the question keywords, 4 to 5 chunks from Page 1 filled all slots.
- **Root Cause:** `verifier.py` fallback logic defaulted to `retrieved_chunks[:3]` when the LLM did not emit explicit "Page X" tags, cementing the single-page bias.

### Problem 4: "Vague questions like 'what about this pdf?' or 'summarize this' get no useful answer."
- **Root Cause:** Vector similarity and BM25 search match queries against 500-token chunks. A query like "summarize this" or "what about this pdf?" has almost zero lexical/semantic similarity with individual technical paragraphs.
- **Root Cause:** There was no document-level route. At ingestion time, no holistic document summary or section summaries were generated.

### Problem 5: "Answers are inaccurate."
- **Root Cause:** Absence of conversational history rewriting caused pronoun-heavy or multi-turn questions to search for the wrong entities.
- **Root Cause:** Lack of true cross-encoder reranking allowed spurious keyword-stuffed chunks to outrank deep semantic passages.

---

## 4. Implementation Roadmap (Step 2 & 3)

1. **Configuration (`config.yaml`):** Centralize chunk sizes, overlap, top-k, diversity limits, reranking model, and relevance thresholds.
2. **Chunking & Ingestion Extras (`parser.py`, `rag_service.py`):**
   - Recursive/semantic chunker (500–800 tokens, 10–15% overlap) splitting on headings/paragraphs.
   - Prefix every chunk: `[Document: {doc_name} | Section: {section_title} | Page: {page_number}]\n\n{text}`.
   - At ingest time: Generate & store document summary, section summaries, and `glossary.json`. Index these into Qdrant/metadata.
3. **Query Understanding (`query_analyzer.py`):**
   - History rewriting into standalone question.
   - Acronym/short name expansion using `glossary.json` + LLM expansion.
   - 2–3 multi-query variants.
   - Document-level routing for vague queries ("what about this pdf", "summarize", "overview").
4. **Hybrid Retrieval + Diversity + Reranking (`retriever.py`, `reranker.py`):**
   - Retrieve top 20–30 candidates via Vector + BM25 + RRF.
   - Cross-encoder reranker (with BGE/Cohere/calibrated cross-encoder scoring).
   - Diversity enforcement: Max 2 chunks per page, returning 5–8 diverse chunks.
5. **Grounded Generation & Citations (`generator.py`, `PROMPT.md`, `verifier.py`):**
   - Use `PROMPT.md` dynamically with `{context}`, `{glossary}`, `{history}`, `{question}`.
   - Strict threshold check: low relevance returns exact missing information phrase.
   - Citations: strictly return document name and page for chunks actually used.
6. **Evaluation (`eval.py`):**
   - Benchmark 20 test questions (short-name, vague, multi-page, out-of-scope).
   - Report hit-rate@k, answer faithfulness, and unique pages in sources (before vs after).
