---
name: arcus-controller
description: >
  ARCUS controller meta-skill. The single orchestrator that drives a story from spec to pull
  request, in either INTERACTIVE (gated, default) or AUTONOMOUS (afk) mode. It is state-driven:
  it reads the session checkpoint and runs every remaining stage in the same canonical order.
  In autonomous mode it runs stages back-to-back as one-shot subagents with no gates, auto-deciding
  and emitting milestone-only output. In interactive mode it runs dialogue stages in the main thread
  and emits a handoff gate after each major phase group, waiting for the user before continuing.
  Activates on "implement <STORY>" (default) and "plan <STORY>" → interactive; "forge <STORY>",
  "afk <STORY>", or "run afk on <STORY>" → autonomous; "resume <STORY>" → continue from the first
  incomplete stage in whatever mode the checkpoint persists.
layer: orchestrator
standalone: false
argument-hint: <STORY>
---

# ARCUS Controller (Orchestrator Meta-Skill)

This skill is the **single orchestrator** that drives a story from spec to pull request. It runs the
**same canonical stage sequence** in both modes; only the *invocation style* and the *gating* differ:

- **interactive** (gated, default): dialogue stages run **in the main thread**, and the controller
  emits a **handoff gate** after each major phase group (Brainstorm, Test Plan, Implementation, Code
  Review, Closure), waiting for the user's "yes"/"proceed" before continuing. Every interview
  question carries a single Recommended option + rationale + custom-answer.
- **autonomous** (afk): every remaining stage runs **back-to-back with no handoff gates**,
  auto-deciding at each step, emitting **milestone-only** output, as one-shot subagents.

Interactive mode is handled **by this controller itself**, delegating the brainstorm context-pack +
spec-finalize steps to the `arcus:kick-off` coordinator.

## Mode

The controller runs in one of two modes, chosen by the activation trigger and then **persisted on
the checkpoint**:

| Mode | Trigger | Checkpoint value | Behavior |
|------|---------|------------------|----------|
| **interactive** | "implement <STORY>" (default), "plan <STORY>" | `gated` | Dialogue stages in main thread; handoff gate after each major phase group; Recommended-option interviews. |
| **autonomous** | "forge <STORY>", "afk <STORY>", "run afk on <STORY>", "implement <STORY>.md --afk" | `afk` | One-shot subagents; no gates; auto-decide; milestone-only output. |

> **Mapping note**: `checkpoint.sh set-mode` accepts `gated|afk` today. Treat **interactive ↔ gated**
> and **autonomous ↔ afk**. The controller persists the checkpoint value and reads it back as the mode.

## Activation

Activate on either an interactive or an autonomous trigger; the trigger fixes the mode:

| User says | Mode | Action |
|-----------|------|--------|
| "implement <STORY>" (default), "plan <STORY>" | interactive | Begin the pipeline at Stage 0 (or resume from the checkpoint), running dialogue stages in the main thread and emitting a handoff gate after each major phase group. |
| "forge <STORY>", "run afk on <STORY>", "afk <STORY>", "implement <STORY>.md --afk" | autonomous | Begin the pipeline at Stage 0 (or resume from the checkpoint) and run every remaining stage with no gates. |
| "resume <STORY>" | persisted | Continue from the first incomplete stage in whatever mode the checkpoint already persists (does not change the mode). |

Do **not** activate on per-stage phrases ("brainstorm/generate tests/review/close <STORY>") or on
bare "yes"/"proceed"/"continue" continuations outside of an active interactive run — those route to
the individual stage skills (`arcus:kick-off`, etc.).

If `<STORY>` is omitted and exactly one in-progress story exists under `.arcus/specs/`, use it;
otherwise ask which story.

## Key Principles

- **Mode-driven gating**: in **autonomous** mode, run the whole pipeline in one shot — never stop at
  a gate, never ask the user to confirm a handoff, never conduct an interview; auto-decide
  everything. In **interactive** mode, run dialogue stages in the main thread and **stop at a handoff
  gate after each major phase group**, waiting for the user's "yes"/"proceed".
- **Dispatch style by mode**: in autonomous mode, generation-heavy stages are dispatched to fresh
  subagents with scoped context, in **one-shot** (non-interview) mode. In interactive mode, the
  stages that need user dialogue (spec-finalizer, implementation-planner) run **in the main thread in
  dialogue mode** so they can interview the user; non-dialogue stages may still be dispatched as
  subagents. Either way the controller stays lean: dispatch/run, verify output, update state, advance.
