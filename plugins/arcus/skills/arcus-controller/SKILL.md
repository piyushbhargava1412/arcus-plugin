---
name: arcus-controller
description: >
  The single orchestrator that drives a story from spec to pull
  request, in one of three modes: `afk` (never stops), `intelligent` (stops only for a genuine
  open question — this is cloud's default behavior), or `gated` (intelligent's question gate
  plus configurable phase-boundary stops). It is state-driven: it reads the session checkpoint
  and runs every remaining stage in the same canonical order. All three modes run every stage
  back-to-back to the pull request; they differ only in whether, and where, the pipeline pauses
  for a human. Output is milestone-only. Activates on "arcus <STORY>" (default), "plan <STORY>"
  → gated; "arcus <STORY> --intelligent" → intelligent; "forge <STORY>", "afk <STORY>", "run afk
  on <STORY>", or "arcus <STORY> --afk" → afk; "resume <STORY>" → continue from the first
  incomplete stage in whatever mode the checkpoint persists.
layer: orchestrator
standalone: false
argument-hint: <STORY>
---

# Overview

This is the **single orchestrator** that drives a story from spec to pull request. All three modes
run the **same canonical stage sequence**; only the gating differs:

- **afk**: open questions are recorded but never surfaced, so nothing ever stops.
- **intelligent**: Brainstorm open questions are surfaced **once, as a batch**, then the run
  continues straight through. No phase-boundary gates fire.
- **gated** (default): everything `intelligent` does, **plus** developer-configurable
  phase-boundary gates based on the checkpoint's `stop_after` set. New `gated` stories default to
  all three boundaries unless `.arcus/config.json` narrows or disables them.

## Activation

The activation trigger fixes the mode, which is then **persisted on the checkpoint** and read back
on resume (never re-inferred):

| User says | Mode | Checkpoint value | Action |
|-----------|------|------------------|--------|
| "arcus <STORY>" (default), "plan <STORY>" | gated | `gated` | Begin at Stage 0 (or resume from the checkpoint). |
| "arcus <STORY> --intelligent" | intelligent | `intelligent` | Begin at Stage 0 (or resume from the checkpoint). |
| "forge <STORY>", "afk <STORY>", "run afk on <STORY>", "arcus <STORY> --afk" | afk | `afk` | Begin at Stage 0 (or resume from the checkpoint). |
| "resume <STORY>" | persisted | — | Continue from the first incomplete stage in the checkpoint's mode (does not change the mode). |

If `<STORY>` is omitted and exactly one in-progress story exists under `.arcus/specs/`, use it;
otherwise ask which story.

## Owned state

The controller owns:

- the session checkpoint (stage keys enumerated below)
- the planned/realized branch name
- the loopback cap (`review_round` max 3)

The next action is a pure function of the checkpoint. Read it first, never reason from conversation
memory, and always check top-level `current_status` before the per-stage walk.

## Output Discipline

Emit milestone lines only — no filler ("Let me…", "Now I'll…", "Perfect!"). The stream is the same
across all three modes; only the Brainstorm question batch and `gated` phase-boundary gates differ.

```text
[Story] <STORY_ID> (<mode>)
[Brainstorm] Complete: <N> tasks, <M> decisions
[Gate] <Phase group> complete — say "resume <STORY_ID>" to continue.
[TestPlan] Complete: <N> test cases
[Code] Complete: <N> files changed, <M> tests passing
[Review] <verdict>: <C> critical, <W> warning, <S> suggestion
[Context] <K artifacts updated, J skipped — or "no material drift">
[Complete] PR deployed: <link>
```

If Brainstorm raises no open questions and `stop_after` is absent or empty, the run never pauses at
all: there is nothing to stop for.

## Canonical Pipeline

Run stages strictly in this order, skipping any whose checkpoint status is already `complete`.

| #  | Stage key(s)       | Phase group    | Owner                                           |
|----|--------------------|----------------|-------------------------------------------------|
| 1  | `scaffold`         | Scaffold       | `scaffold.sh`                                   |
| 2  | `context_pack`     | Brainstorm     | `arcus:context-pack-builder`                    |
| 3  | `spec_finalizer`   | Brainstorm     | `arcus:spec-finalizer`                          |
| 4  | `plan`             | Brainstorm     | `arcus:implementation-planner`                  |
| 5  | `test_plan`        | Test Plan      | `arcus:test-spec-compiler`                      |
| 6  | `branch`           | Implementation | `branch.sh` (via `arcus:implementation-runner`) |
| 7  | `task_1`..`task_N` | Implementation | `arcus:implementation-runner`                   |
| 8  | `code_review`      | Code Review    | `arcus:code-reviewer`                           |
| 9  | `context_sync`     | Closure        | `arcus:context-drift-sync`                      |
| 10 | `closure`          | Closure        | `arcus:pull-request-builder` + `pr.sh`          |

