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

Both steps are **generic one-shot subagents** whose *prompt* names the capability to follow. Do
**not** try to invoke `context-pack-builder` or `spec-finalizer` as a named skill/tool — the first is
an agent with no skill surface, and neither is addressable that way. Spawn a subagent and let the
prompt do the routing, exactly as `arcus:arcus-controller` does for every other stage.

1. **Context pack** — dispatch a one-shot subagent:
   - **Prompt**: "Read and follow the `arcus:context-pack-builder` agent. Story: `<STORY>`. Repo context: `<repo_context>`. Write the context pack to `<context_pack_path>`."
   - **Description**: "Brainstorm: context-pack-builder"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - It produces a `context_pack` describing the story-relevant slice of the repository.

2. **Spec finalization** — dispatch a one-shot subagent:
   - **Prompt**: "Read and follow the `arcus:spec-finalizer` skill. Story: `<STORY>`. Context pack: `<context_pack_path>`. Write the grounded spec to `<spec_grounding_path>`." — appending, only when the caller supplied one, "The user has answered the previously emitted Open Questions; `answers`: `<answers>`."
   - **Description**: "Brainstorm: spec-finalizer"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - It analyzes the story for completeness and resolves every ambiguity, producing a `spec_grounding`.

After step 2 completes, kick-off stops and returns its outputs, along with the
`OPEN_QUESTIONS: <n>|none` token `arcus:spec-finalizer` returned.

## Handoff

On completion kick-off has produced a `context_pack` and a `spec_grounding`. When run **standalone**,
tell the user briefly what was produced and how to proceed — and if the `spec_grounding`'s
`## Open Questions` is non-empty, show those questions so the user can answer them and re-run.
Otherwise point at the next step: plan the implementation via `arcus:implementation-planner`, or run
the full pipeline (`implement <STORY>` for interactive, `forge <STORY>` for autonomous). When invoked
by an orchestrator, simply return the `context_pack` + `spec_grounding` to the caller.
