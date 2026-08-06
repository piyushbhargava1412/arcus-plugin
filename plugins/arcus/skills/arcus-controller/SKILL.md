---
name: arcus-controller
description: >
  The single orchestrator that drives a story from spec to pull
  request, in either INTERACTIVE (gated, default) or AUTONOMOUS (afk) mode. It is state-driven:
  it reads the session checkpoint and runs every remaining stage in the same canonical order.
  Both modes run every stage back-to-back to the pull request; they differ only in whether the
  Brainstorm stages stop to ask the user their open questions. Output is milestone-only.
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

- **interactive** (gated, default): during Brainstorm, any open questions a stage raises are
  surfaced **as one batch** and the pipeline stops for the answers. Every question carries a single
  Recommended option + rationale + custom-answer. Once they are answered, it runs to the pull
  request without stopping again.
- **autonomous** (afk): open questions are recorded but never surfaced, so nothing ever stops.

See **Output Discipline** for where the pipeline stops.

Execution is identical in both modes: the controller **spawns capabilities** and **runs
coordinators/orchestrators in-thread** (each stage states its own execution in the Execution
Pipeline below). No capability ever interviews the user — `spec-finalizer` and
`implementation-planner` emit a `## Open Questions` block into their own artifact and the controller
surfaces it (see **Open-Questions Protocol**), so both are always spawned as isolated subagents.

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
first, never reason from conversation memory, and always check the top-level `current_status` before
the per-stage walk (see Resumption Protocol). The loopback auto-loop is capped at `review_round` 3
(see Loopback Protocol).

## Output Discipline

Emit milestone lines only — no conversational filler ("Let me…", "Now I'll…", "Perfect!"). The
stream is the same in both modes; only the Brainstorm interaction differs.

```
[Story] <STORY_ID> (<mode>)
[Brainstorm] Complete: <N> tasks, <M> decisions
[TestPlan] Complete: <N> test cases
[Code] Complete: <N> files changed, <M> tests passing
[Review] <verdict>: <C> critical, <W> warning, <S> suggestion
[Context] <K artifacts updated, J skipped — or "no material drift">
[Complete] PR deployed: <link>
```

The **only** place the pipeline stops for a human is the Open-Questions Protocol during Brainstorm,
and only in interactive mode. Everything after it — test plan, branch, tasks, review, context sync,
closure — runs straight through to the pull request. If a story raises no open questions, an
interactive run never stops at all: there is nothing to decide.

The decision points that matter are the spec, the approach, and the finished diff. The first two are
the open questions; the third is the PR.

## Canonical Pipeline (checkpoint keys → phase groups)

The **single authoritative enumeration** of the checkpoint stage keys, in order, with the phase group
each rolls up to (gates and milestone output work at phase-group granularity) and its owner. The
sequence is identical in both modes; per-stage behavior is in the Execution Pipeline below. Run them
strictly in this order, skipping any whose checkpoint status is already `complete`.

| # | Stage key(s) | Phase group | Owner |
|---|--------------|-------------|-------|
| 1 | `scaffold` | Scaffold | `scaffold.sh` |
| 2 | `context_pack` | Brainstorm | `arcus:context-pack-builder` |
| 3 | `spec_finalizer` | Brainstorm | `arcus:spec-finalizer` |
| 4 | `plan` | Brainstorm | `arcus:implementation-planner` |
| 5 | `test_plan` | Test Plan | `arcus:test-spec-compiler` |
| 6 | `branch` | Implementation | `branch.sh` (via `arcus:implementation-runner`) |
| 7 | `task_1`..`task_N` | Implementation | `arcus:implementation-runner` |
| 8 | `code_review` | Code Review | `arcus:code-reviewer` |
| 9 | `context_sync` | Closure | `arcus:context-drift-sync` |
| 10 | `closure` | Closure | `arcus:pull-request-builder` + `pr.sh` |

## Helper Scripts

Call these via shell for deterministic operations. They are staged into the active workspace at
`.arcus/bin/`.

