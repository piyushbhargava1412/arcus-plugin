---
name: context-drift-sync
description: Run a standalone full sweep over the shared `.context/` snapshot — assess which artifacts have drifted from their last-verified commit and surgically sync only those. Trigger on "sync context". (To resume the in-pipeline Context Sync stage of a story, use the arcus-controller, not this skill.)
layer: coordinator
standalone: true
---

# Context Drift Sync (thin wrapper)

The **ad-hoc entry point** for a full `.context/` sweep. The drift assessment and surgical sync live
in the **`context-drift-sync` agent** (`plugins/arcus/agents/context-drift-sync.md`).

> **Dispatching an ARCUS agent.** Agents live at `$ARCUS_HOME/agents/<name>.md` and always run as
> isolated subagents. Use the **first** that your host offers: (1) a **registered subagent type**
> ending in `<name>` — Claude Code and GitHub Copilot CLI both expose these as `arcus-plugin:<name>`,
> and the host then enforces the agent's `tools:` frontmatter; (2) otherwise a **generic subagent**
> whose prompt opens *"Read and follow the agent spec at `$ARCUS_HOME/agents/<name>.md`"*, on hosts
> with no registry — there the tool restrictions are only advisory. Never address an agent as
> `arcus:<name>`; that is a docs token no host resolves. Full rule: `model-strategy` § Agent Resolution.

## Behaviour

Dispatch the `context-drift-sync` agent (resolve the dispatch target per **Agent Resolution** in `arcus:model-strategy`) with `sync_scope=full-sweep`, `apply_mode=confirm`,
`commit_label=context`, and relay its assessment. No checkpoint, no handoff.
