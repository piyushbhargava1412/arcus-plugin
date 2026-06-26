---
name: context-drift-sync
description: Run a standalone full sweep over the shared `.context/` snapshot — assess which artifacts have drifted from their last-verified commit and surgically sync only those. Trigger on "sync context". (To resume the in-pipeline Context Sync stage of a story, use the arcus-controller, not this skill.)
layer: coordinator
standalone: true
---

# Context Drift Sync (thin wrapper)

The **ad-hoc entry point** for a full `.context/` sweep. The drift assessment and surgical sync live
in the **`context-drift-sync` agent** (`plugins/arcus/agents/context-drift-sync.md`).

## Behaviour

Dispatch the `arcus:context-drift-sync` agent with `sync_scope=full-sweep`, `apply_mode=confirm`,
`commit_label=context`, and relay its assessment. No checkpoint, no handoff.
