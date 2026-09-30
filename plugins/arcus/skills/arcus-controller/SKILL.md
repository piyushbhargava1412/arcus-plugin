---
name: arcus-controller
description: >
  The single orchestrator that drives a story from spec to pull request. Two profiles: `lean`
  (default — one planner, a coding loop, a deterministic gate plus one reviewer, then the PR: the
  fewest hops that still yield tested commits and a clean PR) and `thorough` (`--thorough` — the full context-pack, spec,
  test-plan and five-specialist review pipeline). Three modes, orthogonal to profile: `afk` (never
  stops), `intelligent` (stops only for a genuine open question — cloud's default), `gated` (plus
  configurable phase-boundary stops). State-driven from the session checkpoint; milestone-only
  output. Activates on "arcus <STORY>" (default), "plan <STORY>" → gated; "arcus <STORY>
  --intelligent" → intelligent; "forge <STORY>", "afk <STORY>", "run afk on <STORY>", or "arcus
  <STORY> --afk" → afk; add "--thorough" to any of these for the full pipeline; "resume <STORY>" →
  continue from the first incomplete stage in the persisted mode and profile.
layer: orchestrator
standalone: false
argument-hint: <STORY>
---

# ARCUS Controller

Drives one story from spec to PR. The next action is **always a pure function of the checkpoint**,
never of conversation memory. Deterministic work is delegated to `.arcus/bin/*` helpers. If a helper
cannot run, fail the stage rather than improvising its logic.

## Activation

| User says | Mode | Profile |
|---|---|---|
| "arcus <STORY>", "plan <STORY>" | `gated` | `lean` |
| "arcus <STORY> --intelligent" | `intelligent` | `lean` |
| "forge <STORY>", "afk <STORY>", "run afk on <STORY>", "arcus <STORY> --afk" | `afk` | `lean` |
| any of the above + "--thorough" | as above | `thorough` |
| "resume <STORY>" | persisted | persisted |

Mode and profile are fixed at scaffold and **persisted on the checkpoint** (profile may also come
from `.arcus/config.json` → `profile`). They are never re-inferred on resume. A checkpoint with no
`profile` field predates profiles and runs as `thorough`. If `<STORY>` is omitted and exactly one
story is in progress under `.arcus/specs/`, use it; otherwise ask.

## Output: milestones only

No filler. Emit only these lines:
```text
[Story] <STORY_ID> (<mode>, <profile>)
[Plan] Complete: <N> tasks, <M> decisions, <T> test cases        (lean)
[Brainstorm] Complete: <N> tasks, <M> decisions                  (thorough)
[TestPlan] Complete: <N> test cases                              (thorough)
[Questions] …                                                    (open-questions protocol)
[Gate] <Phase group> complete — say "resume <STORY_ID>" to continue.
[Code] Complete: <N> tasks, <M> files changed
[Review] <verdict>: critical <C>, warning <W>, suggestion <S>
[Context] <K artifacts updated — or "no material drift">
[Complete] PR deployed: <link>
```

## Stage 0 (every run, including resumes)

