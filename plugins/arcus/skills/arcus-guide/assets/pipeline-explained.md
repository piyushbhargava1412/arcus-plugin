# 🔄 Pipeline Overview

Understanding ARCUS's Spec → Code → PR workflow

---

## The Pipeline at a Glance

ARCUS runs an ordered list of stages. The keys (in order) are:

```
scaffold → context_pack → spec_finalizer → blueprint → test_plan
        → branch → task_1..N → code_review → closure
```

```mermaid
graph TD
    Scaffold[scaffold<br/>Folder + Checkpoint] --> ContextPack[context_pack<br/>Story-specific context]
    ContextPack --> SpecFinalizer[spec_finalizer<br/>Resolve ambiguities → plan.md]
    SpecFinalizer --> Blueprint[blueprint<br/>Atomic task list]
    Blueprint --> TestPlan[test_plan<br/>Design test matrix]
    TestPlan --> Branch[branch<br/>Create git branch NOW]
    Branch --> Tasks[task_1..N<br/>Implement & verify each task]
    Tasks --> CodeReview[code_review<br/>Holistic quality gate]
    CodeReview -->|approved| Closure[closure<br/>Create PR]
    CodeReview -.->|changes_requested<br/>max 3 rounds| Tasks

    style Scaffold fill:#e1f5ff
    style ContextPack fill:#e1f5ff
    style SpecFinalizer fill:#fff4e1
    style Blueprint fill:#fff4e1
    style TestPlan fill:#f0e1ff
    style Branch fill:#e8e8ff
    style Tasks fill:#e1ffe8
    style CodeReview fill:#ffe1f0
    style Closure fill:#fff9e1
```