## Helper Scripts

Call these via shell for deterministic operations. They are staged into the active workspace at
`.arcus/bin/`.

**Stage 0 of every run, before any other script: re-stage them.** Run
`bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root — or, if `ARCUS_HOME` is unset, the same
script from wherever the plugin is installed. It finds the newest install, runs the bootstrap, and
prints the resolved `ARCUS_HOME`.

After it has run, `.arcus/bin/` is authoritative and `.arcus/env` carries `ARCUS_HOME` +
`ARCUS_VERSION`.

| Script                                                                                             | Usage                                                             | Purpose                                                                                                 |
|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `"$ARCUS_HOME"/scripts/locate.sh`                                                                  | Prints the resolved `ARCUS_HOME`                                  | **Run first, every run.** Finds the newest install, re-stages `.arcus/bin/`, writes `.arcus/env`        |
| `.arcus/bin/extract_story_id.sh <story.md>`                                                        | Outputs `STORY_ID: xxx`                                           | Extract story identifier                                                                                |
| `.arcus/bin/scaffold.sh <story.md> [--mode afk] [--use-current-branch\|--new-branch] [--base <b>]` | Creates folder + `story.md` + inits checkpoint                    | Workspace scaffold; records the **planned** branch and echoes `BRANCH_MODE: new\|adopted\|existing`     |
| `.arcus/bin/branch.sh <story-id>`                                                                  | Creates the git branch from the planned name                      | Deferred branch realization                                                                             |
| `.arcus/bin/commit.sh <story-id> <message>`                                                        | Stages + commits                                                  | Conventional commit                                                                                     |
| `.arcus/bin/pr.sh <story-id>`                                                                      | Push + create PR (or update if one already exists for the branch) | Closure                                                                                                 |
| `.arcus/bin/checkpoint.sh <action> <story-id> [args]`                                              | Manage state                                                      | init / read / complete / set-status / reopen / set-mode / set-branch / set-tasks / await-handoff / fail |
| `.arcus/bin/arcus-controller.mjs <command>`                                                        | Deterministic controller helper                                   | Canonical checkpoint walk, question parsing, milestone counts, gate membership, loopback cap            |
| `.arcus/bin/models.mjs <resolve\|show>`                                                            | Model resolution helper                                           | Resolve a model string for a given complexity/stage from the policy; show the active policy             |

Stage status values: `pending | in_progress | awaiting_handoff | complete | needs_rework`.
Top-level `current_status` values: `IN_PROGRESS | AWAITING_HANDOFF | COMPLETE | FAILED`.

> **Dispatching an ARCUS agent.** Agents live at `$ARCUS_HOME/agents/<name>.md` and always run as
> isolated subagents. Use the **first** that your host offers: (1) a **registered subagent type**
> ending in `<name>` — Claude Code and GitHub Copilot CLI both expose these as `arcus-plugin:<name>`,
> and the host then enforces the agent's `tools:` frontmatter; (2) otherwise a **generic subagent**
> whose prompt opens *"Read and follow the agent spec at `$ARCUS_HOME/agents/<name>.md`"*, on hosts
> with no registry — there the tool restrictions are only advisory. Full rule:
> `arcus:model-strategy` § Agent Resolution.
>
> **Route (2) constraint**: expand `$ARCUS_HOME` to its absolute path before embedding it in the
> child's prompt — never hand a subagent the literal `$ARCUS_HOME` string.

## Deterministic controller runtime

The bulky, mechanical controller logic is no longer prose-only. Treat
`.arcus/bin/arcus-controller.mjs` as authoritative for:

- resume/current-status precedence
- artifact reconciliation onto stale `pending` / `in_progress` stages
- open-question parsing (`## Open Questions` / `## Dialogue Answers`)
- milestone counts (`tasks`, `decisions`, `testCases`)
- phase-boundary membership checks
- loopback cap checks

