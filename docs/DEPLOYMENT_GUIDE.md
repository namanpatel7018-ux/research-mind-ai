# ResearchMind AI - Production Deployment Guide

This guide covers deployment options for ResearchMind AI across multiple modern platforms.

---

## 1. Environment Configuration

Regardless of the target platform, configure these environment variables:

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | `AIzaSy...` |
| `GROQ_API_KEY` | Groq API key | Yes | `gsk_...` |
| `SECRET_KEY` | JWT signing secret | Yes | Random 64-char hex string |
| `BACKEND_URL` | Deployed backend URL | Yes | `https://api.researchmind.ai` |
| `FRONTEND_URL` | Deployed frontend URL | Yes | `https://researchmind.ai` |
| `CORS_ORIGINS` | Allowed frontend domains | Yes | `https://researchmind.ai,http://localhost:5173` |
| `PORT` | Listening port (injected by host) | Auto | `8000` |
| `HOST` | Host binding | Optional | `0.0.0.0` |
| `SMTP_HOST` | SMTP server for email OTPs | Optional | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | Optional | `587` |
| `SMTP_USER` | SMTP username | Optional | `admin@domain.com` |
| `SMTP_PASSWORD` | SMTP app password | Optional | `16-char app password` |
| `EMAIL_FROM` | Sender display name | Optional | `ResearchMind AI <noreply@domain.com>` |
| `QDRANT_URL` | Remote Qdrant instance (optional) | Optional | `https://xyz.cloud.qdrant.io` |
| `QDRANT_API_KEY` | Remote Qdrant API key | Optional | `qdrant-api-key` |

---

## 2. Option A: Docker Compose (VPS / Single Host)

The simplest deployment method for Linux VPS (Ubuntu/Debian) or cloud servers:

1. Clone repository:
   ```bash
   git clone https://github.com/namanpatel7018-ux/NEW-RESEARCH-MIND-AI.git
   cd NEW-RESEARCH-MIND-AI
   ```

2. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   # Edit with your real credentials
   nano .env
   ```

3. Launch services:
   ```bash
   docker compose up -d --build
   ```

4. Verify health:
   ```bash
   docker compose ps
   curl http://localhost:8000/health
   ```

---

## 3. Option B: Separate Frontend (Vercel) & Backend (Render/Railway)

### Backend on Render / Railway:
1. Connect GitHub repository.
2. Root directory: Leave as root or set to `backend`.
3. If building from root:
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn app.api.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables in Render/Railway dashboard (`GEMINI_API_KEY`, `GROQ_API_KEY`, `SECRET_KEY`, `FRONTEND_URL`, etc.).
5. Mount persistent disk to `/app/backend/data` and `/app/backend/uploads` if using local SQLite and Qdrant.

### Frontend on Vercel:
1. Connect GitHub repository.
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com/api`

---

## 4. Option C: AWS / GCP / Azure Container Deployments

1. Build backend image:
   ```bash
   docker build -t researchmind-backend:latest -f backend/Dockerfile ./backend
   ```
2. Build frontend image:
   ```bash
   docker build -t researchmind-frontend:latest -f frontend/Dockerfile ./frontend
   ```
3. Deploy to AWS ECS, GCP Cloud Run, or Azure Container Apps with attached cloud volume for storage.
