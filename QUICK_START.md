# 🚀 ResearchMind AI - Quick Start Guide

## ✅ System Architecture & Readiness

ResearchMind AI is optimized for fast, accurate RAG retrieval, document synthesis, and publication-grade PDF generation.

---

## 🌐 Access Your Application

### 🎨 Frontend (User Interface)
**URL**: http://localhost:4173 (or `npm run dev` at http://localhost:5173)

### 🔧 Backend API (Documentation)
**URL**: http://localhost:8000/docs
Interactive API documentation (Swagger UI).

---

## 🎯 Core Features

### 1. 💬 AI Chat & Direct "Chat to PDF" Export
- Ask questions about your uploaded documents or general scientific queries.
- Instant answers with semantic context and citations.
- **Export Chat to PDF**: Export your entire chat conversation or any specific message card directly into a beautifully formatted, publication-grade PDF with one click.
  - Proper heading hierarchies (`#`, `##`, `###`).
  - Styled user inquiry callouts & AI response blocks.
  - Formatted data tables with proportional column widths.
  - Code blocks with syntax highlighting and Courier font.
  - Executive first-page banner for concise Q&A answers (no wasted blank cover pages).
  - Two-pass dynamic page numbering (**Page X of Y**) and running academic headers.

### 2. 📄 AI Summary
- Select any document in your library.
- Generate structured academic summaries with key takeaways and methodology analysis.
- One-click export to PDF.

### 3. 📝 Interactive Quiz & PDF Generator
- Generate multiple-choice question (MCQ) assessments from documents or topics.
- Take quizzes interactively in the web UI with immediate score feedback and explanations.
- Download formatted PDF quizzes with optional answer keys.

### 4. 📊 Multi-Document Comparison
- Select 2 or more uploaded papers.
- Perform side-by-side comparative analysis of methodologies, datasets, findings, and limitations.

### 5. 📚 Literature Review Synthesizer
- Ingest multiple research papers.
- Automatically synthesize a structured literature review with background, thematic analysis, synthesis matrix, and research gaps.
- Export review directly to a publication-grade PDF report.

### 6. 🎨 Convert to PPT (Study & Export)
- Enter any topic or select an indexed document.
- Choose number of slides (4 to 15).
- Automatically download structured PowerPoint presentation decks (.pptx) with formatted themes, bullets, and section cards.

### 7. 📁 Library & Document Management
- Upload PDF, TXT, and Markdown files.
- View document metadata, chunks, and token counts.

---

## 🤖 Multi-Provider AI Routing

The backend features an intelligent fallback AI provider architecture:
1. **Google Gemini** (`gemini-2.0-flash` / `gemini-1.5-pro`): High token-budget reasoning and multimodal processing.
2. **Groq / Llama 3.3 70B**: High-speed, low-latency fallback provider.
3. **Cerebras / Llama 3.1 70B & 8B**: Ultra-fast inference provider.

If any provider hits rate limits or transient errors, the system automatically falls back to an available provider with exponential backoff retries.

---

## ⚙️ Running the Project

### Start Backend:
```powershell
cd "backend"
.\.venv\Scripts\uvicorn.exe app.api.main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend:
```powershell
cd "frontend"
npm run dev
```

### Run Full Test Suite:
```powershell
python run_tests.py
```
*(Executes all 39 unit and integration tests across auth, RAG, AI routing, and caching).*

---

## 📊 Features Matrix

| Feature | Description | Output Format |
|---------|-------------|---------------|
| 💬 **AI Chat** | Q&A with documents + full context | Text + Citations |
| 📑 **Chat to PDF** | Instant publication-grade PDF export | Executive Formatted PDF |
| 📄 **Summary** | Document synthesis & key takeaways | Structured Text / PDF |
| 📝 **Quiz** | Multiple-choice questions + interactive player | Interactive UI + PDF |
| 📊 **Compare** | Multi-document side-by-side analysis | Comparative Analysis / PDF |
| 📚 **Literature Review** | Multi-paper thematic synthesis | Academic Review / PDF |
| 🎨 **Convert to PPT** | Presentation deck generation | PowerPoint (.pptx) |
| 📁 **Library** | Secure document ingestion & chunking | Vector Index & Storage |
