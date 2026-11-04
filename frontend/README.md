# ResearchMind AI

A production-ready SaaS-style web application scaffold for research and academic AI workflows.

## Stack
- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- FastAPI + Python
- PostgreSQL + ChromaDB + LangChain
- Gemini/OpenAI API integration

## Local setup

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Backend
1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate` or `.\.venv\Scripts\activate`
4. `pip install -r requirements.txt` (or `pip install .`)
5. `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Notes
- Replace `SECRET_KEY` in `backend/app/api/auth.py` with a secure value.
- Add your OpenAI/Gemini API keys to environment variables and implement LangChain workflows in `backend/app/api/ai.py`.
