---
name: solution-architect
description: >
  The gated planning driver for ARCUS. Chains the brainstorming sub-stages in the
  MAIN THREAD — scaffold → context-pack → spec-finalizer (dialogue) → implementation-planner
  (dialogue) — talking to the user at each interview, then hands off to the Test Plan.
  Independently invocable. Activates on "architect <STORY>" or "plan <STORY>" or "brainstorm <STORY>".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - orchestrator
    - protocol
---

# Solution Architect (Gated Planning Driver)

## Overview

This skill is the **gated entry point for planning** a story. It drives the ARCUS Brainstorm
work as a sequence of sub-stages **in the main thread** — scaffolding the workspace, building a
context pack, finalizing the spec through a dialogue, and planning the implementation through a
dialogue — then stops at a handoff gate before the Test Plan.

It mirrors the Init + Brainstorm stages of the afk `arcus:arcus-controller`, but for the gated
flow: where the controller runs spec-finalizer/implementation-planner one-shot inside subagents,
the solution-architect runs them **in dialogue mode in the main thread** so they can interview
the user directly.

> **Constraint — this skill MUST NOT declare `context: fork` or an `agent:` block.** It runs in
> the **main thread** because it must talk to the user (the spec-finalizer and implementation-planner
> dialogues ask interview questions and incorporate the answers). A forked/isolated subagent cannot
> hold a conversation with the user, so forking this skill would break the gated dialogue.

## Helper Scripts

Call these via shell for all deterministic scaffold/state operations — never reason about branch
names or checkpoint JSON by hand. Resolve the script directory in this order and use the **first
that exists**: `.arcus/bin/` (preferred, staged by the plugin) → `$ARCUS_HOME/scripts/` (read
`ARCUS_HOME` from `.arcus/env`). This is the same resolution rule the `arcus:arcus-controller`
and `arcus:implementation-runner` use.

| Script | Usage | Purpose |
|--------|-------|---------|
| `scaffold.sh <STORY_FILE>` | Creates `.arcus/specs/<STORY_ID>/` + `story.md` + checkpoint init | Workspace scaffold; checkpoint init with **PLANNED** branch fields, **NO git branch** |
| `checkpoint.sh <action> <STORY_ID> [args]` | Manage state | complete / set-status / read |

Checkpoint stage keys (ordered): `scaffold` → `context_pack` → `spec_finalizer` → `blueprint`
→ `test_plan` → `branch` → `task_1`..`task_N` → `code_review` → `closure`.
Stage status values: `pending | in_progress | awaiting_handoff | complete | needs_rework`.

The branch is **only planned** here (scaffold records the planned `branch_name`/`base_branch`); it
is realized later by `arcus:implementation-runner` at the Implementation stage (deferred-branch
design). This skill creates **no** git branch.

## Protocol

### Step 1: Resolve the script directory

Resolve `<BIN>` = `.arcus/bin/` if it exists, else `$ARCUS_HOME/scripts/` (read `ARCUS_HOME` from
`.arcus/env`). All script invocations below use this `<BIN>` prefix.

### Step 2: Scaffold (deterministic)

Run `<BIN>/scaffold.sh <STORY_FILE>`. This creates `.arcus/specs/<STORY_ID>/`, copies the story to
`story.md`, and initializes the session checkpoint with the **PLANNED** `branch_name`/`base_branch`
(it creates **NO** git branch). Capture `STORY_ID` from its output.

Then mark the scaffold stage complete: `<BIN>/checkpoint.sh complete <STORY_ID> scaffold`.

> On a resume, if a checkpoint already exists, skip re-scaffolding and continue from the first
> incomplete stage below.

### Step 3: Context pack

Read and follow the `arcus:context-pack-builder` skill for `<STORY_ID>` to produce
`.arcus/specs/<STORY_ID>/context-pack.md`. (It may run as a one-shot subagent or inline — the
context pack needs no user dialogue.) Verify the file exists, then
`<BIN>/checkpoint.sh complete <STORY_ID> context_pack`.

