---
name: arcus-controller
description: >
  ARCUS autonomous (AFK) controller meta-skill. Drives a story from spec to pull
  request in ONE unattended run — no gates, no stops. It is state-driven: it reads
  the session checkpoint and runs every remaining stage back-to-back as one-shot
  subagents, auto-deciding at each step and emitting milestone-only output.
  Activates ONLY on autonomous phrases: "afk", "--afk", "forge", or
  "run afk on <STORY>". The gated, one-stage-at-a-time flow lives elsewhere
  (the per-stage skills + the `arcus:solution-architect` brainstorm coordinator) —
  this controller never runs gated.
argument-hint: <STORY>
disallowed-tools: AskUserQuestion
---

# ARCUS Controller (Autonomous / AFK Orchestrator Meta-Skill)

This skill orchestrates a story from spec to pull request **autonomously**: it runs every
remaining stage **back-to-back with no handoff gates**, auto-deciding at each step, and emits
**milestone-only** output. There is exactly one mode — **afk**. The gated, human-in-the-loop flow
(one stage per turn, Recommended-option interviews, "yes"/"proceed" continuations) is **not** part
of this controller; it lives in the per-stage skills and the `arcus:solution-architect` brainstorm
coordinator.

## Activation

Activate **only** on an autonomous trigger:

| User says | Action |
|-----------|--------|
| "forge <STORY>", "run afk on <STORY>", "afk <STORY>", "implement <STORY>.md --afk" | Begin the autonomous pipeline at Stage 0 (or resume from the checkpoint) and run every remaining stage with no gates. |

Do **not** activate on gated phrases ("implement/build/start <STORY>.md" without `--afk`,
per-stage phrases like "brainstorm/plan/generate tests/implement/review/close <STORY>", or
"yes"/"proceed"/"continue" handoff continuations) — those route to the gated stage skills and the
`arcus:solution-architect` coordinator, not here.

If `<STORY>` is omitted and exactly one in-progress story exists under `.arcus/specs/`, use it;
otherwise ask which story.

## Key Principles

- **Always autonomous**: run the whole pipeline in one shot. Never stop at a gate, never ask the
  user to confirm a handoff, never conduct an interview. Auto-decide everything.
- **One-shot subagents**: generation-heavy stages are dispatched to fresh subagents with scoped
  context, in **one-shot** (non-interview) mode. The controller stays lean: dispatch, verify
  output, update state, advance.
- **State is the source of truth**: always read `session-checkpoint.json` first. The next action is
  a pure function of the checkpoint, not of conversation memory. On resume, persist `mode = afk` and
  do not re-infer it.
- **Deterministic ops via scripts**: use helper scripts for git and state. Never reason about branch
  names, commit messages, or checkpoint JSON by hand.
- **Deferred branch**: Stage 0 scaffolds the workspace and records the *planned* branch only — the
  git branch is **not** created until the Implementation stage.
- **DRY delegation**: the Implementation stage is **not** re-implemented here; it is delegated to the
  `arcus:implementation-runner` skill (the single canonical loop driver).
- **Resumable across sessions**: the pipeline can be re-entered with the same `forge`/`afk` phrase;
  it picks up from the first incomplete stage in the checkpoint.

## Output Discipline

Milestone lines only — no conversational filler ("Let me…", "Now I'll…", "Perfect!"):

```
[AFK] Story: <STORY_ID>
[Brainstorm] Complete: <N> tasks, <M> decisions
[TestPlan] Complete: <N> test cases
[Code] Complete: <N> files changed, <M> tests passing
[Review] <verdict>: <C> critical, <W> warning, <S> suggestion
[Complete] PR deployed: <link>
```

## Canonical Pipeline (Ordered Stage List)

This is the **single canonical enumeration** of the ARCUS pipeline. Each stage names its checkpoint
key, the owning skill/script, and the dispatch mode the controller uses. Run them strictly in this
order, skipping any whose checkpoint status is already `complete`.