- **State is the source of truth**: always read `session-checkpoint.json` first. The next action is
  a pure function of the checkpoint, not of conversation memory. On resume, read the persisted `mode`
  from the checkpoint and do not re-infer it.
- **Deterministic ops via scripts**: use helper scripts for git and state. Never reason about branch
  names, commit messages, or checkpoint JSON by hand.
- **Deferred branch**: Stage 0 scaffolds the workspace and records the *planned* branch only — the
  git branch is **not** created until the Implementation stage.
- **DRY delegation**: the Implementation stage is **not** re-implemented here; it is delegated to the
  `arcus:implementation-runner` skill (the single canonical loop driver).
- **Resumable across sessions**: the pipeline can be re-entered with the same `forge`/`afk` phrase;
  it picks up from the first incomplete stage in the checkpoint.

## Output Discipline

In **autonomous** mode, emit milestone lines only — no conversational filler ("Let me…", "Now I'll…",
"Perfect!"):

```
[AFK] Story: <STORY_ID>
[Brainstorm] Complete: <N> tasks, <M> decisions
[TestPlan] Complete: <N> test cases
[Code] Complete: <N> files changed, <M> tests passing
[Review] <verdict>: <C> critical, <W> warning, <S> suggestion
[Complete] PR deployed: <link>
```

In **interactive** mode, emit the same milestone line when a phase group completes, then a **handoff
gate** and stop until the user replies "yes"/"proceed":

```
[Handoff] <Phase group> complete → next: <next phase group>
Summary: <key counts / decisions>
Proceed? Reply "yes" to continue, or "no" to pause.
```

The handoff gate is emitted after each major phase group: **Brainstorm**, **Test Plan**,
**Implementation**, **Code Review**, **Closure**.

## Canonical Pipeline (Ordered Stage List)

This is the **single canonical enumeration** of the ARCUS pipeline. The stage sequence is **identical
in both modes** — only the dispatch style (one-shot subagent vs. main-thread dialogue) and the gating
differ. Each stage names its checkpoint key, the owning skill/script, and the dispatch mode the
controller uses per mode. Run them strictly in this order, skipping any whose checkpoint status is
already `complete`.

| # | Stage key(s) | Owner | Dispatch mode (autonomous / interactive) |
|---|--------------|-------|---------------|
| 1 | `scaffold` | `scaffold.sh` (deterministic script) | Run the script: create the `.arcus/specs/<STORY_ID>/` folder, copy `story.md`, init the checkpoint. **No git branch.** (both modes) |
| 2 | `context_pack` | `arcus:context-pack-builder` (via `arcus:kick-off`) | Delegated to `arcus:kick-off` (Brainstorm) |
| 3 | `spec_finalizer` | `arcus:spec-finalizer` (via `arcus:kick-off`) | Delegated to `arcus:kick-off`: **autonomous** → one-shot non-interview (auto-resolve); **interactive** → main-thread dialogue |
| 4 | `plan` | `arcus:implementation-planner` | **autonomous** → one-shot subagent, non-interview (auto-select highest-scoring approach); **interactive** → main-thread dialogue |
| 5 | `test_plan` | `arcus:test-spec-compiler` | One-shot subagent (both modes) |
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

Checkpoint stage keys (ordered): `scaffold` → `context_pack` → `spec_finalizer` → `plan`
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
3. **Resolve the mode** from the activation trigger: interactive → checkpoint value `gated`;
   autonomous → checkpoint value `afk`.
4. **Scaffold the workspace**: run `.arcus/bin/scaffold.sh <STORY_FILE> --mode <gated|afk>`. This
   creates `.arcus/specs/<STORY_ID>/`, copies `story.md`, and initializes the checkpoint with the
   **planned** `branch_name`/`base_branch` and the persisted `mode`. It creates **no git branch** —
   branch creation is deferred to the `branch` stage at the start of Implementation. Capture
   `STORY_ID` and the planned `BRANCH_NAME`/`BASE_BRANCH` from its output. (The mode is persisted
   here and **not re-inferred** on resume; if scaffold cannot set it, call
   `.arcus/bin/checkpoint.sh set-mode <STORY_ID> <gated|afk>`.)
