---
name: gsd-workflow
description: >-
  Structured, disciplined project execution workflow that analyzes architecture, breaks
  complex features into small independently verifiable tasks, tracks progress in a dedicated
  plan file, and verifies milestones incrementally. Use when the user requests structured
  implementation, feature rollout, architectural tasks, milestone tracking, or mentions "GSD" / "Get Shit Done".
---

# GSD (Get Shit Done) — Structured Project Execution Skill

The **GSD Workflow** delivers structured, disciplined, and production-grade software engineering. It prioritizes atomic progress, architectural consistency, and verified milestones over ad-hoc edits.

---

## Core Principles

1. **Architecture & Convention First**: Understand existing patterns before writing a single line of code.
2. **Atomic Deconstruction**: Break features down into small, isolated, and verifiable tasks.
3. **Execution Transparency**: Track task status in a persistent plan file within `.agents/plans/`.
4. **Verified Milestones**: Validate each milestone with automated checks (tests, builds, type checking).
5. **Minimalist & Maintainable**: Prefer minimal surgical edits over wide rewrites.

---

## 9-Step Execution Procedure

```mermaid
graph TD
    S1[1. Analyze Architecture & Conventions] --> S2[2. Atomic Task Decomposition]
    S2 --> S3[3. Map Dependencies & Acceptance Criteria]
    S3 --> S4[4. Initialize Plan File in .agents/plans/]
    S4 --> S5[5. Execute Task Sequentially]
    S5 --> S6[6. Verify Milestone with Checks]
    S6 --> S7[7. Update Progress in Plan File]
    S7 --> S8{All Tasks Done?}
    S8 -- No --> S5
    S8 -- Yes --> S9[8. Update Documentation & Docs Sync]
    S9 --> S10[9. Final Executive Summary]
```

### Step 1: Architectural & Convention Analysis
- Inspect project structure, dependency trees, and technology stack:
  - Backend: FastAPI, SQLModel/PostgreSQL, LangChain, Pydantic v2.
  - Frontend: React 18, TypeScript, TailwindCSS, Vite.
- Identify existing code conventions, folder structures, and existing utility helpers.

### Step 2: Atomic Task Decomposition
- Deconstruct the user's high-level goal into self-contained tasks.
- Keep each task small enough to be completed and verified within a single focused step.

### Step 3: Dependencies & Acceptance Criteria
- For each task, define:
  - **Prerequisites**: Tasks that must be completed prior to starting.
  - **Target Files**: Explicit files to create or modify.
  - **Verification Method**: Specific test command, lint check, or build to run.
  - **Acceptance Criteria**: Concrete condition for marking the task complete.

### Step 4: Plan File Initialization
- Create a dedicated tracking file in `.agents/plans/<feature-slug>-plan.md` using the [Task Plan Template](./resources/task-plan-template.md).
- Status legend:
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed & Verified
  - `[-]` Blocked / Deferred

### Step 5: Sequential Implementation
- Work through tasks in strict dependency order.
- Follow the principle of least disturbance: do not refactor working code unless directly required.

### Step 6: Milestone Verification
- Immediately after implementing a task, run its verification command:
  - Backend unit tests: `python run_tests.py` or targeted test.
  - Frontend type checks & build: `npm run build` in `frontend/`.
- Do not proceed to the next task if the current task's verification fails.

### Step 7: Progress Tracking
- Update the `.agents/plans/<feature-slug>-plan.md` file using `replace_file_content`.
- Mark the task `[x]` and add brief execution notes or command outputs.

### Step 8: Documentation Sync
- If APIs, configurations, or interfaces changed:
  - Update relevant `.env.example`, schemas, or docstrings.
  - Update user-facing documentation if applicable (e.g. `README.md`).

### Step 9: Final Executive Summary
Present a comprehensive completion summary:
- **Completed Tasks**: Detailed list of tasks executed and verified.
- **Verification Evidence**: Commands run and clean test results.
- **Modified & Created Files**: Clickable links (`file://...`).
- **Plan File Reference**: Link to the completed plan file in `.agents/plans/`.