| # | Stage key(s) | Owner | Dispatch mode |
|---|--------------|-------|---------------|
| 1 | `scaffold` | `scaffold.sh` (deterministic script) | Run the script: create the `.arcus/specs/<STORY_ID>/` folder, copy `story.md`, init the checkpoint. **No git branch.** |
| 2 | `context_pack` | `arcus:context-pack-builder` | One-shot subagent |
| 3 | `spec_finalizer` | `arcus:spec-finalizer` | One-shot subagent, **non-interview** (auto-resolve every ambiguity) |
| 4 | `blueprint` | `arcus:implementation-planner` | One-shot subagent, **non-interview** (auto-select the highest-scoring approach) |
| 5 | `test_plan` | `arcus:test-spec-compiler` | One-shot subagent |
| 6 | `branch` | `branch.sh` (git branch CREATED here) | **Delegated** — realized at the start of Implementation by `arcus:implementation-runner` |
| 7 | `task_1`..`task_N` | `arcus:implementation-runner` | **Delegated** loop — do NOT inline the per-task loop |
| 8 | `code_review` | `arcus:code-reviewer` | One-shot subagent; verdict `approved \| changes_requested` |
| 9 | `context_sync` | `arcus:context-drift-sync` | One-shot subagent; runs **only after** `code_review` is `approved` (final diff) |
| 10 | `closure` | `arcus:pull-request-builder` + `pr.sh` | One-shot subagent, then run the script |

Stages 6 and 7 are both owned by `arcus:implementation-runner`: a single delegation realizes the
branch (`branch.sh`) and then drives the task loop. The controller does not split them.

Stage 9 (`context_sync`) runs **only after a final `approved` verdict** — when Code Review loops back
(`changes_requested`), it re-enters Implementation; `context_sync` runs once, after the diff is
stable and approved, and reconciles any `.context/` drift before Closure.

## Helper Scripts

Call these via shell for deterministic operations. The session bootstrap hook stages them into the
active workspace at `.arcus/bin/`. Resolve the script directory in this order and use the **first
that exists**: `.arcus/bin/` (preferred, staged by the plugin) → `$ARCUS_HOME/scripts/` (read
`ARCUS_HOME` from `.arcus/env`).

| Script | Usage | Purpose |
|--------|-------|---------|
| `.arcus/bin/extract_story_id.sh <story.md>` | Outputs `STORY_ID: xxx` | Extract story identifier |
| `.arcus/bin/scaffold.sh <story.md> [--mode afk]` | Creates folder + `story.md` + inits checkpoint | Workspace scaffold; records the **planned** branch, creates **no** git branch |
| `.arcus/bin/branch.sh <story-id>` | Creates the git branch from the planned name | Deferred branch realization (called by `implementation-runner`, not by Stage 0) |
| `.arcus/bin/commit.sh <story-id> <message>` | Stages + commits | Conventional commit |
| `.arcus/bin/pr.sh <story-id>` | Push + create PR | Closure |
| `.arcus/bin/checkpoint.sh <action> <story-id> [args]` | Manage state | init / read / complete / set-status / reopen / set-mode / **set-branch** |

Checkpoint stage keys (ordered): `scaffold` → `context_pack` → `spec_finalizer` → `blueprint`
→ `test_plan` → `branch` → `task_1`..`task_N` → `code_review` → `context_sync` → `closure`.
Stage status values: `pending | in_progress | awaiting_handoff | complete | needs_rework`.

The `set-branch` action records a bumped/realized branch name onto the checkpoint; `branch.sh`
calls it itself when a collision forces a name change.

## Execution Pipeline

### Stage 0: Scaffold (deterministic, no gate, no branch)

1. **Extract Story ID**: run `.arcus/bin/extract_story_id.sh <STORY_FILE>` and capture `STORY_ID`.
   If the script is missing, derive the ID from the filename (strip path and `.md`).
2. **Check checkpoint**: run `.arcus/bin/checkpoint.sh read <STORY_ID>`. If it already exists, jump
   to the **Resumption Protocol** instead of re-scaffolding.
