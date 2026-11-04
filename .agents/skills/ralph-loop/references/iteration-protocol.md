# Ralph Loop — Iteration & Verification Protocol

This document provides concrete commands and safety policies for running iterative verification loops in **ResearchMind AI 2.0**.

---

## Repository Test Runners & Build Verification

When executing Step 5 and Step 8 of the Ralph Loop, use the following commands:

### 1. Backend Verification
- **Run All Backend Unit Tests**:
  ```powershell
  python run_tests.py
  ```
- **Run Specific Backend Test File**:
  ```powershell
  python -m unittest backend/tests/test_auth.py
  python -m unittest backend/tests/test_ai_routing.py
  python -m unittest backend/tests/test_rag_pipeline.py
  python -m unittest backend/tests/test_quiz.py
  ```
- **Test Mode Environment Flags**:
  Set `TESTING=1` or `ENV=testing` when running tests that should avoid connecting to live external AI providers.

### 2. Frontend Verification
- **TypeScript & Vite Build Check**:
  ```powershell
  # Working directory: d:\Research Mind Ai 2.0\frontend
  npm run build
  ```
- **Type Checking Only (Quick Check)**:
  ```powershell
  # Working directory: d:\Research Mind Ai 2.0\frontend
  npx tsc --noEmit
  ```

---

## Loop Guardrails & Stop Triggers

The agent MUST stop iterating and consult the user under any of the following conditions:

1. **Iteration Limit Exceeded**: Iteration count reaches the configured maximum (default: 5).
2. **Missing Secrets or External Services**: Failure is caused by missing live API keys (e.g. `GEMINI_API_KEY`, `GROQ_API_KEY`) that cannot be mocked.
3. **Destructive Operations Required**: The proposed fix would require resetting data stores, deleting existing migrations, or clearing uploaded files.
4. **Flapping / Cyclic Regression**: A fix for Test A causes Test B to break, and subsequent fix for Test B breaks Test A again.
