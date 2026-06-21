---
name: implementation-runner
description: >
  The canonical ARCUS implementation loop. Creates the git branch at entry
  (deferred-branch design), parses the blueprint tasks, and drives each task
  through the subagent-task-dispatcher protocol with per-task TDD, spec-check,
  and commit. Reused by both the gated flow and the afk controller. Activates on
  "implement <STORY>" or "code <STORY>"; resumes after a changes_requested review
  via the loopback protocol.
metadata:
  version: "1.0.0"
  team: krill
  type:
    - orchestrator
    - protocol
---

# Implementation Runner (Gated Loop Driver)

## Overview

This skill is the **single, canonical implementation loop** for the ARCUS Implementation
stage. It is reused verbatim by **both** entry paths:

- the **gated flow** — the user types `"implement <STORY>"` / `"code <STORY>"`;
- the **afk controller** — which delegates the Implementation stage to this skill.

It realizes the git branch at entry (the **deferred-branch** design — the branch was only
*planned* at scaffold time, never created), then loops over the blueprint's `### Task N:`
headings, dispatching each task to a fresh subagent. On completion it hands off to **Code
Review** and stops.

> **Constraint — this skill MUST NOT declare `context: fork` or an `agent:` block.** It is an
> **interactive, stateful loop driver** that mutates checkpoint state, creates a git branch, and
> emits a handoff gate in the main thread. It is *not* a one-shot isolated worker. (The per-task
> isolation happens *inside* the loop, via the dispatcher's subagents — not by forking this skill.)

## Execution Modes

The caller decides the mode; this skill behaves identically either way except for the gate:

| Mode | Caller | Behaviour at completion |
|------|--------|-------------------------|
| **gated** (default) | User entry phrase `"implement <STORY>"` | Run the loop, then **STOP** at the Handoff gate (see Handoff Protocol). |
| **afk** | The afk arcus-controller delegates here | Run the loop, then continue without stopping — the controller owns the gate. |

Read the persisted `mode` from the checkpoint; do not re-infer it.

## Helper Scripts

Call these via shell for all deterministic git/state operations — never reason about branch names,
commit messages, or checkpoint JSON by hand. Resolve the script directory in this order and use the
**first that exists**: `.arcus/bin/` (preferred, staged by the plugin) → `$ARCUS_HOME/scripts/`
(read `ARCUS_HOME` from `.arcus/env`). This is the same resolution rule the `arcus:arcus-controller`
uses.

| Script | Usage | Purpose |
|--------|-------|---------|
| `branch.sh <STORY_ID>` | Creates branch from the planned name | Deferred branch realization (bumps on collision; calls `set-branch` itself if the realized name differs) |
| `commit.sh <STORY_ID> <message>` | Stages + commits | Conventional per-task commit |
| `checkpoint.sh <action> <STORY_ID> [args]` | Manage state | complete / set-status / reopen / read |

Checkpoint stage keys (ordered): `scaffold` → `context_pack` → `spec_finalizer` → `blueprint`
→ `test_plan` → **`branch`** → `task_1`..`task_N` → `code_review` → `context_sync` → `closure`.
Stage status values: `pending | in_progress | awaiting_handoff | complete | needs_rework`.

## Protocol

### Step 1: Resolve the script directory

Resolve `<BIN>` = `.arcus/bin/` if it exists, else `$ARCUS_HOME/scripts/` (read `ARCUS_HOME` from
`.arcus/env`). All script invocations below use this `<BIN>` prefix.

### Step 2: Resolve inputs

1. **`STORY_ID`**: take it from the resume phrase (`"implement <STORY_ID>"` / `"review <STORY_ID>"`).
   If omitted, use the single in-progress story under `.arcus/specs/`; if more than one exists, ask
   which story.
2. **Read state and grounded artifacts**:
   - `.arcus/specs/<STORY_ID>/session-checkpoint.json` (via `<BIN>/checkpoint.sh read <STORY_ID>`) —
     mode, `review_round`, and per-stage status.
   - `.arcus/specs/<STORY_ID>/blueprint.md` — the task list.
   - `.arcus/specs/<STORY_ID>/plan.md` — the **grounded decisions** (the shared deliberation record
     written by spec-finalizer + implementation-planner). The dispatcher pulls the per-task
     constraints from here. Do NOT read assumptions from anywhere else.

### Step 3: Create the branch (deferred-branch step)

At entry, **realize the git branch** that was only *planned* at scaffold time — it does **not** exist
on disk yet:

1. Run `<BIN>/branch.sh <STORY_ID>`. This reads the planned `branch_name`/`base_branch` from the
   checkpoint, bumps the name on collision, creates the branch, and — if the realized name differs
   from the plan — calls `checkpoint.sh set-branch` itself so the checkpoint reflects the bump. Capture
   `BRANCH_NAME` and `BASE_BRANCH` from its output.
2. Mark the branch stage complete: `<BIN>/checkpoint.sh complete <STORY_ID> branch`.

> On a **resume**, if the `branch` stage is already `complete`, skip this step — the branch is
> already checked out.

### Step 4: Parse tasks

Extract each `### Task N:` heading (and its body: description, files, DoD, `complexity`) from
`blueprint.md`, **including any fix-tasks appended by a loopback** (see Loopback Protocol). Preserve
the heading order.

### Step 5: Loop over tasks

Reference the model strategy once: load `arcus:model-strategy` for complexity→model resolution. Each
task's `complexity` resolves to a model tier that the dispatcher passes as the subagent `model`
override (Copilot `runSubagent`; **Claude Code: the `Agent` tool, which honors `model`** —
`light`→`haiku`, `medium`→`sonnet`, `heavy`→`opus`), so mechanical tasks run on cheaper tiers. Only
the **main orchestration thread** (this loop) is fixed to the session model and cannot switch
mid-session; the per-task override applies to the dispatched subagents. `complexity` also guides the
dispatcher's escalation and reviewer model picks.)

For each task **in order**, skipping any whose checkpoint status is already `complete`:

1. `<BIN>/checkpoint.sh set-status <STORY_ID> task_<N> in_progress`.
2. **Read and follow the `arcus:subagent-task-dispatcher` skill** for that task — do **not**
   reimplement per-task dispatch. Pass it:
   - `STORY_ID`
   - `TASK_N`
   - `COMPLEXITY` = the task's `complexity` field, default `medium`
   - `COMMIT_MESSAGE` = `"Task N: <short description>"`

   The dispatcher owns per-task TDD (RED → GREEN), the refactor gate (skipped on `light` complexity), the spec-compliance check, and
   the commit via `commit.sh`. This loop does not commit directly.
3. On a `DONE` outcome: `<BIN>/checkpoint.sh complete <STORY_ID> task_<N>`, then proceed to the next task.
4. On a `BLOCKED` outcome the dispatcher could not resolve: stop the loop and surface it (in gated
   mode, hand back to the user; in afk mode, the controller handles it).

When all tasks are `complete`, go to the Handoff Protocol.

### Loopback Protocol (Code Review → Implementation)

When this skill is **re-entered after a `changes_requested` review** (the user replied `"fix"` at the
review gate, or afk auto-loops):

1. `<BIN>/checkpoint.sh reopen <STORY_ID> code_review` — sets `code_review` to `needs_rework` and bumps
   `review_round`.
2. Read `.arcus/specs/<STORY_ID>/review.md`. Convert **each critical and warning finding** into a
   fix-task: append it to `blueprint.md` as a new `### Task N:` heading (continuing the numbering),
   each with a **Definition of Done derived from the finding**. Mark each new task
   `<BIN>/checkpoint.sh set-status <STORY_ID> task_<N> pending`.
3. Run the loop (Step 5) for the **new fix-tasks only** — the already-complete tasks stay complete.
4. After the fix-tasks complete, hand off to Code Review again so it re-reviews the updated diff.
5. **Loopback cap**: stop auto-looping once `review_round` reaches **3**. Beyond that, always hand off
   to the user with the remaining findings, **regardless of mode** — do not auto-loop a 4th round.

### Handoff Protocol

This skill names **only its immediate successor** — Code Review. It does **not** enumerate the full
pipeline; that lives in the afk `arcus:arcus-controller`. On completion (all tasks complete), emit the
trailing handoff block below.

- **Successor**: Code Review — skill `arcus:code-reviewer`, resume phrase `"review <STORY_ID>"`.
- **Same-session continuation**: on a `"yes"` / `"proceed"`, load and follow `arcus:code-reviewer`
  directly.
- **Cold resume** (new session): the user types `"review <STORY_ID>"`, which re-activates Code Review
  by description-matching.
- **In afk mode**: skip the gate — do not stop; the controller continues to Code Review.

Emit exactly this shape:

```
[Handoff] Implementation complete → next: Code Review
Summary: <N tasks complete, M files changed>
Artifacts: <relative paths>
Proceed? Reply "yes" to run Code Review, or "no" to pause.
Resume later with: "review <STORY_ID>"
```

## Success Criteria

- The git branch is **created at entry** via `branch.sh` (it did not exist before this skill ran), and
  the `branch` stage is marked complete; any collision bump is reflected via `set-branch` (inside
  `branch.sh`).
- Every `### Task N:` heading in `blueprint.md` is dispatched via `arcus:subagent-task-dispatcher`;
  each task is committed via `commit.sh` (by the dispatcher).
- Loopback appends fix-tasks and stops auto-looping at `review_round` == 3.
- Grounded decisions are read from `plan.md` — never from assumptions/clarifications artifacts.
- The Handoff block hands off to Code Review with cold-resume phrase `"review <STORY_ID>"`.