3. **Scaffold the workspace**: run `.arcus/bin/scaffold.sh <STORY_FILE> --mode afk`. This creates
   `.arcus/specs/<STORY_ID>/`, copies `story.md`, and initializes the checkpoint with the **planned**
   `branch_name`/`base_branch` and `mode = afk`. It creates **no git branch** — branch creation is
   deferred to the `branch` stage at the start of Implementation. Capture `STORY_ID` and the planned
   `BRANCH_NAME`/`BASE_BRANCH` from its output.
4. **Mark scaffold complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> scaffold`.
5. **Output**: `[AFK] Story: <STORY_ID>`. Then flow directly into the Brainstorm stage.

### Brainstorm (one-shot, non-interview)

1. **Build context pack** — dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:context-pack-builder` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/context-pack.md`."
   - **Description**: "Brainstorm: context-pack-builder"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> context_pack`.
2. **Finalize spec** — dispatch a one-shot, **non-interview** subagent (no dialogue, no
   Recommended-option interview — that is gated-only):
   - **Prompt**: "Read and follow the `arcus:spec-finalizer` skill in one-shot mode. Story ID: `<STORY_ID>`. Auto-resolve every ambiguity (no questions) and write spec-finalizer's owned sections of `.arcus/specs/<STORY_ID>/plan.md`. Do NOT produce `blueprint.md` — that is the implementation-planner's job."
   - **Description**: "Brainstorm: spec-finalizer"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify `plan.md` exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`.
3. **Create implementation plan** — dispatch a one-shot, **non-interview** subagent (auto-select the
   highest-scoring approach — no design interview):
   - **Prompt**: "Read and follow the `arcus:implementation-planner` skill in one-shot mode. Story ID: `<STORY_ID>`. Generate and score candidate approaches, auto-select the highest-scoring one (no questions), append the design sections to `.arcus/specs/<STORY_ID>/plan.md`, and write `.arcus/specs/<STORY_ID>/blueprint.md`."
   - **Description**: "Brainstorm: implementation-planner"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify `blueprint.md` exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> blueprint`.
4. **Output**: `[Brainstorm] Complete: <N> tasks, <M> decisions` (N = `### Task` headings in
   `blueprint.md`; M = resolved decisions in `plan.md`). Continue without stopping.

### Test Plan (one-shot)

1. **Compile test spec** — dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:test-spec-compiler` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/test-plan.md`."
   - **Description**: "TestPlan: test-spec-compiler"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> test_plan`.
2. **Output**: `[TestPlan] Complete: <N> test cases`. Continue without stopping.

### Implementation (delegated — branch + task loop)

Do **not** re-implement the per-task TDD loop, the branch realization, or the loopback here — they
are owned by the canonical loop driver. **Delegate** the whole Implementation stage:

1. **Read and follow the `arcus:implementation-runner` skill**, passing `STORY_ID` and the persisted
   `mode = afk`. That skill:
   - realizes the git branch via `branch.sh` and marks the `branch` stage complete (deferred-branch
     design — the branch did not exist before this point);
   - parses the `### Task N:` headings from `blueprint.md` and drives each task through the
     `arcus:subagent-task-dispatcher` protocol (per-task TDD + spec check + commit), marking each
     `task_<N>` complete;
   - in afk mode, runs to completion without stopping (the controller owns the gate, and there is no
     gate in afk).
2. **Output**: `[Code] Complete: <N> files changed, <M> tests passing`. Continue into Code Review.

### Code Review (one-shot, verdict)

1. **Run the review** — dispatch the review coordinator. This is the **last quality gate before the
   PR**: it runs a deterministic tooling gate (typecheck, full test suite, build/startup, secret
   scan, lint/format with autofix), then fans out to semantic reviewers.
   - **Prompt**: "Read and follow the `arcus:code-reviewer` skill. Story ID: `<STORY_ID>`. Run the deterministic gate, then review the full branch diff against base. Produce `.arcus/specs/<STORY_ID>/review.md` and end your reply with `VERDICT: approved | changes_requested`."
   - **Description**: "Review: code-reviewer"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify `review.md` exists. Capture the verdict and counts (`critical`, `warning`, `suggestion`),
     then `.arcus/bin/checkpoint.sh complete <STORY_ID> code_review`.
