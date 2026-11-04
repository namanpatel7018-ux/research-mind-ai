# Google Antigravity Agentic Workflows & Customizations

This directory contains workspace-scoped rules, skills, and planning resources for Google Antigravity in **ResearchMind AI 2.0**.

---

## 1. Directory Structure

```text
.agents/
├── README.md                              # This reference guide
├── rules/
│   └── safety-and-guardrails.md           # Mandatory workspace-wide safety constraints
├── plans/                                 # Persistent task tracking files for multi-step projects
│   └── .gitkeep
└── skills/
    ├── ralph-loop/                        # Iterative, test-driven development loop
    │   ├── SKILL.md                       # Main instructions and workflow definition
    │   └── references/
    │       └── iteration-protocol.md      # Test runners, build commands, and loop stop triggers
    ├── gsd-workflow/                      # Structured project execution (Get Shit Done)
    │   ├── SKILL.md                       # 9-step structured feature delivery workflow
    │   └── resources/
    │       └── task-plan-template.md      # Template for feature plan files
    ├── coderabbit-review/                 # CodeRabbit-style deep code review
    │   ├── SKILL.md                       # Review procedure and standardized finding format
    │   └── references/
    │       └── review-checklist.md        # 10-point inspection taxonomy
    └── ship-check/                        # Pre-release readiness inspection
        └── SKILL.md                       # 6-point pre-release verification & deploy freeze
```

---

## 2. Invocation Mechanism (Important Distinction)

> [!IMPORTANT]
> **Custom Slash Command Clarification**:
> Google Antigravity's chat UI has a fixed set of built-in slash commands (`/goal`, `/plan`, `/schedule`, `/grill-me`, `/learn`). Custom slash commands (such as `/ralph-loop` or `/coderabbit`) **cannot be dynamically registered into the client autocomplete registry**.
>
> Instead, Antigravity uses **Native Progressive Skill Discovery**:
> Antigravity automatically detects all skills inside `.agents/skills/` via their `SKILL.md` frontmatter descriptions. You invoke them simply by mentioning their name or intent in natural language, or by combining them with native slash commands.

### How to Invoke Each Workflow

| Workflow | Direct Natural Prompt | Combination with Native `/goal` |
| :--- | :--- | :--- |
| **Ralph Loop** | `Use the ralph-loop skill to fix test_auth.py with max 4 iterations.` | `/goal Execute ralph-loop to fix all failing backend unit tests.` |
| **GSD Workflow** | `Run gsd-workflow to implement document export to Markdown.` | `/goal Run gsd-workflow to deliver the user profile editing feature.` |
| **CodeRabbit Review** | `Run coderabbit-review on the current git diff.` | `/goal Run coderabbit-review on all modified files in frontend/src.` |
| **Ship-Check** | `Run ship-check before pushing release.` | `/goal Run ship-check to verify release readiness.` |

---

## 3. Workflow Details & Guides

### Workflow 1: Ralph Loop (`ralph-loop`)
* **Purpose**: Iterative, test-driven development loop (Plan → Edit → Test → Diagnose → Repeat).
* **Configurable Iterations**: Set `iterations: N` (default: 5 iterations).
* **Safety Protocols**:
  * The agent will **never claim tests passed** without actually running them via `run_command` and getting return code `0`.
  * The agent will **stop immediately** if progress is blocked, a destructive action is required, or the iteration limit is reached.
  * Preserves uncommitted work and inspects `git status` first.

### Workflow 2: GSD (`gsd-workflow`)
* **Purpose**: Structured project execution for complex features.
* **Process**:
  1. Inspects repository architecture and existing conventions.
  2. Breaks feature into small, atomic, independently verifiable tasks.
  3. Creates a tracking plan in `.agents/plans/<feature-slug>-plan.md`.
  4. Implements and verifies tasks sequentially.
  5. Updates documentation and outputs an executive summary.

### Workflow 3: CodeRabbit Review (`coderabbit-review`)
* **Purpose**: Automated, multi-category code audit for security, bugs, and performance.
* **10 Categories**:
  1. Bugs & logical errors
  2. Security vulnerabilities (OWASP, injection, SSRF, XSS)
  3. Authentication & Authorization
  4. Input validation & Error handling
  5. Secret & API key exposure
  6. Database access & Data integrity
  7. Performance & Scalability (N+1 queries, memory)
  8. Race conditions & Async behavior
  9. Regression risks & Missing tests
  10. Maintainability & Code quality
* **Zero False Positives**: Differentiates *Confirmed Vulnerabilities* from *Potential Risks*. Never invents issues.

---

## 4. How to Review Code Before Committing

To perform a pre-commit audit:
1. Ensure your changes are saved in the working tree or staged:
   ```powershell
   git status
   ```
2. In the Antigravity chat, prompt:
   ```text
   Run coderabbit-review on git diff
   ```
3. The agent will inspect your unstaged and staged changes, produce inline findings with exact severity, location links, problem explanations, realistic failure scenarios, and diff-based code fixes.

---

## 5. How to Resume an Interrupted Task

If a long task or GSD workflow is paused or interrupted:
1. Locate the feature plan file in [`.agents/plans/`](file:///d:/Research%20Mind%20Ai%202.0/.agents/plans/).
2. In the chat, prompt:
   ```text
   Resume gsd-workflow from .agents/plans/<feature-slug>-plan.md
   ```
3. The agent will read the plan file, check completed items `[x]`, verify git status, and resume execution starting from the first incomplete `[ ]` or in-progress `[/]` task.

---

## 6. Commands Requiring Explicit User Approval

For repository safety, the agent will **pause and ask for explicit approval** before executing:
1. **Destructive Git Actions**: `git reset --hard`, `git clean -fd`, `git checkout -- .`, or branch deletions.
2. **Database Modifications**: Resetting database files (`*.db`), wiping `auth_store.json`, or running destructive database schema migrations.
3. **Data Deletion**: Removing user uploads in `uploads/` or `backend/uploads/`.
4. **Production Deployments & Configs**: Running `aws/deploy.sh`, modifying `docker-compose.prod.yml`, or applying Kubernetes manifests in `k8s/`.
5. **Git Push**: Pushing commits to remote branches (especially `main` or `master`).
