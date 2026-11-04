# Research Mind AI

Production-grade, privacy-first AI Research Assistant & Literature Synthesis Platform powered by FastAPI, React 18, Hybrid Retrieval (Qdrant Dense + BM25 Lexical + FlashRank Cross-Encoder Reranking), and Multi-Provider AI Routing (Google Gemini + Groq).

---

## Overview

**Research Mind AI** is an advanced full-stack research intelligence system built for scientists, students, and analysts. It allows users to ingest complex scientific documents (PDF, TXT, Markdown), index them with multi-tenant vector isolation, query them with high-precision grounded citations, generate structured academic literature reviews, produce multi-document comparative matrices, create multi-slide PowerPoint decks, and export publication-grade executive PDF reports.

The system features an intelligent multi-provider routing layer that routes fast interactive tasks to ultra-low-latency models (Groq / Llama 3.3) and heavy cognitive reasoning workloads to high-context models (Google Gemini 3.6 / 2.0), complete with automated retries and fallback guarantees.

---

## Features

- 💬 **Grounded AI Chat**: Conversational Q&A with strict evidence validation, anti-hallucination thresholding, and verifiable source citations (`Document name, page X`).
- 📄 **Structured AI Summaries**: Executive summary, methodology breakdown, key findings, and limitations extraction.
- 📚 **Literature Review Synthesizer**: Cross-paper academic synthesis with thematic categorization, synthesis matrix tables, and research gap identification.
- 📊 **Multi-Document Comparison**: Side-by-side comparative matrices analyzing methodologies, dataset benchmarks, and architectural tradeoffs.
- 🎨 **Convert to PowerPoint (PPTX)**: Algorithmic deck creation with diverse slide archetypes (title, abstract, two-column comparison, process workflows, key metrics, conclusions).
- 📝 **Interactive Quizzes**: Dynamic MCQ assessment generation with immediate scoring feedback, explanatory breakdowns, and PDF quiz export.
- 📑 **Publication-Grade PDF Generation**: ReportLab document compiler with academic running headers, proportional data tables, Courier code blocks, and dynamic page numbering ("Page X of Y").
- 🔒 **Enterprise Authentication**: PBKDF2 password hashing, 6-digit OTP email verification, Google OAuth 2.0 with PKCE, JWT token management, and token blacklisting on logout.
- 🛡️ **Multi-Tenant User Isolation**: Strict user-level data compartmentalization across files, vector embeddings, chat threads, activities, and settings.
- ⚡ **Multi-Provider AI Fallback Engine**: Bidirectional routing between Groq and Google Gemini with exponential backoff and vendor name masking.

---

## Technology Stack