2. **Auto-decide on the verdict** (no gate):
   - **approved**: emit `[Review] approved: …` and continue to Context Sync.
   - **changes_requested**: emit `[Review] changes_requested: …` and run the **Loopback Protocol**
     automatically (bounded by the review-round cap), then re-review.

### Context Sync (one-shot, runs only after final approval)

Runs **only after** a final `approved` verdict — the diff is now stable and approved. Reconciles any
shared `.context/` artifact that the approved change set materially drifted.

1. **Run the drift sync** — dispatch a one-shot subagent:
   - **Prompt**: "Read and follow the `arcus:context-drift-sync` skill in one-shot (afk) mode. Story ID: `<STORY_ID>`. Run the strict FACTS-ONLY drift check over `.context/**`, surgically sync only the materially-drifted artifacts (refresh their context-meta and update `AGENTS.md` only if a flow file was added/removed), and commit via `commit.sh` with the structured `Updated:`/`Skipped:` body. On no material drift, make no commit."
   - **Description**: "Context Sync: context-drift-sync"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Then `.arcus/bin/checkpoint.sh complete <STORY_ID> context_sync`.
2. **Output**: `[Context] <K artifacts updated, J skipped — or "no material drift">`. Continue to Closure.

### Closure (one-shot + script, terminal)

1. **Build PR description** — dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:pull-request-builder` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/PR_DESCRIPTION.md`."
   - **Description**: "Closure: pull-request-builder"
   - **Model**: resolve complexity `light` via the `arcus:model-strategy` skill.
   - Verify the file exists.
2. **Create PR**: run `.arcus/bin/pr.sh <STORY_ID>`.
3. **Mark complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> closure`.
4. **Output**: `[Complete] PR deployed: <link from pr.sh output>`.

## Loopback Protocol (Code Review → Implementation, automatic)

On a `changes_requested` verdict, loop the findings back into Implementation **automatically** (no
user prompt). The loop is delegated to `arcus:implementation-runner`, which owns the loopback
mechanics:

1. **Re-enter `arcus:implementation-runner`** for the loopback. It runs
   `.arcus/bin/checkpoint.sh reopen <STORY_ID> code_review` (sets `needs_rework`, bumps
   `review_round`), converts each **critical** and **warning** finding in
   `.arcus/specs/<STORY_ID>/review.md` into a fix-task appended to `blueprint.md`, and runs the loop
   for the new fix-tasks only.
2. After the fix-tasks complete, **re-run Code Review** on the updated diff.
3. **Loopback cap**: stop auto-looping once `review_round` reaches **3**. Beyond that, stop and
   **report** the remaining findings instead of looping a 4th round.

## Resumption Protocol

When a checkpoint already exists:

1. Read it with `.arcus/bin/checkpoint.sh read <STORY_ID>`. Persist `mode = afk` (this controller is
   afk-only); do not re-infer the mode.
2. Determine the next action from stage status, in this order:
   `scaffold` → `context_pack` → `spec_finalizer` → `blueprint` → `test_plan` → `branch` →
   `task_1`..`task_N` → `code_review` → `context_sync` → `closure`.
   - Skip any stage whose status is `complete`.
   - Run the first stage that is `pending`, `in_progress`, or `needs_rework` (a `code_review` marked
     `needs_rework` means re-enter Implementation via `arcus:implementation-runner` on the fix-tasks,
     then re-review). There are no `awaiting_handoff` gates to honor in afk — if one is present from a
     prior gated run, run that stage immediately.
3. Read the relevant existing artifacts (`context-pack.md`, `plan.md`, `blueprint.md`,
   `test-plan.md`, `review.md`) to restore context before running the resumed stage.

## Error Handling

- If a helper script fails (non-zero exit): retry once. If it still fails, output
  `[ERROR] <stage>: <reason>` and stop.
- If a stage's required output file is missing after its subagent returns: stop with
  `[ERROR] <stage>: <skill> produced no output`.
- Do NOT advance into the next stage if the current stage's required artifacts are missing.
