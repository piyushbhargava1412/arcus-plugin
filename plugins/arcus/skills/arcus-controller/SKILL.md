---
name: arcus-controller
description: >
  ARCUS controller meta-skill. Drives a human-gated SDLC pipeline
  (Init → Brainstorm → Test Plan → Implementation → Code Review → Closure). It is
  state-driven: it reads the session checkpoint, runs only the next incomplete
  stage, then stops at a handoff gate. Activates on "implement/build/forge <STORY>.md",
  on a per-stage phrase ("brainstorm/plan/generate tests/implement/review/close <STORY>"),
  or on a "yes"/"proceed" continuation. An opt-in autonomous mode (--afk) runs every
  stage without stopping.
metadata:
  version: "3.0.0"
  team: krill
  type:
    - orchestrator
    - meta-skill
---

# ARCUS Controller (Orchestrator Meta-Skill)

This skill orchestrates a story from spec to pull request as a sequence of **discrete,
human-gated stages**. By default it runs **one stage at a time** and pauses at a
**handoff gate** so the user can review the output and decide whether to proceed.

## Operating Modes

| Mode | When | Behaviour |
|------|------|-----------|
| **gated** (default) | Normal use | Run the next incomplete stage, then STOP at a handoff gate. Conversational output is allowed. |
| **afk** (opt-in) | User says "afk", "--afk", "autonomous", "don't ask me", or "run afk on …" | Run every stage back-to-back with no gates. Auto-confirm all handoffs. Milestone-only output. |

Resolve the mode once at entry and persist it: `.arcus/bin/checkpoint.sh set-mode <STORY_ID> <gated|afk>`.
On resume, read the persisted `mode` from the checkpoint — do not re-infer it.

## Intent Detection

Activate and route based on the user's message:

| User says | Action |
|-----------|--------|
| "implement <STORY>.md", "build <STORY>.md", "start <STORY>.md" | Begin pipeline at Stage 0 (mode = gated unless an afk phrase is present). |
| "forge <STORY>", "run afk on <STORY>", "implement <STORY>.md --afk" | Begin pipeline in **afk** mode (no gates). |
| "yes", "proceed", "continue", "go", "y" | **Continuation** — run the next incomplete stage from the checkpoint, honouring its entry rules. |
| "no", "pause", "stop", "hold" | **Pause** — stop and print the resume instructions (see Handoff Protocol). Do not run anything. |
| "brainstorm <STORY>" / "plan <STORY>" | Run **Stage 1** only. |
| "generate tests <STORY>" / "test plan <STORY>" | Run **Stage 2** only. |
| "implement <STORY>" / "code <STORY>" | Run **Stage 3** only (requires Stages 1–2 complete). |
| "review <STORY>" / "code review <STORY>" | Run **Stage 4** only (requires Stage 3 complete). |
| "close <STORY>" / "raise pr <STORY>" / "ship <STORY>" | Run **Stage 5** only (requires Stage 4 approved). |
| "fix <STORY>" / "apply review feedback <STORY>" | **Loopback** — feed open review findings back into Stage 3 as fix-tasks. |

For a continuation or a per-stage phrase, the `<STORY>` may be omitted if exactly one
in-progress story exists under `.arcus/specs/`; otherwise ask which story.

## Key Principles

- **One stage per turn (gated mode)**: Run a single stage, then stop at its handoff gate.
  Never run past a gate without the user's "yes" (except in afk mode).
- **State is the source of truth**: Always read `session-checkpoint.json` first. The next
  action is a pure function of the checkpoint, not of conversation memory.
- **Deterministic ops via scripts**: Use helper scripts for git and state. Never reason
  about branch names, commit messages, or checkpoint JSON by hand.
- **Subagent isolation**: Generation-heavy work is dispatched to fresh subagents with scoped
  context. The orchestrator stays lean: dispatch, read response, update state, gate.
  **Exception**: the Stage 1 brainstorming *dialogue* happens in the main thread, because a
  subagent cannot talk to the user (see Stage 1).
- **Resumable across sessions**: Every handoff message states the exact phrase to resume, so a
  user can return in a new session and continue.

## Output Discipline

- **Gated mode**: Conversational output is allowed where a stage requires it (the brainstorming
  dialogue, handoff prompts, review summaries). Keep everything else terse — milestone lines plus
  the handoff block. No "Let me…", "Now I'll…", "Perfect!".
