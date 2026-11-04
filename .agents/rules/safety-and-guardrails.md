# Workspace Safety & Operational Guardrails

This rule defines mandatory safety constraints for all agent operations within the **ResearchMind AI 2.0** repository.

## 1. Non-Destructive Operations & Data Integrity
- **Database Protection**: Never reset, truncate, or delete persistent database files (`*.db`, `*.sqlite*`, `auth_store.json`, `backend/data/*.db*`, or vector stores).
- **User Files Protection**: Never delete user uploads in `uploads/` or `backend/uploads/`.
- **Secret Hygiene**: Never log, expose, hardcode, or commit secrets or API keys. Always keep `.env` excluded from commits and follow `.env.example`.
- **Work Preservation**: Before modifying files, inspect `git status` to avoid overwriting uncommitted or in-progress work. Preserve existing unrelated comments, docstrings, and formatting.

## 2. Test & Verification Honesty
- **Strict Verification**: Never claim a test, type check, lint check, or build has passed without actually running it and observing an exit code of `0`.
- **Exact Reporting**: Always report exact command invocations, exit codes, and truncated stderr/stdout outputs for verification.

## 3. Production & Infrastructure Guardrails
- **Production Freezes**: Never modify production deployment manifests (`docker-compose.prod.yml`, `k8s/`, `aws/deploy.sh`) or execute remote deployments without explicit user consent.
- **Port Safety**: Do not expose private backend services directly on host ports in production configs.

## 4. Iteration & Termination Limits
- **Execution Cap**: Autonomous iterative loops must respect an explicit iteration cap (default: 5 iterations) to prevent infinite loops and resource exhaustion.
- **Early Stop**: Stop and prompt the user immediately when progress is blocked, when acceptance criteria cannot be met without architectural redesign, or when a potentially destructive action would be needed.