**Stage 0 of every run, before any other script: re-stage them.** Run
`bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root — or, if `ARCUS_HOME` is unset, the same
script from wherever the plugin is installed. It finds the newest install, runs the bootstrap, and
prints the resolved `ARCUS_HOME`.

Do **not** treat an existing `.arcus/bin/` as good enough. It is a *copy* with no expiry: a repo
bootstrapped by one host keeps serving that host's older scripts to every later session even after
an upgrade. `locate.sh` is idempotent and costs milliseconds; run it unconditionally rather than
checking first.

After it has run, `.arcus/bin/` is authoritative and `.arcus/env` carries `ARCUS_HOME` +
`ARCUS_VERSION`.

| Script | Usage | Purpose |
|--------|-------|---------|
| `"$ARCUS_HOME"/scripts/locate.sh` | Prints the resolved `ARCUS_HOME` | **Run first, every run.** Finds the newest install, re-stages `.arcus/bin/`, writes `.arcus/env` |
| `.arcus/bin/extract_story_id.sh <story.md>` | Outputs `STORY_ID: xxx` | Extract story identifier |
| `.arcus/bin/scaffold.sh <story.md> [--mode afk] [--use-current-branch\|--new-branch] [--base <b>]` | Creates folder + `story.md` + inits checkpoint | Workspace scaffold; records the **planned** branch and echoes `BRANCH_MODE: new\|adopted\|existing` |
| `.arcus/bin/branch.sh <story-id>` | Creates the git branch from the planned name | Deferred branch realization (called by `implementation-runner`, not by Stage 0); a **no-op** when the branch was adopted |
| `.arcus/bin/commit.sh <story-id> <message>` | Stages + commits | Conventional commit |
| `.arcus/bin/pr.sh <story-id>` | Push + create PR (or update if one already exists for the branch) | Closure |
| `.arcus/bin/checkpoint.sh <action> <story-id> [args]` | Manage state | init / read / complete / set-status / reopen / set-mode / set-branch / **set-tasks** / **await-handoff** / **fail** |

Stage keys and their order are the Canonical Pipeline table above. Stage status values:
`pending | in_progress | awaiting_handoff | complete | needs_rework`. Top-level `current_status`
values: `IN_PROGRESS | AWAITING_HANDOFF | COMPLETE | FAILED` — this is the single field the
Resumption Protocol checks first, before ever walking the per-stage statuses.

The `set-branch` action records a bumped/realized branch name onto the checkpoint; `branch.sh`
calls it itself when a collision forces a name change. `set-tasks <N>` seeds `task_1..task_N` as
`pending` (only creating keys that don't already exist), prunes any still-`pending` `task_N` keys
above `N`, and **re-points `current_stage`** at the first incomplete stage — call it once, right
after the plan is compiled, so the checkpoint never carries phantom task slots a resume could
mistakenly try to run, and never names a later stage than the work it just spliced in.
`await-handoff` sets `current_status` to
`AWAITING_HANDOFF` without touching any per-stage status — it is the durable marker that a handoff
gate is pending a "yes"/"proceed", distinct from a stage genuinely being incomplete. `fail` sets
`current_status` to `FAILED` and records `{stage, reason}` under `failure`.

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

## Execution Pipeline

Stage instructions live in two places. Stage 0, Implementation and Code Review are inline below —
Stage 0 runs unconditionally on every cold start and the two delegating stages are a couple of lines
each. The four content-heavy stages live in `references/`, one file per stage; read the file when you
reach the stage and follow it in-thread. Every reference file assumes this file's **Dispatching an
ARCUS agent** blockquote and never restates it; `brainstorm.md` additionally assumes the
**Open-Questions Protocol** (the only stage it applies to — see that protocol's own heading).

| Stage | Phase group | Instructions |
|-------|-------------|--------------|
| Stage 0: Scaffold | Scaffold | inline — **Stage 0: Scaffold** below |
| Brainstorm | Brainstorm | [`references/brainstorm.md`](references/brainstorm.md) |
| Test Plan | Test Plan | [`references/test-plan.md`](references/test-plan.md) |
| Implementation | Implementation | inline — **Implementation** below |
| Code Review | Code Review | inline — **Code Review** below |
| Context Sync | Closure | [`references/context-sync.md`](references/context-sync.md) |
| Closure | Closure | [`references/closure.md`](references/closure.md) |

If a stage's instruction file cannot be read, do not improvise the stage from memory — see
**Error Handling**.

### Stage 0: Scaffold (deterministic, no gate, no branch)

0. **Stage the helper scripts**: run `bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root
   (idempotent; see Helper Scripts). Do this before any other script call, on every run — including
   resumes — so a stale or missing `.arcus/bin/` can never silently serve old logic.
1. **Extract Story ID**: run `.arcus/bin/extract_story_id.sh <STORY_FILE>` and capture `STORY_ID`.
   If the script is missing, derive the ID from the filename (strip path and `.md`).
2. **Check checkpoint**: run `.arcus/bin/checkpoint.sh read <STORY_ID>`. If it already exists, jump
   to the **Resumption Protocol** instead of re-scaffolding.
3. **Resolve the mode** from the activation trigger: interactive → checkpoint value `gated`;
   autonomous → checkpoint value `afk`.