- **afk mode**: Milestone lines only, as the legacy autonomous pipeline:
  ```
  [AFK] Story: <STORY_ID>
  [Brainstorm] Complete: <N> tasks, <M> decisions
  [TestPlan] Complete: <N> test cases
  [Code] Complete: <N> files changed, <M> tests passing
  [Review] <verdict>: <C> critical, <W> warning, <S> suggestion
  [Complete] PR deployed: <link>
  ```

## Handoff Protocol

When a gated stage finishes, its own sub-step keys are already marked `complete`. To record that the
pipeline is **paused at a gate**, mark the **next stage's entry key** `awaiting_handoff`
(`.arcus/bin/checkpoint.sh set-status <STORY_ID> <next_entry_key> awaiting_handoff`) and emit a
**handoff block** in this exact shape:

```
[Handoff] <STAGE> complete → next: <NEXT_STAGE>
Summary: <one line — what was produced>
Artifacts: <relative paths>
Proceed? Reply "yes" to run <NEXT_STAGE>, or "no" to pause.
Resume later with: "<exact resume phrase>"
```

Next-stage entry keys: GATE A → `test_plan`; GATE B → `task_1`; GATE C → `code_review`;
GATE D (approved) → `closure`.

- On **"yes"**: set the next entry key `in_progress`, then run `<NEXT_STAGE>`.
- On **"no"**: leave the next entry key `awaiting_handoff` and stop. Print only a one-line
  confirmation of how to resume.
- In **afk mode**: skip the gate entirely — do not set `awaiting_handoff`; continue immediately.

## Helper Scripts

Call these via shell for deterministic operations. The session bootstrap hook stages them into
the active workspace at `.arcus/bin/`. Resolve the script directory in this order and use the
first that exists: `.arcus/bin/` (preferred, staged by the plugin) → `$ARCUS_HOME/scripts/`
(read `ARCUS_HOME` from `.arcus/env`).

| Script | Usage | Purpose |
|--------|-------|---------|
| `.arcus/bin/extract_story_id.sh <story.md>` | Outputs `STORY_ID: xxx` | Extract story identifier |
| `.arcus/bin/branch.sh <story-id>` | Creates branch + workspace | Git isolation + scaffold |
| `.arcus/bin/commit.sh <story-id> <message>` | Stages + commits | Conventional commit |
| `.arcus/bin/pr.sh <story-id>` | Push + create PR | Closure |
| `.arcus/bin/checkpoint.sh <action> <story-id> [args]` | Manage state | init / read / complete / set-status / reopen / set-mode |

Checkpoint stage keys (ordered): `init` → `context_pack` → `spec_finalizer` → `blueprint`
→ `test_plan` → `task_1`..`task_N` → `code_review` → `closure`.
Stage status values: `pending | in_progress | awaiting_handoff | complete | needs_rework`.

## Stage Map & Gates

| Stage | Group keys | Persona | Automation | Gate |
|-------|-----------|---------|------------|------|
| 0 Init | `init` | Infra | Deterministic | none → flows into Stage 1 |
| 1 Brainstorm | `context_pack`, `spec_finalizer`, `blueprint` | Architect | Human-in-the-loop dialogue | **GATE A** after |
| 2 Test Plan | `test_plan` | QA | Automated (no gate of its own) | **GATE B** before implementation |
| 3 Implementation | `task_1`..`task_N` | Engineer | Automated, per-task TDD + spec check | **GATE C** after |
| 4 Code Review | `code_review` | Reviewer | Automated | **GATE D** decision (approve / loopback) |
| 5 Closure | `closure` | Release | Manual trigger | none (terminal) |

## Execution Pipeline

### Stage 0: Init (deterministic, no gate)

1. **Extract Story ID**: Run `.arcus/bin/extract_story_id.sh <STORY_FILE>` and capture `STORY_ID`.
   - If the script is missing, derive the ID from the filename (strip path and `.md`).
2. **Check checkpoint**: Run `.arcus/bin/checkpoint.sh read <STORY_ID>`. If it exists, jump to the
   **Resumption Protocol** instead of re-initialising.
3. **Create branch + workspace**: Run `.arcus/bin/branch.sh <STORY_ID>`. Capture `BRANCH_NAME` and
   `BASE_BRANCH` from its output.
4. **Initialize checkpoint**: Run `.arcus/bin/checkpoint.sh init <STORY_ID> <BRANCH_NAME> <BASE_BRANCH> <MODE>`
   where `<MODE>` is `gated` or `afk` resolved at entry.
