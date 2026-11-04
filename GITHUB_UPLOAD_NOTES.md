# GitHub upload notes

This repository contains the Research Mind AI source code.

## Before running locally
1. Create and activate a Python virtual environment in `backend/`.
2. Install backend dependencies with `pip install -r requirements.txt`.
3. Copy `backend/.env.example` to `backend/.env` and add your own API credentials.
4. Install frontend dependencies with `cd frontend && npm install`.
5. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` if needed.

Never commit real `.env` files, API keys, passwords, private keys, local databases, or users' uploaded documents.
