---
name: arcus-controller
description: >
  The single orchestrator that drives a story from spec to pull
  request, in either INTERACTIVE (gated, default) or AUTONOMOUS (afk) mode. It is state-driven:
  it reads the session checkpoint and runs every remaining stage in the same canonical order.
  In autonomous mode it runs stages back-to-back with no gates, auto-deciding and emitting
  milestone-only output. In interactive mode it emits a handoff gate after each major phase group,
  waiting for the user before continuing.
  Activates on "implement <STORY>" (default) and "plan <STORY>" → interactive; "forge <STORY>",
  "afk <STORY>", or "run afk on <STORY>" → autonomous; "resume <STORY>" → continue from the first
  incomplete stage in whatever mode the checkpoint persists.
layer: orchestrator
standalone: false
argument-hint: <STORY>
---

# Overview

This skill is the **single orchestrator** that drives a story from spec to pull request. It runs the
**same canonical stage sequence** in both modes; only the *invocation style* and the *gating* differ:

- **interactive** (gated, default): the controller emits a **handoff gate** after each major phase
  group (Brainstorm, Test Plan, Implementation, Code Review, Closure), waiting for the user's
  "yes"/"proceed" before continuing. Every interview question carries a single Recommended option +
  rationale + custom-answer.
- **autonomous** (afk): stages run **back-to-back with no handoff gates**, auto-deciding at each step,
  emitting **milestone-only** output.

Execution is identical in both modes: the controller **spawns capabilities** and **runs
coordinators/orchestrators in-thread** (each stage states its own execution in the Execution
Pipeline below). A dialogue capability (spec-finalizer, implementation-planner) also runs in-thread
when interactive so it can interview the user.

## Activation

The activation trigger fixes the mode, which is then **persisted on the checkpoint** and read back on
resume (never re-inferred):

| User says | Mode | Checkpoint value | Action |
|-----------|------|------------------|--------|
| "implement <STORY>" (default), "plan <STORY>" | interactive | `gated` | Begin at Stage 0 (or resume from the checkpoint). |
| "forge <STORY>", "afk <STORY>", "run afk on <STORY>", "implement <STORY>.md --afk" | autonomous | `afk` | Begin at Stage 0 (or resume from the checkpoint). |
| "resume <STORY>" | persisted | — | Continue from the first incomplete stage in the checkpoint's mode (does not change the mode). |

> **Mapping note**: `checkpoint.sh set-mode` accepts `gated|afk` today — treat **interactive ↔ gated**
> and **autonomous ↔ afk**.

If `<STORY>` is omitted and exactly one in-progress story exists under `.arcus/specs/`, use it;
otherwise ask which story.

## Owned state

The controller owns the session checkpoint (stage keys enumerated in the Canonical Pipeline table)
and the planned/realized branch name. The next action is a pure function of the checkpoint — read it
first, never reason from conversation memory. The loopback auto-loop is capped at `review_round` 3
(see Loopback Protocol).

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

## Canonical Pipeline (checkpoint keys → phase groups)

The **single authoritative enumeration** of the checkpoint stage keys, in order, with the phase group
each rolls up to (gates and milestone output work at phase-group granularity) and its owner. The
sequence is identical in both modes; per-stage behavior is in the Execution Pipeline below. Run them
strictly in this order, skipping any whose checkpoint status is already `complete`.

| # | Stage key(s) | Phase group | Owner |
|---|--------------|-------------|-------|
| 1 | `scaffold` | Scaffold | `scaffold.sh` |
| 2 | `context_pack` | Brainstorm | `arcus:context-pack-builder` (via `arcus:kick-off`) |
| 3 | `spec_finalizer` | Brainstorm | `arcus:spec-finalizer` (via `arcus:kick-off`) |
| 4 | `plan` | Brainstorm | `arcus:implementation-planner` |
| 5 | `test_plan` | Test Plan | `arcus:test-spec-compiler` |
| 6 | `branch` | Implementation | `branch.sh` (via `arcus:implementation-runner`) |
| 7 | `task_1`..`task_N` | Implementation | `arcus:implementation-runner` |
| 8 | `code_review` | Code Review | `arcus:code-reviewer` |
| 9 | `context_sync` | Closure | `arcus:context-drift-sync` |
| 10 | `closure` | Closure | `arcus:pull-request-builder` + `pr.sh` |

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

Stage keys and their order are the Canonical Pipeline table above. Stage status values:
`pending | in_progress | awaiting_handoff | complete | needs_rework`.

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

1. **Context pack + spec finalize** — read and follow `arcus:kick-off` **in-thread** (it is a
   coordinator), passing the `story`, the available `repo_context`, and the `mode` (`autonomous` →
   non-interview; `dialogue` → the spec interview runs in this thread). It returns a `context_pack`
   and a `spec_grounding`, which the controller resolves to the workspace files
   `.arcus/specs/<STORY_ID>/context-pack.md` and `.arcus/specs/<STORY_ID>/grounded-spec.md`. Verify
   both exist, then: `.arcus/bin/checkpoint.sh complete <STORY_ID> context_pack` and
   `.arcus/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`.
2. **Create implementation plan**:
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

1. **Read and follow the `arcus:implementation-runner` skill** **in-thread**, passing `STORY_ID` and
   the persisted `mode` (`afk` for autonomous, `gated` for interactive).
2. **Output / gate**:
   - **autonomous**: emit `[Code] Complete: <N> files changed, <M> tests passing` and continue into
     Code Review.
   - **interactive**: emit the `[Handoff] Implementation complete → next: Code Review` gate and
     **stop** until the user replies "yes"/"proceed".

### Code Review (verdict)

1. **Run the review** — code-reviewer is a **coordinator**, so read and follow the
   `arcus:code-reviewer` skill **in-thread** (Story ID: `<STORY_ID>`, output
   `.arcus/specs/<STORY_ID>/review.md`). It writes `review.md` and returns
   `VERDICT: approved | changes_requested`.
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
findings and confirms with the user before re-entering. The loop itself is delegated to
`arcus:implementation-runner`:

1. **Re-enter `arcus:implementation-runner`** for the loopback (Story ID: `<STORY_ID>`), which turns
   the `changes_requested` findings into fix-tasks and runs them.
2. After the fix-tasks complete, **re-run Code Review** on the updated diff.
3. **Loopback cap**: stop auto-looping once `review_round` reaches **3**. Beyond that, stop and
   **report** the remaining findings instead of looping a 4th round.

## Resumption Protocol

When a checkpoint already exists:

1. Read it with `.arcus/bin/checkpoint.sh read <STORY_ID>`. Read the **persisted `mode`** from the
   checkpoint (`afk` → autonomous, `gated` → interactive) and use it; do **not** re-infer the mode
   from the resume phrase.
2. Determine the next action from stage status, walking the Canonical Pipeline order:
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