### Backend
- **Framework**: FastAPI 0.109+ with Uvicorn (ASGI)
- **Language**: Python 3.12
- **Database**: SQLite 3 with Write-Ahead Logging (WAL) mode
- **Vector Storage**: Qdrant (local disk-persisted embedded engine or remote cluster)
- **Lexical Search**: Rank-BM25
- **Reranking**: FlashRank Cross-Encoder (`ms-marco-MiniLM-L-12-v2`)
- **LLM Integrations**:
  - Google GenAI SDK (`gemini-3.6-flash`, `gemini-2.0-flash`, `gemini-embedding-001`)
  - Groq SDK (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`)
- **Document Processing**: PyMuPDF (`pymupdf`), `pypdf`, `python-docx`, `python-pptx`, `reportlab`
- **Security**: `passlib` (PBKDF2-SHA256), `python-jose` (HS256 JWT), PKCE OAuth 2.0

### Frontend
- **Framework**: React 18.3.1 (Single Page Application)
- **Build Tool**: Vite 5.4+ with TypeScript 5.6+
- **Styling**: TailwindCSS 3.4+, PostCSS, Lucide Icons, Framer Motion
- **Diagrams & Math**: Mermaid.js 12.0+, Katex (LaTeX rendering)
- **HTTP Client**: Axios with dynamic request & response interceptors

---

## Project Structure

```
Research Mind AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai.py               # AI features, chat, upload, export endpoints
│   │   │   ├── auth.py             # Auth router, OTP, Google OAuth, JWT, user profile
│   │   │   └── main.py             # FastAPI entrypoint, CORS, /health route
│   │   ├── db.py                   # SQLite database layer with WAL mode
│   │   ├── main.py                 # ASGI application runner
│   │   ├── rag/
│   │   │   ├── config.py           # YAML config loader
│   │   │   ├── embeddings.py       # Dense vector embedder
│   │   │   ├── generator.py        # Grounded LLM generation & prompt templates
│   │   │   ├── models.py           # Pydantic data schemas
│   │   │   ├── parser.py           # PDF/TXT parser & contextual chunker
│   │   │   ├── query_analyzer.py   # Intent classification & acronym expansion
│   │   │   ├── rag_service.py      # Core RAG indexing and search coordinator
│   │   │   ├── reranker.py         # Cross-encoder & MMR page diversity
│   │   │   ├── retriever.py        # Hybrid Dense + BM25 RRF retriever
│   │   │   ├── summarizer.py       # Document-level summary generator
│   │   │   ├── terminology.py      # Glossary extractor & resolver
│   │   │   ├── vector_store.py     # Qdrant client & vector operations
│   │   │   └── verifier.py         # Grounding & citation validator
│   │   └── services/
│   │       ├── ai_router.py        # Task-based Groq vs Gemini routing
│   │       ├── ai_service.py       # AI orchestration & retry/fallback handler
│   │       └── providers/          # Gemini & Groq provider adapters
│   ├── data/                       # Local SQLite, auth store, Qdrant vectors
│   ├── tests/                      # Unit & integration test suites
│   ├── uploads/                    # User document storage isolated by user_id
│   ├── Dockerfile                  # Backend production Dockerfile
│   ├── pyproject.toml              # Python project metadata
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── public/                     # Static assets
│   ├── src/
│   │   ├── assets/                 # App logos and icons
│   │   ├── components/             # Reusable UI components & layouts
│   │   ├── context/                # AuthContext & State management
│   │   ├── lib/                    # API client (api.ts), auth helpers, download utils
│   │   ├── pages/                  # Chat, Summary, Library, Review, Quiz pages
│   │   ├── App.tsx                 # App router & protected route shell
│   │   ├── main.tsx                # React entrypoint
│   │   └── styles.css              # Global styles & Tailwind directives
│   ├── Dockerfile                  # Frontend multi-stage Nginx Dockerfile
│   ├── nginx.conf                  # Nginx SPA & reverse proxy configuration
│   ├── package.json                # Frontend dependencies
│   └── vite.config.ts              # Vite bundler configuration
├── database/                       # Database schema references
├── docs/                           # Architecture, diagnosis & benchmark documentation
├── .github/
│   └── workflows/
│       └── ci.yml                  # Automated GitHub Actions CI pipeline
├── .env.example                    # Environment variable template
├── .gitignore                      # Comprehensive Git exclusion rules
├── config.yaml                     # RAG thresholds & parameters
├── docker-compose.yml              # Multi-container orchestration
├── Dockerfile                      # Root container build definition
├── PROMPT.md                       # Grounded RAG system prompt instructions
├── run_tests.py                    # Test suite runner
├── start.bat                       # Windows one-click startup batch script
└── start.ps1                       # PowerShell startup orchestrator
```

---

## Requirements

- **Python**: Version 3.11 or 3.12
- **Node.js**: Version 18+ or 20+ (with npm)
- **Operating System**: Windows, Linux, or macOS
- **API Keys**:
  - Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))
  - Groq API key ([Groq Cloud](https://console.groq.com/))

---

## Environment Variables

Copy `.env.example` to `.env` (or `backend/.env`) and configure the values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key | *Required* |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-3.6-flash` |
| `GROQ_API_KEY` | Groq API key | *Required* |
| `GROQ_MODEL` | Groq model identifier | `openai/gpt-oss-120b` |
| `SECRET_KEY` | JWT encryption secret | *Random 64-char string* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token validity | `1440` (24 hours) |
| `HOST` | Backend server host | `0.0.0.0` |
| `PORT` | Backend server port | `8000` |
| `BACKEND_URL` | Public backend URL | `http://localhost:8000` |
| `FRONTEND_URL` | Public frontend URL | `http://localhost:4173` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173,http://localhost:4173` |
| `SMTP_HOST` | SMTP server for OTP emails | `smtp.gmail.com` (optional) |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | *Optional* |
| `SMTP_PASSWORD` | SMTP password / App Password | *Optional* |
| `EMAIL_FROM` | Outgoing email from header | `ResearchMind AI <noreply@...>` |
| `VITE_API_URL` | Frontend API endpoint | `http://localhost:8000/api` |

---

## Local Development

### 1. One-Click Launch (Windows)
Run the startup script from the root directory:
```powershell
.\start.ps1
```
Or double-click `start.bat`. This automatically starts the FastAPI backend on port `8000`, the Vite frontend on port `4173`, and opens your default browser.

---

### 2. Manual Installation & Launch

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows activation:
.\.venv\Scripts\activate
# Linux/macOS activation:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend development server
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is live at `http://localhost:8000` (Interactive docs at `http://localhost:8000/docs`).

#### Frontend Setup
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend is live at `http://localhost:5173` (or `http://localhost:4173`).

---

## Database Setup

The application uses an embedded **SQLite 3** database with Write-Ahead Logging (`WAL` mode) located at `data/researchmind.db`.
- Schema migrations and table creation occur automatically on startup via `app.db.init_db()`.
- No separate database installation or daemon is required.
- To reset local development data, delete `data/researchmind.db` and restart the backend.

---

## Production Build

### Frontend Production Build
```bash
cd frontend
npm run build
```
This generates the optimized production bundle in `frontend/dist/`.

### Backend Production Server
Run using production ASGI configuration:
```bash
cd backend
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Docker Deployment

### Run Full Stack with Docker Compose
```bash
# Ensure .env is populated with your API keys
docker compose up -d --build
```

- **Frontend**: Available at `http://localhost:4173`
- **Backend API**: Available at `http://localhost:8000`
- **Health Check**: Available at `http://localhost:8000/health`

Data and uploaded files are automatically persisted in Docker named volumes (`backend_data` and `backend_uploads`).

To stop services:
```bash
docker compose down
```

---

## Deployment Instructions

For step-by-step guides on deploying to **Render**, **Railway**, **Vercel**, **AWS ECS**, or a **Linux VPS**, refer to the detailed [Deployment Guide](file:///d:/Research%20Mind%20AI%202.0/docs/DEPLOYMENT_GUIDE.md).

---

## API Configuration & Endpoints

### Core Endpoints

| Category | Method | Path | Description |
| :--- | :---: | :--- | :--- |
| **System** | `GET` | `/health` | Server and AI provider routing health check |
| **Auth** | `POST` | `/api/auth/token` | Email and password authentication |
| **Auth** | `POST` | `/api/auth/login/request-otp` | Request passwordless login OTP |
| **Auth** | `POST` | `/api/auth/login/verify-otp` | Verify login OTP & obtain JWT |
| **Auth** | `POST` | `/api/auth/signup/request-otp` | Initiate registration with OTP |
| **Auth** | `POST` | `/api/auth/signup/verify-otp` | Verify signup OTP & create account |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate token and terminate session |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile |
| **Auth** | `GET` | `/api/auth/settings` | Retrieve user preferences and theme settings |
| **Documents** | `POST` | `/api/ai/upload` | Upload and vectorize PDF, TXT, or MD documents |
| **Documents** | `GET` | `/api/ai/files` | List ingested documents with page & chunk counts |
| **Documents** | `DELETE` | `/api/ai/files/{filename}` | Delete document and vector index |
| **Chat** | `POST` | `/api/ai/chat` | Grounded multi-turn RAG chat query |
| **Research** | `POST` | `/api/ai/summarize` | Generate structured academic summary |
| **Research** | `POST` | `/api/ai/compare` | Multi-paper comparative matrix |
| **Research** | `POST` | `/api/ai/literature-review` | Thematic literature review synthesis |
| **Exports** | `POST` | `/api/ai/convert-to-ppt` | Algorithmic PowerPoint (.pptx) deck generation |
| **Exports** | `POST` | `/api/ai/generate-quiz` | PDF quiz generation with optional answers |
| **Exports** | `POST` | `/api/ai/generate-pdf` | Publication-grade ReportLab PDF compilation |

---

## Troubleshooting

1. **Port 8000 or 4173 is already in use:**
   - The included `start.ps1` script automatically detects and terminates orphaned processes occupying ports 8000 and 4173.
   - Manually release ports on Windows:
     ```powershell
     Get-NetTCPConnection -LocalPort 8000, 4173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
     ```

2. **AI Provider Rate Limits (429 or 503):**
   - The application automatically executes exponential backoff retries and switches to the fallback provider (e.g. falls back from Gemini to Groq or vice versa).
   - Check `/health` endpoint to inspect the current availability status of configured providers.

3. **Missing or Expired Verification OTP:**
   - In development environments without configured SMTP credentials, sign-up OTPs can be verified using the test accounts or credentials logged in server output.
   - For real email delivery, verify your `SMTP_HOST`, `SMTP_USER`, and 16-character Google App Password in `.env`.

---

## Security Notes

- **Zero Secrets in Git**: The repository strictly excludes `.env` files via `.gitignore`. Never commit API keys or production database URLs.
- **Password Hashing**: Passwords are saved using PBKDF2-SHA256 with 29,000 iterations.
- **Multi-Tenant Protection**: Every document, vector chunk, SQLite query, and download path enforces strict `user_id` ownership checks.
- **Provider Masking**: AI responses are sanitized to strip proprietary model tags and vendor tokens before reaching the client interface.