4. **Scaffold the workspace**: run `.arcus/bin/scaffold.sh <STORY_FILE> --mode <gated|afk>`. This
   creates `.arcus/specs/<STORY_ID>/`, copies `story.md`, and initializes the checkpoint with the
   **planned** `branch_name`/`base_branch` and the persisted `mode`. Capture `STORY_ID`,
   `BRANCH_NAME`, `BASE_BRANCH` and `BRANCH_MODE` from its output. (The mode is persisted here and
   **not re-inferred** on resume; if scaffold cannot set it, call
   `.arcus/bin/checkpoint.sh set-mode <STORY_ID> <gated|afk>`.)

   `BRANCH_MODE` tells you which of three things just happened:
   - **`new`** (the default) — a branch name was *planned* and **no git branch created**. Realization
     is deferred to the `branch` stage at the start of Implementation.
   - **`adopted`** — the workspace is a linked git **worktree** already checked out on a dedicated
     session branch, so that branch **is** the story branch: it is recorded as `branch_name`, the base
     resolves to the repo default, and the `branch` stage is already `complete`. Nothing to create.
     Do not plan around a `branch` stage here — cutting a second branch off the session branch would
     strand the work from the PR the host bound to it.
   - **`existing`** — a checkpoint for this story was already on disk, so scaffold wrote nothing and
     the `BRANCH_NAME`/`BASE_BRANCH` it echoed are the **stored** ones, not a fresh decision. You
     should not normally see this: an existing checkpoint means resume, so follow the Resumption
     Protocol rather than treating this as a scaffold.

   Override the detection with `--new-branch` (always plan a fresh `arcus/<id>-N`) or
   `--use-current-branch` (adopt even outside a worktree). Neither is needed in normal operation.
   If the repository default cannot be resolved (no `origin/HEAD`, no `main`/`master`), the adopt
   path **fails** and asks for `--base` rather than guessing a base that equals the branch.
5. **Mark scaffold complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> scaffold`.
6. **Output**: in autonomous mode emit `[AFK] Story: <STORY_ID>`; in interactive mode emit
   `Story: <STORY_ID> (interactive)`. Then flow into the Brainstorm stage.

### Implementation (delegated — branch + task loop)

Do **not** re-implement the per-task TDD loop, the branch realization, or the loopback here — they
are owned by the canonical loop driver. **Delegate** the whole Implementation stage:

1. **Read and follow the `arcus:implementation-runner` skill** **in-thread**, passing `STORY_ID` and
   the persisted `mode` (`afk` for autonomous, `gated` for interactive).
2. **Output**: emit `[Code] Complete: <N> files changed, <M> tests passing` and continue into
   Code Review.

### Code Review (verdict)

1. **Run the review** — code-reviewer is a **coordinator**, so read and follow the
   `arcus:code-reviewer` skill **in-thread** (Story ID: `<STORY_ID>`, output
   `.arcus/specs/<STORY_ID>/review.md`). It writes `review.md` and returns
   `VERDICT: approved | changes_requested`.
   - Verify `review.md` exists. Capture the verdict and counts (`critical`, `warning`, `suggestion`),
     then `.arcus/bin/checkpoint.sh complete <STORY_ID> code_review`.
2. **Decide on the verdict** (identical in both modes — no gate):
   - **approved**: emit `[Review] approved: …` and continue to Context Sync.
   - **changes_requested**: emit `[Review] changes_requested: …` and run the **Loopback Protocol**
     automatically, bounded by the review-round cap, then re-review. No confirmation: the findings
     are the reviewer's, the fix-tasks are mechanical, and a human who disagrees reviews the result
     at the PR.

## Open-Questions Protocol (mid-stage, Brainstorm only)

`arcus:spec-finalizer` and `arcus:implementation-planner` never converse. Each always writes a
**complete** artifact, and separately records the decisions it was least confident about in a
`## Open Questions` YAML block inside that same artifact. Surfacing them is the controller's job.

Run this immediately after the owning stage produces its artifact, before marking the stage complete:

1. **Read `## Open Questions`** from the artifact (`grounded-spec.md` or `plan.md`). If the section
   is absent or its list is empty, return immediately — there is nothing to ask.
2. **In autonomous mode, return immediately regardless.** The artifact is already fully resolved;
   the questions are informational only. Note them in the milestone line as
   `<n> low-confidence decisions` and move on.
3. **In interactive mode**, present **every** question in the block in a **single** turn — not one at
   a time. Render each as:

   ```
   [Questions] <n> open before <stage>:

   SF-1 — <gap>
     A — <option> (Recommended) — <rationale>
     B — <option>
     C — or answer in your own words

   SF-2 — …
   ```

   Then run `.arcus/bin/checkpoint.sh set-status <STORY_ID> <stage> awaiting_handoff` and **stop**.

   > **Never mark the stage `complete` on this path.** A stage with unanswered questions is
   > `awaiting_handoff`, not `complete` — marking it complete tells every later resume the human
   > already answered, so the questions are silently dropped and the tentative picks ship unreviewed.
   > `complete` for this stage happens in step 4 and nowhere else.