1. `bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root. It re-stages `.arcus/bin/` and writes
   `.arcus/env`. If `ARCUS_HOME` is unset, use the plugin root that holds this skill: the directory two
   levels above this `SKILL.md`. Never guess another install path, because it may be a different version.
2. `node .arcus/bin/arcus-controller.mjs start <story.md|STORY_ID> --mode <afk|intelligent|gated> [--thorough]`
   (on `resume`, pass only the id). This one call scaffolds, or no-ops on an existing checkpoint,
   completes `scaffold`, and returns JSON with `storyId`, `mode`, `profile`, `stopAfter`, the branch
   fields, and the next `decision`. Always pass `--mode` explicitly on a fresh start: a cloud run
   must never default into `gated`. `branchMode: adopted` means the worktree's branch *is* the story
   branch (`branch` is pre-completed). `existing` means this is a resume.
3. Emit `[Story]`, then act on `decision.kind`:
   - `run_stage` → run that stage (table below), then continue with the next stage in order.
   - `await_questions` → re-emit the `[Questions]` block ([`references/open-questions-protocol.md`](references/open-questions-protocol.md)) and stop.
   - `loopback` → [`references/loopback-protocol.md`](references/loopback-protocol.md).
   - `stop_failed` → report `stage`/`reason` and stop. `complete` → report it and stop.

Within one run, do not call `decide` between stages; just follow the stage list below. Only on a later
resume where you need the decision again, use
`node .arcus/bin/arcus-controller.mjs decide --checkpoint .arcus/specs/<STORY_ID>/session-checkpoint.json`.
The full rules are in [`references/resumption-protocol.md`](references/resumption-protocol.md).

## Stages

Run in order, skipping any already `complete`. `scaffold` is done by `start`. Read a stage's file
only when you reach it. **Follow only the list for the checkpoint's `profile`.**

### Lean (`profile: lean`)

1. `plan`: [`references/lean-plan.md`](references/lean-plan.md). It dispatches the `planner` agent.
2. `branch`, `task_1..N`: [`references/lean-loop.md`](references/lean-loop.md), in-thread. Then emit
   `[Code]` and run the phase-boundary gate for `implementation`.
3. `code_review`: [`references/lean-review.md`](references/lean-review.md). It runs `gate.mjs` and
   dispatches the `change-reviewer` agent.
4. `context_sync`, `closure`: [`references/lean-closure.md`](references/lean-closure.md).

In lean, **never** invoke the `arcus:implementation-runner` or `arcus:code-reviewer` skills. **Never**
dispatch `subagent-task-dispatcher`, `simplify-and-verify`, `review-consolidator`,
`context-pack-builder`, `spec-finalizer`, `implementation-planner`, `test-spec-compiler` or
`pull-request-builder`. Those are the thorough path, and each one multiplies cost.

### Thorough (`profile: thorough`)

1. `context_pack`, `spec_finalizer`, `plan`: [`references/brainstorm.md`](references/brainstorm.md).
2. `test_plan`: [`references/test-plan.md`](references/test-plan.md).
3. `branch`, `task_1..N`: read and follow the `arcus:implementation-runner` skill in-thread with
   `STORY_ID`. Then emit `[Code]` and run the phase-boundary gate for `implementation`.
4. `code_review`: read and follow the `arcus:code-reviewer` skill in-thread.
5. `context_sync`: [`references/context-sync.md`](references/context-sync.md).
6. `closure`: [`references/closure.md`](references/closure.md).

### After Code Review (both profiles)

Code Review writes `review.md` and returns `VERDICT:`. Run
`.arcus/bin/checkpoint.sh complete <STORY_ID> code_review` and emit `[Review]`.
- `approved`: run the phase-boundary gate for `code_review`, then Context Sync.
- `changes_requested`: [`references/loopback-protocol.md`](references/loopback-protocol.md),
  automatically, with no confirmation, up to the profile's round cap (lean 2, thorough 3).

The phase-boundary gate is [`references/phase-boundary-gate-protocol.md`](references/phase-boundary-gate-protocol.md).

## Dispatching an agent

Agents live at `$ARCUS_HOME/agents/<name>.md` and always run as isolated subagents. Prefer the host's
registered type `arcus-plugin:<name>` (Claude Code, Copilot CLI). Otherwise, use a generic subagent whose
prompt opens *"Read and follow the agent spec at `<absolute ARCUS_HOME>/agents/<name>.md`"*. Never
pass a literal `$ARCUS_HOME`. Before every dispatch, run
`node .arcus/bin/models.mjs resolve --complexity <c> --stage <name> --checkpoint <checkpoint>`:
`dispatch:false` → omit the model parameter; `model` → use it verbatim; `models` → use your host's key.
Details are in `arcus:model-strategy` § Agent Resolution.

Pass artifacts **by path**, never by pasting them. Subagents return status lines, not reports.

## Helpers (`.arcus/bin/`)

| Script | Use |
|---|---|
| `arcus-controller.mjs start\|decide\|questions\|counts\|gate\|loopback` | state machine, question parsing, milestone counts, gate membership, loopback cap |
| `checkpoint.sh complete\|set-status\|set-tasks\|reopen\|await-handoff\|fail\|read <STORY_ID> …` | checkpoint mutations |
| `gate.mjs run\|drift --story <STORY_ID>` | lean deterministic review gate / context-drift check |
| `branch.sh`, `commit.sh`, `pr.sh <STORY_ID>` | branch realization, commits, PR open/update |
| `models.mjs resolve\|show` | model policy |

Stage statuses: `pending | in_progress | awaiting_handoff | complete | needs_rework`. Top-level
`current_status`: `IN_PROGRESS | AWAITING_HANDOFF | COMPLETE | FAILED`.

## Errors

- A helper exits non-zero: retry once. If it fails again, run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "<reason>"`, emit `[ERROR] <stage>: <reason>`, and stop.
- A stage's instruction file is unreadable, or its required artifact is missing after the stage ran:
  `fail` the stage the same way. Never reconstruct a stage from memory, and never advance past a
  missing artifact.