5. **Mark scaffold complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> scaffold`.
6. **Output**: in autonomous mode emit `[AFK] Story: <STORY_ID>`; in interactive mode emit
   `Story: <STORY_ID> (interactive)`. Then flow into the Brainstorm stage.

### Brainstorm (delegated to `arcus:kick-off`, then implementation-planner)

The Brainstorm phase's **context-pack + spec-finalize** steps are delegated to the
`arcus:kick-off` coordinator (the controller still owns scaffold + checkpoint init in Stage 0).
`arcus:implementation-planner` remains a **separate** stage the controller runs **after** kick-off.

1. **Context pack + spec finalize** — read and follow `arcus:kick-off`, passing the `story`, the
   available `repo_context`, and the `mode`:
   - In **autonomous** mode, pass `mode: autonomous` — kick-off runs context-pack-builder and
     spec-finalizer one-shot, non-interview (auto-resolve every ambiguity).
   - In **interactive** mode, pass `mode: dialogue` — kick-off runs **in the main thread**, with
     spec-finalizer interviewing the user one question at a time (each question carrying exactly one
     **Recommended** option + one-line rationale + an explicit custom-answer option).
   - kick-off produces a `context_pack` and a `spec_grounding`. The controller resolves these to the
     workspace files `.arcus/specs/<STORY_ID>/context-pack.md` and
     `.arcus/specs/<STORY_ID>/grounded-spec.md`. Verify both exist, then:
     `.arcus/bin/checkpoint.sh complete <STORY_ID> context_pack` and
     `.arcus/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`.
2. **Create implementation plan** — this is a **separate stage**, run by the controller after
   kick-off returns (NOT inside kick-off):
   - **autonomous**: dispatch a one-shot, **non-interview** subagent.
     - **Prompt**: "Read and follow the `arcus:implementation-planner` skill. Story ID: `<STORY_ID>`. `mode=autonomous`. Write the plan to `.arcus/specs/<STORY_ID>/plan.md`."
     - **Description**: "Brainstorm: implementation-planner"
     - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - **interactive**: read and follow `arcus:implementation-planner` **in the main thread** with
     `mode=dialogue` (so it can interview the user), writing the plan to `.arcus/specs/<STORY_ID>/plan.md`.
   - Verify `plan.md` exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> plan`.
3. **Output / gate**:
   - **autonomous**: emit `[Brainstorm] Complete: <N> tasks, <M> decisions` (N = `### Task` headings
     in `plan.md`; M = resolved decisions in `grounded-spec.md`) and continue without stopping.
   - **interactive**: emit the `[Handoff] Brainstorm complete → next: Test Plan` gate and **stop**
     until the user replies "yes"/"proceed".

### Test Plan (one-shot)

1. **Compile test spec** — dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:test-spec-compiler` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/test-plan.md`."
   - **Description**: "TestPlan: test-spec-compiler"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> test_plan`.
2. **Output / gate**:
   - **autonomous**: emit `[TestPlan] Complete: <N> test cases` and continue without stopping.
   - **interactive**: emit the `[Handoff] Test Plan complete → next: Implementation` gate and **stop**
     until the user replies "yes"/"proceed".

### Implementation (delegated — branch + task loop)

Do **not** re-implement the per-task TDD loop, the branch realization, or the loopback here — they
are owned by the canonical loop driver. **Delegate** the whole Implementation stage:

1. **Read and follow the `arcus:implementation-runner` skill**, passing `STORY_ID` and the persisted
   `mode` (`afk` for autonomous, `gated` for interactive). That skill:
   - realizes the git branch via `branch.sh` and marks the `branch` stage complete (deferred-branch
     design — the branch did not exist before this point);
   - parses the `### Task N:` headings from `plan.md` and drives each task through the
     `arcus:subagent-task-dispatcher` protocol (per-task TDD + spec check + commit), marking each
     `task_<N>` complete;
   - in `afk` mode, runs to completion without stopping; in `gated` mode it honors its own per-task
     gating (the controller owns the phase-group gate after Implementation completes).
2. **Output / gate**:
   - **autonomous**: emit `[Code] Complete: <N> files changed, <M> tests passing` and continue into
     Code Review.
   - **interactive**: emit the `[Handoff] Implementation complete → next: Code Review` gate and
     **stop** until the user replies "yes"/"proceed".

### Code Review (one-shot, verdict)

1. **Run the review** — dispatch the review coordinator. This is the **last quality gate before the
   PR**: it runs a deterministic tooling gate (typecheck, full test suite, build/startup, secret
   scan, lint/format with autofix), then fans out to semantic reviewers.
   - **Prompt**: "Read and follow the `arcus:code-reviewer` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/review.md` and end your reply with `VERDICT: approved | changes_requested`."
   - **Description**: "Review: code-reviewer"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify `review.md` exists. Capture the verdict and counts (`critical`, `warning`, `suggestion`),
     then `.arcus/bin/checkpoint.sh complete <STORY_ID> code_review`.