4. **On the user's reply**, re-dispatch the same agent with its `answers` input set to the user's
   reply verbatim, writing to the same output path. The agent maps answers to ids, records the
   mapping in `## Dialogue Answers`, and skips re-deriving what it already resolved. **Now** mark the
   stage complete: `.arcus/bin/checkpoint.sh complete <STORY_ID> <stage>`.
5. **Echo the mapping back** so a mis-parse is visible rather than silent:
   `[Questions] Read your answers as: SF-1→B, SF-2→custom("…")`.
6. **Repeat at most once.** A second `## Open Questions` block (round 2) may only contain gaps the
   round-1 answers newly revealed. Never run a third round — the agents auto-resolve past the cap.

Answers are never written by the controller. The owning agent writes its own `## Dialogue Answers`,
so each artifact keeps exactly one writer.

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

0. Run `bash "$ARCUS_HOME"/scripts/locate.sh` first — a resume is exactly when a stale `.arcus/bin/`
   from an earlier session (or an earlier host) is most likely.
1. Read it with `.arcus/bin/checkpoint.sh read <STORY_ID>`. Read the **persisted `mode`** from the
   checkpoint (`afk` → autonomous, `gated` → interactive) and use it; do **not** re-infer the mode
   from the resume phrase.
2. **Check `current_status` first — it is the single global signal for what to do next, and it takes
   precedence over the per-stage walk below:**
   - `FAILED`: stop. Report the `failure.stage` / `failure.reason` recorded on the checkpoint and wait
     for explicit user direction — do not silently retry the failed stage.
   - `COMPLETE`: the story is done. Report that and do nothing further.
   - `AWAITING_HANDOFF`: a stage is waiting on the user. Read the `current_stage`'s artifact:
     - Its `## Open Questions` has entries **not** yet answered in `## Dialogue Answers` → the stage
       is mid-**Open-Questions Protocol**. In interactive mode re-emit the `[Questions]` block and
       **stop**; in autonomous mode the questions are informational, so clear the status and carry on.
       Do **not** walk forward past an unanswered question in interactive mode: this is the one status
       the stage walk in step 4 must never be allowed to skip.
     - Nothing unanswered → clear the status and continue from the next incomplete stage. The
       human input for this story already happened; there is nothing further to confirm.
   - `IN_PROGRESS`: proceed to step 3.
3. **Reconcile against artifacts before walking.** A run can die between writing an artifact and
   recording it, leaving a stage `pending` whose output is already on disk — the next run would then
   redo finished work. For each pair below, if the file exists and the stage is `pending` or
   `in_progress`, mark it complete first:

   | Artifact | Stage |
   |---|---|
   | `context-pack.md` | `context_pack` |
   | `grounded-spec.md` | `spec_finalizer` |
   | `plan.md` | `plan` |
   | `test-plan.md` | `test_plan` |
   | `review.md` | `code_review` |
   | `PR_DESCRIPTION.md` | `closure` |

   **Exception:** do **not** reconcile `spec_finalizer` or `plan` if the artifact's
   `## Open Questions` still has entries unanswered in `## Dialogue Answers` — the file existing
   means the agent ran, not that the human replied. Leave those `awaiting_handoff`.
4. Determine the next action from stage status, walking the Canonical Pipeline order:
   - Skip any stage whose status is `complete`.
   - Run the first stage that is `pending`, `in_progress`, or `needs_rework` (a `code_review` marked
     `needs_rework` means re-enter Implementation via `arcus:implementation-runner` on the fix-tasks,
     then re-review).
5. Read the relevant existing artifacts (`context-pack.md`, `grounded-spec.md`, `plan.md`,
   `test-plan.md`, `review.md`) to restore context before running the resumed stage.

## Error Handling

- If a helper script fails (non-zero exit): retry once. If it still fails, run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "<reason>"`, output `[ERROR] <stage>: <reason>`,
  and stop.
- If a stage's instruction file under `references/` cannot be read: run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "stage instructions missing"`, then stop with
  `[ERROR] <stage>: stage instructions missing`. Never reconstruct the stage from memory — a
  half-remembered stage silently skips its checkpoint writes and its verification steps.
- If a stage's required output file is missing after its subagent returns: run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "produced no output"`, then stop with
  `[ERROR] <stage>: <agent> produced no output`.
- Do NOT advance into the next stage if the current stage's required artifacts are missing.
