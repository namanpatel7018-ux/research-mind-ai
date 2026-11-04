---
name: ship-check
description: >-
  Pre-release validation workflow that inspects git status, scans for leaked secrets,
  verifies production builds, checks dependency security, and evaluates deployment readiness.
  Use before releasing or deploying, or when the user mentions "ship-check" or "/ship-check".
---

# Ship-Check — ResearchMind AI 2.0 Pre-Release Verification Skill

This workspace skill implements the global **Ship-Check** standard, tailored specifically for **ResearchMind AI 2.0**. It systematically verifies release readiness across frontend, backend, Docker containers, and security policies.

> [!CAUTION]
> **Zero Automated Deployment Policy**:
> Ship-Check only evaluates and reports release readiness. It **NEVER triggers automatic deployments** (e.g. running `aws/deploy.sh`), modifies production infrastructure (`docker-compose.prod.yml`, `k8s/`), or pushes code to remote branches without explicit user sign-off.

---

## Invocation

* **Natural Language**: *"Run ship-check before pushing release."*
* **Manual Trigger**: `/ship-check`
* **Autonomous Goal Mode**: `/goal ship-check audit repository release readiness`

---

## 6-Point Readiness Audit for ResearchMind AI 2.0

### 1. Git State & Clean Working Tree
* Run `git status`. Verify no uncommitted secrets, temporary files, or merge conflict markers exist.
* Verify branch is cleanly aligned with `origin/main`.

### 2. Secret Scanning & Sensitive Data Isolation
* Run Trufflehog or verify tracked files against secrets.
* Confirm that `.env`, `backend/data/*.db*`, and `backend/data/auth_store.json` remain untracked and excluded in `.gitignore` and `.dockerignore`.

### 3. Production Build & Packaging
* **Frontend Production Build**:
  ```powershell
  # In frontend/
  npm run build
  ```
* **Docker Production Compose Validation**:
  ```powershell
  docker compose -f docker-compose.prod.yml config
  ```

### 4. Full Test Suite & Verification
* **Backend Unit & Integration Tests**:
  ```powershell
  python run_tests.py
  python backend/test_product_upgrade.py
  ```
* Ensure 100% of tests pass with exit code `0`.

### 5. Configuration Parity
* Compare `backend/.env.example` and `frontend/.env.example` against config parsers (`backend/app/core/config.py`).
* Ensure all required API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `SECRET_KEY`) have clear fallback documentation.

### 6. Database Safety & Port Exposure
* Verify `docker-compose.prod.yml` does **not** expose internal backend port `8000:8000` to the host directly.
* Verify SQLite/PostgreSQL schemas contain no destructive drops.

---

## Release Readiness Output Report
Produce a structured report with:
1. **Overall Verdict**: `READY TO SHIP` | `CHANGES REQUIRED` | `BLOCKED`
2. **Readiness Checklist Table** with pass/fail status and exact test outputs.
3. **Identified Blockers or Risks**.
4. **Manual Deployment Next Steps** (requiring explicit user confirmation).