2. **Decide on the verdict**:
   - **autonomous** (no gate, auto-decide):
     - **approved**: emit `[Review] approved: …` and continue to Context Sync.
     - **changes_requested**: emit `[Review] changes_requested: …` and run the **Loopback Protocol**
       automatically (bounded by the review-round cap), then re-review.
   - **interactive**:
     - **approved**: emit the `[Handoff] Code Review complete → next: Context Sync + Closure` gate and
       **stop** until the user replies "yes"/"proceed", then continue to Context Sync.
     - **changes_requested**: surface the findings and run the **Loopback Protocol** (bounded by the
       review-round cap), confirming with the user before re-entering Implementation; then re-review.

### Context Sync (one-shot, runs only after final approval)

Runs **only after** a final `approved` verdict — the diff is now stable and approved. Reconciles any
shared `.context/` artifact that the approved change set materially drifted.

1. **Run the drift sync** — dispatch a one-shot subagent:
   - **Prompt**: "Read and follow the `arcus:context-drift-sync` agent. Inputs: `sync_scope=branch`,
     `base_ref=`merge-base(HEAD, `<base_branch>`), `apply_mode=auto`, `commit_label=<STORY_ID>`."
   - **Description**: "Context Sync: context-drift-sync"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Then `.arcus/bin/checkpoint.sh complete <STORY_ID> context_sync`.
2. **Output**: `[Context] <K artifacts updated, J skipped — or "no material drift">`. Continue to
   Closure (in interactive mode, this follows the Code Review handoff gate already confirmed above).

### Closure (one-shot + script, terminal)

1. **Build PR description** — dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:pull-request-builder` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/PR_DESCRIPTION.md`."
   - **Description**: "Closure: pull-request-builder"
   - **Model**: resolve complexity `light` via the `arcus:model-strategy` skill.
   - Verify the file exists.
2. **Create PR**: run `.arcus/bin/pr.sh <STORY_ID>`.
3. **Mark complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> closure`.
4. **Output**: `[Complete] PR deployed: <link from pr.sh output>`.

## Loopback Protocol (Code Review → Implementation)

On a `changes_requested` verdict, loop the findings back into Implementation. In **autonomous** mode
this runs **automatically** (no user prompt); in **interactive** mode the controller surfaces the
findings and confirms with the user before re-entering. Either way the loop is delegated to
`arcus:implementation-runner`, which owns the loopback mechanics:

1. **Re-enter `arcus:implementation-runner`** for the loopback. It runs
   `.arcus/bin/checkpoint.sh reopen <STORY_ID> code_review` (sets `needs_rework`, bumps
   `review_round`), converts each **critical** and **warning** finding in
   `.arcus/specs/<STORY_ID>/review.md` into a fix-task appended to `plan.md`, and runs the loop
   for the new fix-tasks only.
2. After the fix-tasks complete, **re-run Code Review** on the updated diff.
3. **Loopback cap**: stop auto-looping once `review_round` reaches **3**. Beyond that, stop and
   **report** the remaining findings instead of looping a 4th round.

## Resumption Protocol

When a checkpoint already exists:

1. Read it with `.arcus/bin/checkpoint.sh read <STORY_ID>`. Read the **persisted `mode`** from the
   checkpoint (`afk` → autonomous, `gated` → interactive) and use it; do **not** re-infer the mode
   from the resume phrase.
2. Determine the next action from stage status, in this order:
   `scaffold` → `context_pack` → `spec_finalizer` → `plan` → `test_plan` → `branch` →
   `task_1`..`task_N` → `code_review` → `context_sync` → `closure`.
   - Skip any stage whose status is `complete`.
   - Run the first stage that is `pending`, `in_progress`, or `needs_rework` (a `code_review` marked
     `needs_rework` means re-enter Implementation via `arcus:implementation-runner` on the fix-tasks,
     then re-review). In **autonomous** mode there are no `awaiting_handoff` gates to honor — if one
     is present, run that stage immediately. In **interactive** mode, an `awaiting_handoff` status
     means the prior phase group is gated awaiting the user's "yes"/"proceed" — on resume, treat that
     as the gate and continue from the next stage once confirmed.
3. Read the relevant existing artifacts (`context-pack.md`, `grounded-spec.md`, `plan.md`,
   `test-plan.md`, `review.md`) to restore context before running the resumed stage.

## Error Handling

- If a helper script fails (non-zero exit): retry once. If it still fails, output
  `[ERROR] <stage>: <reason>` and stop.
- If a stage's required output file is missing after its subagent returns: stop with
  `[ERROR] <stage>: <skill> produced no output`.
- Do NOT advance into the next stage if the current stage's required artifacts are missing.
