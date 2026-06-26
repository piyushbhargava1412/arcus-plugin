---
name: kick-off
description: >
  The brainstorm coordinator for ARCUS — a thin, stateless two-step sequencer: context-pack-builder
  → spec-finalizer. It builds a context pack for a story and finalizes/grounds the spec (in dialogue
  or autonomous mode), then stops. Standalone entry point for planning. Activates on
  "brainstorm <STORY>", "kick off <STORY>", or "architect <STORY>".
layer: coordinator
standalone: true
argument-hint: <STORY>
---

# Kick-off (Brainstorm Coordinator)

## Overview

kick-off is a **thin, stateless two-step brainstorm coordinator**. It sequences exactly two
capabilities — the `arcus:context-pack-builder` **agent** then the `arcus:spec-finalizer` skill —
and then stops. Its only products are a `context_pack` and a `spec_grounding`.

When in `dialogue` mode, kick-off runs **in the MAIN THREAD** so `arcus:spec-finalizer` can
interview the user directly (a forked/isolated subagent cannot hold a conversation with the user).

> **Constraint — this skill MUST NOT declare `context: fork`.** It must be able to run in the main
> thread to conduct the spec-finalizer dialogue. Forking it would break the interview.

## Protocol

1. **Context pack** — dispatch the `arcus:context-pack-builder` **agent**, passing it the `story` and
   the available `repo_context`. It produces a `context_pack` describing the story-relevant slice of
   the repository. No user dialogue is needed for this step.

2. **Spec finalization** — read and follow `arcus:spec-finalizer`, passing it the `story`, the
   `context_pack` from step 1, and the `mode`. It analyzes the story for completeness and resolves
   ambiguities, producing a `spec_grounding` (in `dialogue` mode it interviews the user; in
   `autonomous` mode it auto-resolves — see `arcus:spec-finalizer`).

After step 2 completes, kick-off stops and returns its outputs.

## Mode

kick-off receives `mode: dialogue | autonomous` and passes it **through** to `arcus:spec-finalizer`
unchanged. kick-off itself makes no mode-dependent decisions beyond this pass-through.

- When invoked **standalone by a human**, default `mode` to `dialogue`.
- When invoked by an orchestrator, use the `mode` the orchestrator passes
  (interactive → `dialogue`, autonomous → `autonomous`).

## Handoff

On completion kick-off has produced a `context_pack` and a `spec_grounding`. When run **standalone**,
tell the user briefly what was produced and how to proceed — e.g. plan the implementation via
`arcus:implementation-planner`, or run the full pipeline (`implement <STORY>` for interactive,
`forge <STORY>` for autonomous). When invoked by an orchestrator, simply return the
`context_pack` + `spec_grounding` to the caller.
