# ResearchMind AI 2.0 — Antigravity Workspace Guidelines

This repository uses Antigravity workspace customizations stored in [`.agents/`](file:///d:/Research%20Mind%20Ai%202.0/.agents/).

## Active Safety Rules & Policies
All agent actions in this workspace must adhere to [`.agents/rules/safety-and-guardrails.md`](file:///d:/Research%20Mind%20Ai%202.0/.agents/rules/safety-and-guardrails.md):
- **Never claim tests or builds passed** without actually executing them in the session and verifying exit code 0.
- **Never delete or wipe** user data, persistent databases (`*.db`, `auth_store.json`), or uploads (`uploads/`).
- **Never expose secrets** or commit `.env`.
- **Never deploy or modify production infrastructure** (`aws/deploy.sh`, `docker-compose.prod.yml`, `k8s/`) without explicit user sign-off.
- Inspect `git status` before editing to preserve ongoing work.

## Available Workspace Skills
When prompted, discover and execute the corresponding workflow in [`.agents/skills/`](file:///d:/Research%20Mind%20Ai%202.0/.agents/skills/):
- **ralph-loop**: Iterative, test-driven development loop with automated test execution and configurable iteration caps.
- **gsd-workflow**: Structured project execution decomposing features into small atomic tasks tracked in `.agents/plans/`.
- **coderabbit-review**: 10-point code and PR review for security, logic errors, auth flaws, and performance.
- **ship-check**: Pre-release readiness inspection, secret audit, build validation, and deployment freeze.

Refer to [`.agents/README.md`](file:///d:/Research%20Mind%20Ai%202.0/.agents/README.md) for detailed invocation and usage documentation.
