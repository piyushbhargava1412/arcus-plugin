---
name: kick-off
description: >
  The brainstorm coordinator for ARCUS — a thin, stateless two-step sequencer: context-pack-builder
  → spec-finalizer. It builds a context pack for a story and finalizes/grounds the spec (in dialogue
  or autonomous mode), then stops. It does NOT scaffold the workspace, touch the checkpoint, create a
  branch, or plan the implementation — those belong to the orchestrator and to implementation-planner.
  Standalone entry point for planning. Activates on "brainstorm <STORY>", "kick off <STORY>", or
  "architect <STORY>".
layer: coordinator
standalone: true
argument-hint: <STORY>
---

# Kick-off (Brainstorm Coordinator)

## Overview

kick-off is a **thin, stateless two-step brainstorm coordinator**. It sequences exactly two
capabilities — `arcus:context-pack-builder` then `arcus:spec-finalizer` — and then stops. Its only
products are a `context_pack` and a `spec_grounding`.

It is deliberately **narrower** than a full planning driver. kick-off does **NOT**:

- scaffold the workspace (that belongs to the orchestrator),
- touch / init / read / advance the checkpoint (no owned state — the orchestrator owns it),
- create a git branch (deferred-branch design; the orchestrator / implementation-runner owns it),
- run `arcus:implementation-planner` (that is a **separate** stage, not part of brainstorm).

When in `dialogue` mode, kick-off runs **in the MAIN THREAD** so `arcus:spec-finalizer` can
interview the user directly (a forked/isolated subagent cannot hold a conversation with the user).

> **Constraint — this skill MUST NOT declare `context: fork`.** It must be able to run in the main
> thread to conduct the spec-finalizer dialogue. Forking it would break the interview.

## Protocol

1. **Context pack** — read and follow `arcus:context-pack-builder`, passing it the `story` and the
   available `repo_context`. It produces a `context_pack` describing the story-relevant slice of the
   repository. No user dialogue is needed for this step.

2. **Spec finalization** — read and follow `arcus:spec-finalizer`, passing it the `story`, the
   `context_pack` from step 1, and the `mode`. It analyzes the story for completeness and resolves
   ambiguities, producing a `spec_grounding`.
   - In **`dialogue`** mode it interviews the user **one question at a time**. Every interview
     question MUST carry **exactly one Recommended** option with a **one-line rationale**, plus an
     explicit custom-answer option ("or provide your own"). Expected shape:

     ```
     Q: <the gap, phrased as a question>
       A — <option A> (Recommended) — <one-line rationale for why A is recommended>
       B — <option B>
       C — <option C>
       Or provide your own answer.
     ```
   - In **`autonomous`** mode it asks no questions and auto-resolves every ambiguity from the
     grounded options.

After step 2 completes, kick-off stops. It does not advance to implementation planning.

## Mode

kick-off receives `mode: dialogue | autonomous` and passes it **through** to `arcus:spec-finalizer`
unchanged. kick-off itself makes no mode-dependent decisions beyond this pass-through.

- When invoked **standalone by a human**, default `mode` to `dialogue`.
- When invoked by an orchestrator, use the `mode` the orchestrator passes
  (interactive → `dialogue`, autonomous → `autonomous`).

## Layer Rules

> Layer: **coordinator** — a stateless sequencer of capabilities. It owns **no** state.

- **Owned state**: **none**. kick-off holds no checkpoint, no branch, and no path resolution. All
  state and path resolution belong to the orchestrator, which passes kick-off explicit domain
  inputs and receives explicit domain outputs.
- **Sequences**: `arcus:context-pack-builder` → `arcus:spec-finalizer`, passing each its explicit
  inputs (`story`, `repo_context` to the builder; `story`, `context_pack`, `mode` to the finalizer).
- **Explicitly NOT its responsibility**: scaffold, checkpoint, branch, and
  `arcus:implementation-planner`. Scaffold and the checkpoint belong to the orchestrator; the branch
  is deferred to implementation; implementation planning is a separate downstream stage.
- **Domain inputs/outputs only**: kick-off refers to artifacts by domain name (`story`,
  `repo_context`, `context_pack`, `spec_grounding`). It does not resolve or name framework artifact
  paths — the orchestrator does that.

## Handoff

On completion kick-off has produced a `context_pack` and a `spec_grounding`. When run **standalone**,
tell the user briefly what was produced and how to proceed — e.g. plan the implementation via
`arcus:implementation-planner`, or run the full pipeline (`implement <STORY>` for interactive,
`forge <STORY>` for autonomous). When invoked by an orchestrator, simply return the
`context_pack` + `spec_grounding` to the caller.
