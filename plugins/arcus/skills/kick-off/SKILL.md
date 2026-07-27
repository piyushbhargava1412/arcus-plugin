---
name: kick-off
description: >
  The brainstorm coordinator for ARCUS — a thin, stateless two-step sequencer: context-pack-builder
  → spec-finalizer. It builds a context pack for a story and finalizes/grounds the spec, then stops.
  Standalone entry point for planning. Activates on
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

Neither step converses with the user, so **both are dispatched as isolated subagents** and kick-off
itself makes no mode-dependent decisions. `arcus:spec-finalizer` records the decisions it was least
confident about in the `## Open Questions` section of the `spec_grounding` it writes; surfacing those
to a human is the **caller's** job, not kick-off's.

## Protocol

1. **Context pack** — dispatch the `arcus:context-pack-builder` **agent**, passing it the `story` and
   the available `repo_context`. It produces a `context_pack` describing the story-relevant slice of
   the repository.

2. **Spec finalization** — dispatch `arcus:spec-finalizer`, passing it the `story`, the `context_pack`
   from step 1, and — when the caller supplied one — the `answers` input carrying a user reply to a
   previously emitted `## Open Questions` block. It analyzes the story for completeness and resolves
   every ambiguity, producing a `spec_grounding`.

After step 2 completes, kick-off stops and returns its outputs, along with the
`OPEN_QUESTIONS: <n>|none` token `arcus:spec-finalizer` returned.

## Handoff

On completion kick-off has produced a `context_pack` and a `spec_grounding`. When run **standalone**,
tell the user briefly what was produced and how to proceed — and if the `spec_grounding`'s
`## Open Questions` is non-empty, show those questions so the user can answer them and re-run.
Otherwise point at the next step: plan the implementation via `arcus:implementation-planner`, or run
the full pipeline (`implement <STORY>` for interactive, `forge <STORY>` for autonomous). When invoked
by an orchestrator, simply return the `context_pack` + `spec_grounding` to the caller.