> **Heads up — the branch is created late.** `scaffold` records the *planned* branch
> name in the checkpoint but does **not** create any git branch. The real git branch is
> created at the **start of Implementation** by the `branch` stage. See
> ["Deferred branch creation"](#deferred-branch-creation) below.

---

## Two Experiences: Gated vs AFK

ARCUS ships **two ways to drive the same pipeline**:

- **Gated (default, user-driven)** — a chain of self-handing-off skills. You stay in
  control, reviewing each stage's output and saying "yes"/"proceed" to advance. Entry
  point is the **`solution-architect`** skill (triggers on `solution-architect <STORY>`
  or `plan <STORY>`). There is **no router** and **no shared pipeline file** — each stage
  skill embeds a **Handoff Protocol** that names only its immediate successor.

- **AFK (autonomous)** — the **`arcus-controller`** skill runs the entire pipeline
  unattended. It activates only on AFK phrases (`afk`, `--afk`, `forge`,
  `run afk on <STORY>`), runs every stage as a one-shot subagent with milestone output,
  and its body holds the single canonical ordered stage list.

See **"gated or afk?"** for guidance on choosing.

---

## Stage Breakdown

### scaffold 🔧

**Purpose:** Create the story workspace and pipeline state — *without* creating a branch.

**What happens:**
- `scaffold.sh` creates `.arcus/specs/[STORY-ID]/`
- Copies the story file into the workspace as `story.md`
- Initializes `session-checkpoint.json`, **recording the planned `branch_name` and
  `base_branch`** for later
- Creates **no git branch** (deferred to the `branch` stage)

**Driven by:**
- Gated: `solution-architect` (main thread) calls `scaffold.sh`
- AFK: `arcus-controller` runs scaffold as its first stage

**Artifacts created:**
- `.arcus/specs/[STORY-ID]/story.md` (copy of original)
- `.arcus/session-checkpoint.json` (state tracking, with planned branch info)

**Duration:** < 1 minute (deterministic)

---

### context_pack 📚

**Purpose:** Build a minimal, story-specific context bundle from the shared `.context/`
snapshot.

**Skills invoked:**
- `context-pack-builder`

**Artifacts created:**
- `context-pack.md` — relevant flows, likely working areas, related patterns

**Duration:** 1-3 minutes

---

### spec_finalizer 💡

**Purpose:** Resolve ambiguities and document technical decisions before planning.

**What happens:**
- Analyzes the story for completeness and identifies ambiguous requirements
- **Gated mode:** interactive dialogue. **Every interview question is presented with
  exactly one option marked Recommended (with a one-line rationale) plus a custom-answer
  option** — so you can accept the recommendation fast or steer.
- **AFK mode:** auto-resolves ambiguities one-shot, grounded in repo patterns
- Consolidates all planning deliberation into a single **`plan.md`**

**Skills invoked:**
- `spec-finalizer`

**Artifacts created:**
- `plan.md` — consolidated planning deliberation (technical decisions, constraints,
  error handling, and — in gated mode — the recorded Q&A). *This single file replaces the
  two separate planning files used by earlier versions of ARCUS.*

**💡 Tip:** This is your chance to course-correct before implementation. Review `plan.md`
carefully!

---

### blueprint 🗂️

**Purpose:** Decompose the story into atomic implementation tasks.

**What happens:**
- Acts as a Tech Lead: designs the technical approach and breaks the story into
  atomic tasks with a Definition of Done
- **Gated mode:** the `implementation-planner` runs the same recommendation-first
  interview style — every question carries one **Recommended** option + rationale and a
  custom-answer option
- Writes the **machine-parsed task list** to `blueprint.md`

**Skills invoked:**
- `implementation-planner`

**Artifacts created:**
- `blueprint.md` — atomic task list with IDs, complexity, affected files, Definition of Done

---

### test_plan 🧪

**Purpose:** Design a comprehensive test matrix before writing code (TDD).

**What happens:**
- Reviews `blueprint.md` and `plan.md`
- Designs test cases across **Functional / Edge Case / Error Handling**
- Maps each test to a blueprint task ID
- Follows patterns from `.context/testing-patterns.md`

**Skills invoked:**
- `test-spec-compiler`

**Artifacts created:**
- `test-plan.md` — test matrix

**💡 Tip:** Add missing test cases to `test-plan.md` before proceeding.

---

### branch 🌿

**Purpose:** Create the git feature branch — *now*, at the start of Implementation.

**What happens:**
- `branch.sh` (driven by the `implementation-runner` skill) creates the git branch
  `arcus/[STORY-ID]` using the name planned during `scaffold`
- **Bumps on collision** if a branch with that name already exists
- If the final name differs from the planned name, calls
  `checkpoint.sh set-branch` to record the actual name

**Driven by:**
- `implementation-runner` (used by both gated and AFK)

**Why deferred?** Planning never touches git. The branch is only created once you commit
to writing code, keeping aborted/abandoned plans from littering your branch list.

---

### task_1..N ⚙️ (Implementation)

**Purpose:** Implement the story task-by-task with continuous verification.

**What happens:**
- The `implementation-runner` drives the per-task loop (the same loop is reused by
  gated and AFK)
- Each task is dispatched to an isolated subagent with scoped context
- Each task includes implementation, test writing (following `test-plan.md`), and one
  lightweight, **advisory** per-task spec-compliance check (does not hard-block;
  unresolved issues carry forward to Code Review)
- Commits incrementally (one commit per task) and runs tests after each task

> **Note:** Quality is *not* reviewed per-task. Code quality is owned holistically by the
> `code_review` stage over the whole branch diff — reviewing it per-task is redundant
> because isolated subagents never see prior tasks' code.

**Skills invoked:**
- `implementation-runner` (loop driver)
- `subagent-task-dispatcher` (per-task dispatch protocol)
- `spec-compliance-reviewer` (per-task mode, advisory)

**Artifacts created:**
- Code changes + tests (committed to the branch)

---

### code_review 🔍

**Purpose:** The real last gate before a PR. Runs over the **full branch diff** in two
tiers, with a zero-trust persona — brutal in the hunt (assume the code is guilty, verify
every claim by reading source and running tools), fair in the verdict (only genuine,
concrete problems block).

**What happens:**

**Tier 1 — Deterministic Gate (runs the repo's real tooling, fails fast):**
- Executes the actual commands CI would run over the integrated branch — never simulated
  by eyeballing the diff. Resolved from CI workflows first, then `.context/` tables.
  - **Typecheck / compile**
  - **Full test suite** (per-task green ≠ whole-branch green)
  - **Build + startup smoke**
  - **Secret scan**
  - **Lint & format** (auto-fixed and committed where a fix mode exists)
  - **Static analysis** (findings feed the semantic tier)
- Any hard block (typecheck / tests / build / secret) → skips the semantic fan-out and
  returns `changes_requested` immediately. Unresolvable commands are honestly recorded as
  `skipped: not configured`.

**Tier 2 — Semantic Review (only if the gate passes):**
- Fans out to specialist reviewers for judgment-grade concerns no tool can answer:
  - **Spec compliance** (holistic): Does it meet all requirements?
  - **Code quality** (holistic): Clean structure, maintainability, **cognitive
    complexity**, and **test proportionality** (over-engineered/slow tests that bloat the
    build)?
  - **Security**: Any exploitable vulnerabilities?
  - **Performance**: Any concrete regressions?
- Consolidates findings, deduplicates, filters noise, assigns severity:
  - **critical** — Blocks merge (outage, data loss, security breach)
  - **warning** — Concrete issue (performance hit, maintainability concern)
  - **suggestion** — Minor nit (non-blocking)
- Returns verdict: `approved` or `changes_requested`

**Skills invoked:**
- `code-reviewer` (coordinator)
- `spec-compliance-reviewer` (holistic mode)
- `code-quality-reviewer` (holistic mode)
- `security-reviewer`
- `performance-reviewer`

**Artifacts created:**
- `review.md` — Deterministic gate results (pass/fail/skipped per check) + consolidated
  semantic findings with verdict

**💡 Tip:** If you disagree with the semantic findings, you can proceed anyway (override
verdict). Tier 1 (deterministic) failures are objective and can't be overridden by
judgment.

---

### closure 🎯

**Purpose:** Create the pull request with evidence and context.

**What happens:**
- Runs the final test suite, gathers evidence of completion
- Synthesizes the PR description from: original story, `plan.md`, `blueprint.md`, test
  results, and review findings
- Creates the pull request (if `gh` CLI configured)

**Skills invoked:**
- `pull-request-builder`

**Artifacts created:**
- `PR_DESCRIPTION.md` — Final PR body

**Terminal stage:** PR created or ready for manual creation.

---

## Review Loopback Mechanism

If `code_review` returns `changes_requested`:

1. **Fix-tasks generated** from review findings
2. **Loop back into the task loop** (Implementation)
3. **Subagents address issues** following the fix-tasks
4. **Return to `code_review`** for re-review
5. **Bounded to 3 rounds maximum** to prevent infinite loops
6. **Manual intervention** required if the 3rd round still fails

**Why bounded?** Prevents loops on subjective or unclear issues. After 3 rounds, human
judgment is needed.

---

## Gated vs AFK Behavior

| Aspect | Gated (self-handoff chain) | AFK (`arcus-controller`) |
|--------|----------------------------|--------------------------|
| **Driver** | `solution-architect` entry; each stage skill hands off to its successor | `arcus-controller` runs every stage one-shot |
| **Gates** | Pauses between stages for your "yes"/"proceed" | Auto-confirms; runs back-to-back |
| **spec_finalizer** | Recommendation-first dialogue (one question at a time) | One-shot auto-resolution |
| **Resume** | Cold resume = the next stage's explicit phrase + the checkpoint | Intended to run uninterrupted |
| **Output** | Full progress updates | Milestone-only output |

> The **`arcus-controller`** drives **AFK only**. It does *not* drive gated mode — gated is
> the self-handoff chain entered via `solution-architect`.

---

## Gated Resume Phrases

In gated mode, each stage's Handoff Protocol tells you the exact phrase to resume the next
stage in a fresh session. Examples:

| To run / resume… | Say |
|------------------|-----|
| Planning (entry) | `solution-architect <STORY>` (or `plan <STORY>`) |
| Test plan | `generate test plan for <STORY>` |
| Implementation | `implement <STORY>` |
| Code review | `review <STORY>` |
| Closure (PR) | `create pull request for <STORY>` |

Within the same session, a simple `yes` / `proceed` loads the next stage directly.

---

## What's Next?

- **Understand modes:** Ask "gated or afk?"
- **See all commands:** Ask "command reference"
- **Check artifacts:** Ask "explain artifacts"
- **Get help:** Ask "troubleshooting"
