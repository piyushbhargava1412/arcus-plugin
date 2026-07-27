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
  "yes"/"proceed" before continuing. It additionally surfaces any open questions **as one batch** at
  the two Brainstorm stages that raise them. Every question carries a single Recommended option +
  rationale + custom-answer.
- **autonomous** (afk): stages run **back-to-back with no handoff gates**, auto-deciding at each step,
  emitting **milestone-only** output.

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

Call these via shell for deterministic operations. They are staged into the active workspace at
`.arcus/bin/`.

**Stage 0 of every run, before any other script: re-stage them.** Run
`bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root — or, if `ARCUS_HOME` is unset, the same
script from wherever the plugin is installed. It finds the newest install, runs the bootstrap, and
prints the resolved `ARCUS_HOME`.

Do **not** treat an existing `.arcus/bin/` as good enough. It is a *copy* with no expiry: a repo
bootstrapped by one host keeps serving that host's older scripts to every later session. Only Claude
Code fires the plugin's `SessionStart` hook — Copilot CLI reads hooks from `.github/hooks/` in a
different schema, so on a Copilot-only machine `.arcus/bin/` is never created at all. `locate.sh` is
idempotent and costs milliseconds; run it unconditionally rather than checking first.

After it has run, `.arcus/bin/` is authoritative and `.arcus/env` carries `ARCUS_HOME` +
`ARCUS_VERSION`.

| Script | Usage | Purpose |
|--------|-------|---------|
| `"$ARCUS_HOME"/scripts/locate.sh` | Prints the resolved `ARCUS_HOME` | **Run first, every run.** Finds the newest install, re-stages `.arcus/bin/`, writes `.arcus/env` |
| `.arcus/bin/extract_story_id.sh <story.md>` | Outputs `STORY_ID: xxx` | Extract story identifier |
| `.arcus/bin/scaffold.sh <story.md> [--mode afk]` | Creates folder + `story.md` + inits checkpoint | Workspace scaffold; records the **planned** branch, creates **no** git branch |
| `.arcus/bin/branch.sh <story-id>` | Creates the git branch from the planned name | Deferred branch realization (called by `implementation-runner`, not by Stage 0) |
| `.arcus/bin/commit.sh <story-id> <message>` | Stages + commits | Conventional commit |
| `.arcus/bin/pr.sh <story-id>` | Push + create PR (or update if one already exists for the branch) | Closure |
| `.arcus/bin/checkpoint.sh <action> <story-id> [args]` | Manage state | init / read / complete / set-status / reopen / set-mode / set-branch / **set-tasks** / **await-handoff** / **fail** |

Stage keys and their order are the Canonical Pipeline table above. Stage status values:
`pending | in_progress | awaiting_handoff | complete | needs_rework`. Top-level `current_status`
values: `IN_PROGRESS | AWAITING_HANDOFF | COMPLETE | FAILED` — this is the single field the
Resumption Protocol checks first, before ever walking the per-stage statuses.

The `set-branch` action records a bumped/realized branch name onto the checkpoint; `branch.sh`
calls it itself when a collision forces a name change. `set-tasks <N>` seeds `task_1..task_N` as
`pending` (only creating keys that don't already exist) and prunes any still-`pending` `task_N` keys
above `N` — call it once, right after the plan is compiled, so the checkpoint never carries phantom
task slots a resume could mistakenly try to run. `await-handoff` sets `current_status` to
`AWAITING_HANDOFF` without touching any per-stage status — it is the durable marker that a handoff
gate is pending a "yes"/"proceed", distinct from a stage genuinely being incomplete. `fail` sets
`current_status` to `FAILED` and records `{stage, reason}` under `failure`.

> **Dispatching an ARCUS agent.** Agents live at `$ARCUS_HOME/agents/<name>.md` and always run as
> isolated subagents. Use the **first** that your host offers: (1) a **registered subagent type**
> ending in `<name>` — Claude Code exposes these as `arcus-plugin:<name>`, and the host then enforces
> the agent's `tools:`/`disallowed-tools:` frontmatter; (2) otherwise a **generic subagent** whose
> prompt opens *"Read and follow the agent spec at `$ARCUS_HOME/agents/<name>.md`"* — Copilot CLI has
> no agent registry, so this is the only route there. Never address an agent as `arcus:<name>`; that
> is a docs token no host resolves. Full rule: `model-strategy/SKILL.md` § Agent Resolution.

## Execution Pipeline

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
   coordinator), passing the `story` and the available `repo_context`. It returns a `context_pack`
   and a `spec_grounding`, which the controller resolves to the workspace files
   `.arcus/specs/<STORY_ID>/context-pack.md` and `.arcus/specs/<STORY_ID>/grounded-spec.md`.

   Then mark the two stages **separately, in order, each against its own evidence** — never as one
   batch after both have run:
   - `context-pack.md` exists → `.arcus/bin/checkpoint.sh complete <STORY_ID> context_pack`.
   - `grounded-spec.md` exists → run the **Open-Questions Protocol** against it. **Only if that
     protocol returns without halting** may you run
     `.arcus/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`. If it halted, the stage is
     `awaiting_handoff` and you are done for this turn — see the prohibition in that protocol.
2. **Create implementation plan** — dispatch a one-shot subagent (identical in both modes; the skill
   never interviews):
   - **Prompt**: "Read and follow the `arcus:implementation-planner` skill. Story ID: `<STORY_ID>`. Write the plan to `.arcus/specs/<STORY_ID>/plan.md`."
   - **Description**: "Brainstorm: implementation-planner"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify `plan.md` exists, then run the **Open-Questions Protocol** against `plan.md`. **Only if
     it returns without halting** may you run `.arcus/bin/checkpoint.sh complete <STORY_ID> plan`.
3. **Record the task count**: run `.arcus/bin/checkpoint.sh set-tasks <STORY_ID> <N>` (N = `### Task`
   headings in `plan.md`) so the checkpoint reflects every planned task slot immediately, instead of
   relying on per-task keys appearing only as `implementation-runner` starts each one.