Commands:

| Command                                                                                               | Purpose                                                               |
|-------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| `node .arcus/bin/arcus-controller.mjs decide --checkpoint <path>`                                     | Decide the next controller action from checkpoint + sibling artifacts |
| `node .arcus/bin/arcus-controller.mjs questions --artifact <path>`                                    | Parse questions + unanswered ids from an artifact                     |
| `node .arcus/bin/arcus-controller.mjs counts --plan <path> --grounded-spec <path> --test-plan <path>` | Count milestone metrics                                               |
| `node .arcus/bin/arcus-controller.mjs gate --mode <mode> --stop-after <csv> --phase-group <key>`      | Evaluate whether a phase-boundary gate fires                          |
| `node .arcus/bin/arcus-controller.mjs loopback --review-round <N>`                                    | Enforce the loopback cap                                              |
| `node .arcus/bin/models.mjs resolve --complexity <complexity> [--stage <name>] --checkpoint <path>`   | Resolve a model string for a complexity/stage from the checkpoint policy |
| `node .arcus/bin/models.mjs show [--checkpoint <path>]`                                               | Print the active model policy as JSON or human-readable text            |

If the helper cannot be read or run, fail the stage — do **not** reconstruct the state machine from
memory.

## Execution Pipeline

Stage instructions live either in `references/` or explained inline. Stage refs assume the **Dispatching an ARCUS agent** block above and call the `.mjs` helper where the work is purely deterministic.

### Stage 0: Scaffold

Read [`references/stage-0-scaffold.md`](references/stage-0-scaffold.md) and follow it in this thread.

### Brainstorm (context-pack-builder, spec-finalizer, implementation-planner)

Read [`references/brainstorm.md`](references/brainstorm.md) and follow it in this thread.

### Test Plan (test-spec-compiler)

Read [`references/test-plan.md`](references/test-plan.md) and follow it in this thread.

### Implementation (TDD implementation-runner)

Do **not** re-implement the per-task TDD loop, branch realization, or loopback here.

1. **Read and follow the `arcus:implementation-runner` skill** in-thread, passing `STORY_ID` and the
   persisted `mode` through unchanged.
2. **Output**: emit `[Code] Complete: <N> files changed, <M> tests passing`, then follow
   [`references/phase-boundary-gate-protocol.md`](references/phase-boundary-gate-protocol.md) for the
   `implementation` phase-group key — once, here, never per task and never after `branch`.

### Code Review (validation through specialist reviewers)

1. **Run the review** — `code-reviewer` is a coordinator, so read and follow the
   `arcus:code-reviewer` skill in-thread (Story ID: `<STORY_ID>`, output
   `.arcus/specs/<STORY_ID>/review.md`). It writes `review.md` and returns
   `VERDICT: approved | changes_requested`.
2. Verify `review.md` exists, capture the verdict + counts (`critical`, `warning`, `suggestion`),
   then `.arcus/bin/checkpoint.sh complete <STORY_ID> code_review`.
3. **Decide on the verdict**:
    - **approved**: emit `[Review] approved: …`, then follow
      [`references/phase-boundary-gate-protocol.md`](references/phase-boundary-gate-protocol.md) for
      the `code_review` phase-group key.
    - **changes_requested**: emit `[Review] changes_requested: …`, then follow
      [`references/loopback-protocol.md`](references/loopback-protocol.md) automatically, bounded by
      the review-round cap. No confirmation: the findings are the reviewer's, the fix-tasks are
      mechanical, and a human who disagrees reviews the result at the PR.

### Context Sync (detects drift and reconciles)

Read [`references/context-sync.md`](references/context-sync.md) and follow it in this thread.

### Closure (open pull request)

Read [`references/closure.md`](references/closure.md) and follow it in this thread.

## Error Handling

- If a helper script fails (non-zero exit): retry once. If it still fails, run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "<reason>"`, output `[ERROR] <stage>: <reason>`,
  and stop.
- If a stage/protocol instruction file under `references/` cannot be read: run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "stage instructions missing"`, then stop with
  `[ERROR] <stage>: stage instructions missing`. Never reconstruct the stage from memory.
- If a stage's required output file is missing after its subagent returns: run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "produced no output"`, then stop with
  `[ERROR] <stage>: <agent> produced no output`.
- Do **not** advance into the next stage if the current stage's required artifacts are missing.