5. **Mark init complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> init`.
6. **Output**: `[AFK] Story: <STORY_ID>`. Then flow directly into Stage 1 (init has no handoff gate;
   brainstorming is interactive and engages the user on its own).

### Stage 1: Brainstorm (human-in-the-loop)

The goal of this stage is a **collaborative** understanding of the work, ending in a finalized set
of assumptions and an implementation plan the user has approved.

1. **Build context pack** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:context-pack-builder` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/context-pack.md`."
   - **Description**: "Brainstorm: context-pack-builder"
   - **Model**: Resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> context_pack`.
2. **Finalize spec** — How you run this depends on mode:
   - **In gated mode**: Read and follow the `arcus:spec-finalizer` skill **in the main thread**
     (NOT as a subagent), because this stage talks directly to the user. Conduct a genuine dialogue —
     ask the highest-impact open questions **one at a time**, incorporating each answer before asking
     the next. Stop asking once the remaining ambiguities can be resolved confidently. Persist answers
     to `.arcus/specs/<STORY_ID>/clarifications.md`.
   - **In afk mode**: there is no dialogue, so dispatch it as a one-shot subagent:
     - **Prompt**: "Read and follow the `arcus:spec-finalizer` skill in one-shot mode. Story ID:
       `<STORY_ID>`. Auto-resolve every ambiguity and produce ONLY
       `.arcus/specs/<STORY_ID>/assumptions.md`. Do NOT create `blueprint.md`, a task list, or any
       implementation plan — that is the implementation-planner's job, which runs next. End your reply
       with the `NEEDS_INPUT` block."
     - **Description**: "Brainstorm: spec-finalizer"
     - **Model**: Resolve complexity `medium` via the `arcus:model-strategy` skill.
   - In both modes, the skill produces only `.arcus/specs/<STORY_ID>/assumptions.md` (plus
     `clarifications.md` in dialogue mode). It must NOT produce `blueprint.md`.
   - If `clarifications.md` already exists (resumed run), reuse it and do NOT re-ask answered questions.
   - Verify `assumptions.md` exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`.
3. **Create implementation plan** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:implementation-planner` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/blueprint.md`."
   - **Description**: "Brainstorm: implementation-planner"
   - **Model**: Resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> blueprint`.
4. **GATE A** — Emit the handoff block:
   - `<STAGE>` = `Brainstorm`, `<NEXT_STAGE>` = `Test Plan → (stops before Implementation)`
   - Summary: `<N> tasks, <M> decisions` (N = `### Task` headings in blueprint.md; M = decisions in assumptions.md)
   - Artifacts: `context-pack.md`, `assumptions.md`, `blueprint.md`
   - Resume phrase: `"generate tests <STORY_ID>"` or `"yes"`
   - On "yes": proceed to Stage 2 **and** continue automatically into GATE B (test plan has no gate
     of its own). In afk mode, continue without stopping.

### Stage 2: Test Plan (automated, no gate of its own)

1. **Compile test spec** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:test-spec-compiler` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/test-plan.md`."
   - **Description**: "TestPlan: test-spec-compiler"
   - **Model**: Resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> test_plan`.
2. **GATE B** — Emit the handoff block:
   - `<STAGE>` = `Test Plan`, `<NEXT_STAGE>` = `Implementation`
   - Summary: `<N> test cases`. Note that Implementation runs **autonomously** (TDD per task) and may take a while.
   - Artifacts: `test-plan.md`
   - Resume phrase: `"implement <STORY_ID>"` or `"yes"`
   - In afk mode, continue without stopping.

### Stage 3: Implementation (automated, per-task TDD)

1. **Read the dispatch protocol**: Read and follow the `arcus:subagent-task-dispatcher` skill.
2. **Read the model strategy**: Load `arcus:model-strategy` for complexity→model resolution.
3. **Parse tasks** from `.arcus/specs/<STORY_ID>/blueprint.md` (each `### Task N:` heading). If a
   loopback added fix-tasks (see Loopback Protocol), include those too.
4. **For each task** (in order), and only those not already `complete`, follow the Subagent Task
   Dispatcher protocol. Pass: `STORY_ID`, `TASK_N`, `COMPLEXITY` (the task's `complexity`, default
   `medium`), `COMMIT_MESSAGE` = `"Task N: <short description>"`.
   - Mark in-progress: `.arcus/bin/checkpoint.sh set-status <STORY_ID> task_<N> in_progress`.
   - On success: `.arcus/bin/checkpoint.sh complete <STORY_ID> task_<N>`.
5. **GATE C** — Emit the handoff block:
   - `<STAGE>` = `Implementation`, `<NEXT_STAGE>` = `Code Review`
   - Summary: `<N> files changed, <M> tests passing`
   - Resume phrase: `"review <STORY_ID>"` or `"yes"`
   - In afk mode, continue without stopping.