### Step 4: Spec finalization — DIALOGUE, main thread

Read and follow the `arcus:spec-finalizer` skill **in dialogue mode IN THE MAIN THREAD** — NOT as a
subagent, because it must talk to the user. It auto-resolves what it can, then interviews the user
**one question at a time** about the `zero-option` / low-confidence items, and writes its owned
requirements sections of `.arcus/specs/<STORY_ID>/plan.md` (including the `## Dialogue Answers`
section). Verify `plan.md` exists, then `<BIN>/checkpoint.sh complete <STORY_ID> spec_finalizer`.

### Step 5: Implementation planning — DIALOGUE, main thread

Read and follow the `arcus:implementation-planner` skill **in dialogue mode in the main thread**. It
scores ≥2 candidate approaches, interviews the user on the design decision, appends its owned design
sections to `.arcus/specs/<STORY_ID>/plan.md`, and writes `.arcus/specs/<STORY_ID>/blueprint.md`.
Verify `blueprint.md` exists, then `<BIN>/checkpoint.sh complete <STORY_ID> blueprint`.

### Step 6: HARD REQUIREMENT — every interview question carries a recommendation

When invoking `arcus:spec-finalizer` and `arcus:implementation-planner` in dialogue mode, the
solution-architect **REQUIRES** that every interview question presented to the user marks **EXACTLY
ONE** option **Recommended** with a **one-line rationale**, **AND** offers an explicit custom-answer
option ("or provide your own"). The driver **must not** let a dialogue sub-skill ask a bare question
without a recommendation. If a sub-skill would surface a bare question, re-frame it to carry the
recommended option + rationale + custom-answer before presenting it to the user. Expected shape:

```
Q: <the gap / design decision, phrased as a question>
  A — <option A> (Recommended) — <one-line rationale for why A is recommended>
  B — <option B>
  C — <option C>
  Or provide your own answer.
```

### Step 7: Handoff Protocol

See the section below. On completion (scaffold, context_pack, spec_finalizer, and blueprint all
complete), emit the handoff gate and stop.

## Handoff Protocol

This skill marks **its own** checkpoint keys complete as it finishes each sub-stage (`scaffold`,
`context_pack`, `spec_finalizer`, `blueprint`). On completion it names **only its immediate
successor** — the Test Plan. It does **NOT** enumerate the full pipeline; that lives only in the afk
`arcus:arcus-controller`.

- **Successor**: Test Plan — skill `arcus:test-spec-compiler`, resume phrase
  `"generate test plan for <STORY_ID>"`.
- **Same-session continuation**: on a `"yes"` / `"proceed"`, load and follow
  `arcus:test-spec-compiler` directly.
- **Cold resume** (new session): the user types `"generate test plan for <STORY_ID>"`, which
  re-activates the Test Plan by description-matching + the checkpoint (next incomplete stage =
  `test_plan`).

Emit exactly this shape:

```
[Handoff] Planning complete → next: Test Plan
Summary: <N tasks, M decisions>
Artifacts: .arcus/specs/<STORY_ID>/context-pack.md, plan.md, blueprint.md
Proceed? Reply "yes" to run Test Plan, or "no" to pause.
Resume later with: "generate test plan for <STORY_ID>"
```

## Success Criteria

- The workspace is scaffolded via `scaffold.sh` (folder + `story.md` + checkpoint init with planned
  branch fields, **no** git branch), and `scaffold` is marked complete.
- `context-pack.md`, `plan.md`, and `blueprint.md` are produced, with `context_pack`,
  `spec_finalizer`, and `blueprint` marked complete in order.
- spec-finalizer and implementation-planner ran in **dialogue mode in the main thread**, and every
  interview question presented a single **Recommended** option + rationale + custom-answer.
- The Handoff block names only the Test Plan and gives the cold-resume phrase
  `"generate test plan for <STORY_ID>"`.
