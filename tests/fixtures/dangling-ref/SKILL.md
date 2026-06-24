---
name: dangling-ref
description: >
  A planted violation fixture: references a non-existent skill.
layer: capability
---

# Dangling Reference (Planted Violation)

This fixture simulates a capability that references a non-existent skill.

## Workflow

1. First, call the `arcus:spec-finalizer` skill to finalize the spec.
2. Then invoke `arcus:does-not-exist-skill` to process the output.
3. Finally, use `arcus:another-missing-skill` for validation.

This should fail the L1-7 checkCrossRefs check because it references non-existent skills.
