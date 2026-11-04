# ResearchMind AI - System Architecture

## Architecture Overview

ResearchMind AI is an enterprise-grade AI research assistant and Retrieval-Augmented Generation (RAG) platform. It combines FastAPI, local Qdrant vector storage, BM25 lexical search, FlashRank cross-encoder reranking, and multi-provider AI model routing (Google Gemini and Groq) to deliver grounded academic analysis, document syntheses, presentation exports, and interactive assessments.

```
                          ┌───────────────────────────┐
                          │   React 18 + Vite (SPA)   │
                          │   TailwindCSS + Katex     │
                          └─────────────┬─────────────┘
                                        │ HTTP / JSON (Axios)
                                        ▼
                          ┌───────────────────────────┐
                          │   FastAPI Gateway (:8000) │
                          │   CORS, Auth, Session     │
                          └──────┬─────────────┬──────┘
                                 │             │
                    ┌────────────▼──┐       ┌──▼───────────────────┐
                    │ /api/auth     │       │ /api/ai              │
                    │ JWT / PBKDF2  │       │ RAG, Summaries, PPT  │
                    │ SQLite Auth   │       │ Multi-provider AI    │
                    └───────────────┘       └──┬───────────────────┘
                                               │
               ┌───────────────────────────────┼──────────────────────────────┐
               ▼                               ▼                              ▼
    ┌──────────────────────┐        ┌──────────────────────┐       ┌──────────────────────┐
    │  Hybrid Retrieval    │        │  Multi-Provider AI   │       │  Document Generation │
    │  - Qdrant (Dense)    │        │  - Groq (Llama 3.3)  │       │  - ReportLab PDF     │
    │  - BM25 (Lexical)    │        │  - Gemini (3.6/2.0)  │       │  - python-pptx PPT   │
    │  - FlashRank Rerank  │        │  - Dynamic Fallback  │       │  - PyMuPDF Parser    │
    │  - MMR Diversity     │        │  - Provider Masking  │       │  - Markdown Tables   │
    └──────────────────────┘        └──────────────────────┘       └──────────────────────┘
```

## Key Subsystems

### 1. Multi-Provider AI Routing (`app/services/`)
- **Fast Interactive Tasks (Groq)**: Chat Q&A, rapid summaries, MCQ quizzes, definition lookups.
- **Deep Academic Workloads (Gemini)**: Multi-paper literature reviews, cross-document comparative matrices, slide decks.
- **Reliability & Fallbacks**: Automated retry with exponential backoff on transient errors (503 / 429), bidirectional fallback if primary provider hits quotas or service limits.
- **Brand Masking**: Strips underlying model tokens and leaked vendor strings, ensuring consistent branding.

### 2. High-Precision RAG Engine (`app/rag/`)
- **Parsing**: PyMuPDF-based text and layout block extraction with structural section tagging.
- **Contextual Prefixing**: Chunks include `[Document: {name} | Section: {sec} | Page: {p}]`.
- **Glossary Grounding**: Regex and LLM-assisted terminology extraction storing acronyms in `glossary.json` and SQLite.
- **Hybrid Retrieval**: Fuses dense cosine vectors with BM25 keyword rankings via Reciprocal Rank Fusion ($k=60$).
- **Cross-Encoder Reranking**: FlashRank `ms-marco-MiniLM-L-12-v2` calibrates semantic relevance.
- **Page Diversity**: Enforces a maximum of 2 chunks per page to avoid single-page saturation across multi-page research documents.
- **Threshold Gating**: Strict insufficient evidence fallback (`"I couldn't find this in the provided documents."`).

### 3. Database Layer (`app/db.py`)
- SQLite 3 with Write-Ahead Logging (WAL) mode for low-latency concurrent reads and ACID persistence.
- Multi-tenant tenant isolation indexed by `user_id` across conversations, messages, document terminology, summaries, comparisons, presentations, user settings, and saved answers.

### 4. Authentication Layer (`app/api/auth.py`)
- Password hashing with PBKDF2-SHA256 (no 72-byte password length truncation).
- 6-digit OTP delivery for signup and passwordless login with 10-minute expiry and attempt limiting.
- JWT access tokens (HS256) with client-side expiry warnings and server-side token blacklisting on logout.
- Google OAuth with PKCE flow and graceful local development fallback.