### Stage 4: Code Review (automated, decision gate)

1. **Run the review** — Dispatch the review coordinator. This is the **last quality gate before the PR**:
   it first runs a deterministic tooling gate (typecheck, full test suite, build/startup, secret scan,
   lint/format with autofix) and then fans out to semantic reviewers, anticipating what CI will check.
   - **Prompt**: "Read and follow the `arcus:code-reviewer` skill. Story ID: `<STORY_ID>`. Run the deterministic gate, then review the full branch diff against base. Produce `.arcus/specs/<STORY_ID>/review.md` and end your reply with `VERDICT: approved | changes_requested`."
   - **Description**: "Review: code-reviewer"
   - **Model**: Resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify `review.md` exists. Capture the verdict and counts (`critical`, `warning`, `suggestion`).
   - `.arcus/bin/checkpoint.sh complete <STORY_ID> code_review`.
2. **GATE D** — Decision handoff. Emit a handoff block whose next step depends on the verdict:
   - **approved**: `<NEXT_STAGE>` = `Closure`. Resume phrase: `"close <STORY_ID>"` or `"yes"`.
   - **changes_requested**: list the counts and the critical/warning headlines from `review.md`.
     Offer two choices: reply **"fix"** to loop the findings back into Implementation, or **"no"** to
     pause. Resume phrase: `"fix <STORY_ID>"`.
   - In afk mode: on `approved`, continue to Closure; on `changes_requested`, run the Loopback
     Protocol automatically (bounded by the loopback cap), then re-review.

### Stage 5: Closure (manual trigger, terminal)

1. **Build PR description** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `arcus:pull-request-builder` skill. Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/PR_DESCRIPTION.md`."
   - **Description**: "Closure: pull-request-builder"
   - **Model**: Resolve complexity `light` via the `arcus:model-strategy` skill.
   - Verify the file exists.
2. **Create PR**: Run `.arcus/bin/pr.sh <STORY_ID>`.
3. **Mark complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> closure`.
4. **Output**: `[Complete] PR deployed: <link from pr.sh output>`.

## Loopback Protocol (Code Review → Implementation)

When the user replies "fix" at GATE D (or automatically in afk mode):

1. `.arcus/bin/checkpoint.sh reopen <STORY_ID> code_review` (sets `needs_rework`, bumps `review_round`).
2. Read `.arcus/specs/<STORY_ID>/review.md`. Convert each **critical** and **warning** finding into a
   fix-task. Append them to `blueprint.md` as new `### Task N:` headings (continuing the numbering),
   each with a Definition of Done derived from the finding. Mark each new task
   `.arcus/bin/checkpoint.sh set-status <STORY_ID> task_<N> pending`.
3. Re-enter **Stage 3** for the new fix-tasks only.
4. After the fix-tasks complete, re-run **Stage 4** (Code Review) on the updated diff.
5. **Loopback cap**: stop automatic looping once `review_round` reaches **3**. Beyond that, always
   hand off to the user with the remaining findings, regardless of mode.

## Resumption Protocol

When a checkpoint already exists:

1. Read it with `.arcus/bin/checkpoint.sh read <STORY_ID>` and read the persisted `mode`.
2. Determine the next action from stage status (in order):
   `init` → `context_pack` → `spec_finalizer` → `blueprint` → `test_plan` → `task_1`..`task_N`
   → `code_review` → `closure`.
   - Skip any stage whose status is `complete`.
   - A stage marked `awaiting_handoff` means the pipeline is paused at a gate waiting for the user's
     "yes". If the user's current message is a "yes"/"proceed" (or the matching resume phrase for
     this stage), set it `in_progress` and run it. Otherwise — in **gated** mode — re-emit that
     stage's handoff block and stop; in **afk** mode, run it immediately.
   - A stage marked `in_progress` or `pending` (not behind a gate) is a mid-flight resume: run it.
   - A stage marked `needs_rework` (code_review after a loopback) means re-run Implementation on the
     fix-tasks, then re-review.
3. Read the relevant existing artifacts (assumptions.md, blueprint.md, test-plan.md, review.md) to
   restore context before running the resumed stage.
4. If `clarifications.md` exists, reuse it — never re-ask answered questions.

## Error Handling

- If a helper script fails (non-zero exit): retry once. If it still fails, output
  `[ERROR] <stage>: <reason>` and stop.
- If a stage's required output file is missing after its subagent returns: stop with
  `[ERROR] <stage>: <skill> produced no output`.
- Do NOT advance past a gate or into the next stage if the current stage's required artifacts are missing.