4. **Output / gate**:
   - **autonomous**: emit `[Brainstorm] Complete: <N> tasks, <M> decisions` (M = resolved decisions in
     `grounded-spec.md`) and continue without stopping.
   - **interactive**: run `.arcus/bin/checkpoint.sh await-handoff <STORY_ID>`, then emit the
     `[Handoff] Brainstorm complete → next: Test Plan` gate and **stop** until the user replies
     "yes"/"proceed".

### Test Plan (one-shot)

1. **Compile test spec** — dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:test-spec-compiler` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/test-plan.md`."
   - **Description**: "TestPlan: test-spec-compiler"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> test_plan`.
2. **Output / gate**:
   - **autonomous**: emit `[TestPlan] Complete: <N> test cases` and continue without stopping.
   - **interactive**: run `.arcus/bin/checkpoint.sh await-handoff <STORY_ID>`, then emit the
     `[Handoff] Test Plan complete → next: Implementation` gate and **stop** until the user replies
     "yes"/"proceed".

### Implementation (delegated — branch + task loop)

Do **not** re-implement the per-task TDD loop, the branch realization, or the loopback here — they
are owned by the canonical loop driver. **Delegate** the whole Implementation stage:

1. **Read and follow the `arcus:implementation-runner` skill** **in-thread**, passing `STORY_ID` and
   the persisted `mode` (`afk` for autonomous, `gated` for interactive).
2. **Output / gate**:
   - **autonomous**: emit `[Code] Complete: <N> files changed, <M> tests passing` and continue into
     Code Review.
   - **interactive**: run `.arcus/bin/checkpoint.sh await-handoff <STORY_ID>`, then emit the
     `[Handoff] Implementation complete → next: Code Review` gate and **stop** until the user replies
     "yes"/"proceed".

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
     - **approved**: run `.arcus/bin/checkpoint.sh await-handoff <STORY_ID>`, then emit the
       `[Handoff] Code Review complete → next: Context Sync + Closure` gate and **stop** until the
       user replies "yes"/"proceed", then continue to Context Sync.
     - **changes_requested**: run `.arcus/bin/checkpoint.sh await-handoff <STORY_ID>`, surface the
       findings, and run the **Loopback Protocol** (bounded by the review-round cap), confirming with
       the user before re-entering Implementation; then re-review.

### Context Sync (one-shot, runs only after final approval)

Runs **only after** a final `approved` verdict — the diff is now stable and approved. Reconciles any
shared `.context/` artifact that the approved change set materially drifted.

1. **Run the drift sync** — dispatch a one-shot subagent:
   - **Agent**: `context-drift-sync`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Inputs: `sync_scope=branch`,
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
4. **On the user's reply**, re-dispatch the same skill with its `answers` input set to the user's
   reply verbatim, writing to the same output path. The skill maps answers to ids, records the
   mapping in `## Dialogue Answers`, and skips re-deriving what it already resolved. **Now** mark the
   stage complete: `.arcus/bin/checkpoint.sh complete <STORY_ID> <stage>`.
5. **Echo the mapping back** so a mis-parse is visible rather than silent:
   `[Questions] Read your answers as: SF-1→B, SF-2→custom("…")`.
6. **Repeat at most once.** A second `## Open Questions` block (round 2) may only contain gaps the
   round-1 answers newly revealed. Never run a third round — the skills auto-resolve past the cap.

Answers are never written by the controller. The owning skill writes its own `## Dialogue Answers`,
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
   - `AWAITING_HANDOFF`: something is waiting on the user. Distinguish the two cases by reading the
     `current_stage`'s artifact:
     - Its `## Open Questions` has entries **not** yet answered in `## Dialogue Answers` → the stage
       is mid-**Open-Questions Protocol**. Re-emit the `[Questions]` block and **stop**.
     - Otherwise → a phase group is gated. Re-emit the
       `[Handoff] <phase group> complete → next: <next phase group>` gate for the phase group
       `current_stage` belongs to (per the Canonical Pipeline table) and **stop**.

     In both cases, do **not** walk forward into the next stage until the user replies. This is the
     status the plain stage-status walk in step 3 must never be allowed to skip past —
     `awaiting_handoff`/`AWAITING_HANDOFF` is not a "run it" status and not a "skip it" status; it is
     "re-ask before doing anything."
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
   means the skill ran, not that the human replied. Leave those `awaiting_handoff`.
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
- If a stage's required output file is missing after its subagent returns: run
  `.arcus/bin/checkpoint.sh fail <STORY_ID> <stage> "produced no output"`, then stop with
  `[ERROR] <stage>: <skill> produced no output`.
- Do NOT advance into the next stage if the current stage's required artifacts are missing.
