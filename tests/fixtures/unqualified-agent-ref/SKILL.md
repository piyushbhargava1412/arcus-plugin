---
name: unqualified-agent-ref
description: >
  Planted-bad fixture for L1-14. Dispatches a PURE agent with a bare imperative
  lead-in ("read and follow `arcus:context-pack-builder`") that omits the required
  "agent" qualifier, so the model would look for a non-existent skill folder.
layer: coordinator
---

# Unqualified Agent Ref (planted bad)

## Protocol

1. **Context pack** — read and follow `arcus:context-pack-builder`, passing it the
   `story` and the available `repo_context`. It produces a `context_pack`.

2. **Spec finalization** — read and follow `arcus:spec-finalizer`, passing it the
   `story` and the `context_pack`. (This one is a skill, so the bare form is fine.)
