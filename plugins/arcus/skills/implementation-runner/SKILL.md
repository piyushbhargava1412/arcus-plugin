---
name: implementation-runner
description: >
  The canonical ARCUS implementation loop. Creates the git branch at entry
  (deferred-branch design), parses the plan's tasks, and drives each task
  through the subagent-task-dispatcher protocol with per-task TDD, spec-check,
  and commit. Reused by both the gated flow and the afk controller. Activates on
  "implement <STORY>" or "code <STORY>"; resumes after a changes_requested review
  via the loopback protocol.
layer: orchestrator
standalone: false
argument-hint: <STORY>
---

# Implementation Runner (Gated Loop Driver)

## Overview

This skill is the **single, canonical implementation loop** for the ARCUS Implementation
stage. It is reused verbatim by **both** entry paths:

- the **gated flow** — the user types `"implement <STORY>"` / `"code <STORY>"`;
- the **afk controller** — which delegates the Implementation stage to this skill.

It realizes the git branch at entry (the **deferred-branch** design — the branch was only
*planned* at scaffold time, never created), then loops over the plan's `### Task N:`
headings, dispatching each task to a fresh subagent. On completion it hands off to **Code
Review** and stops.

> **Constraint — this skill MUST NOT declare `context: fork` or an `agent:` block.** It is an
> **stateful loop driver** that mutates checkpoint state, creates a git branch, and reports
> milestones in the main thread. It is *not* a one-shot isolated worker. (The per-task
> isolation happens *inside* the loop, via the dispatcher's subagents — not by forking this skill.)

## Execution Modes

This skill behaves **identically in both modes** — it runs the loop and returns. It never stops for
confirmation: the only place the pipeline waits for a human is the Brainstorm open questions, long
before this skill is reached.

| Mode | Caller | Behaviour at completion |
|------|--------|-------------------------|
| **gated** (default) | User entry phrase `"implement <STORY>"` | Run the loop, emit the milestone, return. Standalone, tell the user `review <STORY_ID>` is next. |
| **afk** | The afk arcus-controller delegates here | Identical — the controller continues into Code Review. |

Read the persisted `mode` from the checkpoint; do not re-infer it.

## Helper Scripts

Call these via shell for all deterministic git/state operations — never reason about branch names,
commit messages, or checkpoint JSON by hand. Resolve the script directory in this order and use the
Run `bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root first — it re-stages `.arcus/bin/`
from the newest install and writes `ARCUS_HOME`/`ARCUS_VERSION` into `.arcus/env`. Never trust an
existing `.arcus/bin/`: it is a copy with no expiry, and on hosts that do not fire the plugin's
SessionStart hook (Copilot CLI) it may not exist at all. This is the same resolution rule the `arcus:arcus-controller`
uses.

| Script | Usage | Purpose |
|--------|-------|---------|
| `branch.sh <STORY_ID>` | Creates branch from the planned name | Deferred branch realization (bumps on collision; calls `set-branch` itself if the realized name differs) |
| `commit.sh <STORY_ID> <message>` | Stages + commits | Conventional per-task commit |
| `checkpoint.sh <action> <STORY_ID> [args]` | Manage state | complete / set-status / reopen / read |

Checkpoint stage keys (ordered): `scaffold` → `context_pack` → `spec_finalizer` → `plan`
→ `test_plan` → **`branch`** → `task_1`..`task_N` → `code_review` → `context_sync` → `closure`.
Stage status values: `pending | in_progress | awaiting_handoff | complete | needs_rework`.

> **Dispatching an ARCUS agent.** Agents live at `$ARCUS_HOME/agents/<name>.md` and always run as
> isolated subagents. Use the **first** that your host offers: (1) a **registered subagent type**
> ending in `<name>` — Claude Code and GitHub Copilot CLI both expose these as `arcus-plugin:<name>`,
> and the host then enforces the agent's `tools:` frontmatter; (2) otherwise a **generic subagent**
> whose prompt opens *"Read and follow the agent spec at `$ARCUS_HOME/agents/<name>.md`"*, on hosts
> with no registry — there the tool restrictions are only advisory. Full rule:
> `arcus:model-strategy` § Agent Resolution.
>
> **Route (2) constraint**: expand `$ARCUS_HOME` to its absolute path before embedding it in the
> child's prompt — never hand a subagent the literal `$ARCUS_HOME` string. A spawned child has
> neither the variable nor a `.arcus/env` instruction of its own, so a literal reference is exactly
> how an unresolvable path (and the filesystem-wide `find` it invites) gets improvised.

## Protocol

### Step 1: Resolve the script directory

Resolve `<BIN>` = `.arcus/bin/` (after `locate.sh` has run), else `$ARCUS_HOME/scripts/` (read `ARCUS_HOME` from
`.arcus/env`). All script invocations below use this `<BIN>` prefix.

### Step 2: Resolve inputs

1. **`STORY_ID`**: take it from the resume phrase (`"implement <STORY_ID>"` / `"review <STORY_ID>"`).
   If omitted, use the single in-progress story under `.arcus/specs/`; if more than one exists, ask
   which story.
2. **Read state and grounded artifacts**:
   - `.arcus/specs/<STORY_ID>/session-checkpoint.json` (via `<BIN>/checkpoint.sh read <STORY_ID>`) —
     mode, `review_round`, and per-stage status.
   - `.arcus/specs/<STORY_ID>/plan.md` — the implementation plan (design deliberation +
     `### Task N:` list).
   - `.arcus/specs/<STORY_ID>/grounded-spec.md` — the **grounded decisions** from spec-finalizer.
     The dispatcher pulls the per-task constraints from here.

### Step 3: Create the branch (deferred-branch step)

At entry, **realize the git branch** that was only *planned* at scaffold time — it does **not** exist
on disk yet:

1. Run `<BIN>/branch.sh <STORY_ID>`. This reads the planned `branch_name`/`base_branch` from the
   checkpoint, bumps the name on collision, creates the branch, and — if the realized name differs
   from the plan — calls `checkpoint.sh set-branch` itself so the checkpoint reflects the bump. Capture
   `BRANCH_NAME` and `BASE_BRANCH` from its output.
2. Mark the branch stage complete: `<BIN>/checkpoint.sh complete <STORY_ID> branch`.

> On a **resume**, if the `branch` stage is already `complete`, skip this step — the branch is
> already checked out. This is also the steady state in a linked git **worktree**: `scaffold.sh`
> adopts the session branch the host already created and pre-completes the stage, because cutting a
> second branch off it would strand the story from the PR bound to that branch.

### Step 4: Parse tasks

Extract each `### Task N:` heading (and its body: description, files, DoD, `complexity`) from
`plan.md`, **including any fix-tasks appended by a loopback** (see Loopback Protocol). Preserve
the heading order.

### Step 5: Loop over tasks

Reference the model strategy once: load `arcus:model-strategy` for complexity→model resolution. Each
task's `complexity` resolves to a model tier that the dispatcher passes as the subagent `model`
override (Copilot CLI: the `task` tool; VS Code: `runSubagent`; **Claude Code: the `Agent` tool** —
`light`→`haiku`, `medium`→`sonnet`, `heavy`→`opus`), so mechanical tasks run on cheaper tiers. Only
the **main orchestration thread** (this loop) is fixed to the session model and cannot switch
mid-session; the per-task override applies to the dispatched subagents. `complexity` also guides the
dispatcher's escalation and reviewer model picks.)

**Task list (best-effort, host-provided).** If your host exposes a structured task-list tool, seed
it with one entry per parsed task (Step 4) before the loop starts, using each task's short
description as the entry text. This capability is not reliably available on every host today; if
the call is rejected or no such tool is exposed, skip it silently and continue. **Never treat it as
a second source of truth** — `checkpoint.sh` alone decides what actually happened; the task list
only mirrors it for the human watching the terminal.

For each task **in order**, skipping any whose checkpoint status is already `complete`:

1. `<BIN>/checkpoint.sh set-status <STORY_ID> task_<N> in_progress` — if a task list was seeded,
   mark this entry in_progress too.
2. **Dispatch the `subagent-task-dispatcher` agent** for that task (resolve the dispatch target per **Agent Resolution** in `arcus:model-strategy`) — do **not**
   reimplement per-task dispatch. Pass it:
   - `STORY_ID`
   - `TASK_N`
   - `COMPLEXITY` = the task's `complexity` field, default `medium`
   - `COMMIT_MESSAGE` = `"Task N: <short description>"`
   - **Description**: `"Task N: <short description>"`

   The dispatcher owns per-task TDD (RED → GREEN), the refactor gate (skipped on `light` complexity), the spec-compliance check, and
   the commit via `commit.sh`. This loop does not commit directly.
3. On a `DONE` outcome: `<BIN>/checkpoint.sh complete <STORY_ID> task_<N>`, then proceed to the next
   task — if a task list was seeded, mark this entry completed too.
4. On a `BLOCKED` outcome the dispatcher could not resolve: stop the loop and surface it. This is a
   genuine failure, not a gate — record it with `<BIN>/checkpoint.sh fail <STORY_ID> task_<N>
   "<reason>"` so a resume reports it instead of silently retrying.

When all tasks are `complete`, go to the Handoff Protocol.

### Loopback Protocol (Code Review → Implementation)

When this skill is **re-entered after a `changes_requested` review** (the controller loops back
automatically in both modes, or the user typed `"fix <STORY_ID>"` standalone):

1. `<BIN>/checkpoint.sh reopen <STORY_ID> code_review` — sets `code_review` to `needs_rework` and bumps
   `review_round`.
2. Read `.arcus/specs/<STORY_ID>/review.md`. Convert **each critical and warning finding** into a
   fix-task: append it to `plan.md` as a new `### Task N:` heading (continuing the numbering),
   each with a **Definition of Done derived from the finding**. Mark each new task
   `<BIN>/checkpoint.sh set-status <STORY_ID> task_<N> pending` — if a task list was seeded, append
   an entry for each new fix-task too.
3. Run the loop (Step 5) for the **new fix-tasks only** — the already-complete tasks stay complete.
4. After the fix-tasks complete, hand off to Code Review again so it re-reviews the updated diff.
5. **Loopback cap**: stop auto-looping once `review_round` reaches **3**. Beyond that, always hand off
   to the user with the remaining findings, **regardless of mode** — do not auto-loop a 4th round.

### Handoff Protocol

This skill names **only its immediate successor** — Code Review. It does **not** enumerate the full
pipeline; that lives in `arcus:arcus-controller`. On completion (all tasks complete), emit the
milestone below and return. **Do not stop and wait.**

- **Successor**: Code Review — skill `arcus:code-reviewer`, resume phrase `"review <STORY_ID>"`.
- **Driven by the controller**: it continues straight into Code Review — no confirmation.
- **Standalone / cold resume**: the user types `"review <STORY_ID>"`, which re-activates Code Review
  by description-matching.
Emit the milestone and return to the caller — **do not stop for confirmation**:

```
[Code] Complete: <N> tasks, <M> files changed
Artifacts: <relative paths>
```

Standalone (no controller), tell the user what to run next: `review <STORY_ID>`.

