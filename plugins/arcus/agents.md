# ARCUS Agents

This directory holds **agents** — the model-only, isolated-context execution personas of the ARCUS
pipeline. Agents are the second of the two ARCUS *surfaces*:

| Surface | Lives in | Invocation | Slash command | Examples |
|---------|----------|-----------|---------------|----------|
| **Skill** | `plugins/arcus/skills/<name>/SKILL.md` | user **and** model invocable; injected into the main context | `/arcus:<name>` | `arcus-controller`, `kick-off`, `code-reviewer` |
| **Agent** | `plugins/arcus/agents/<name>.md` (flat file) | model-only; dispatched **by name** from a skill/orchestrator, or auto-delegated via `description` | none (never user-facing) | `security-reviewer`, `subagent-task-dispatcher`, `context-pack-builder` |

> **Two orthogonal axes.** *Surface* (skill vs agent — this directory split) is independent of
> *role* (`layer:` — `orchestrator` / `coordinator` / `capability` / `substrate`). An orchestrator
> can be a skill (`arcus-controller`, `implementation-runner`) **or** an agent
> (`subagent-task-dispatcher`). The `layer:` field therefore **survives on agents** and continues to
> gate the static invariants (capability-no-state, no-inlined-domain).

## When is something an Agent?

An item is an **AGENT** if **all** of these hold (the litmus test from ARC-0008):

1. No human would ever type a trigger phrase for it.
2. It already runs as an isolated/dispatched subagent.
3. It needs no main-thread user dialogue.

It is a **SKILL** if **any** hold: it is a user-facing entry point, OR it needs main-thread
dialogue/gates, OR it is a stateful driver that owns the user conversation.

## Canonical frontmatter

Agent files use the **Claude Code native `agents/` frontmatter** as the canonical source of truth.
(Copilot CLI `.agent`/`runSubagent` and VS Code `.agent.md` each have an equivalent agent primitive;
per-surface packaging validation is a documented follow-up — the Claude Code dialect is authored here
as canonical.)

```yaml
---
name: <kebab-case>            # REQUIRED — must equal the file basename (no .md)
description: >               # REQUIRED — what it does + "use when …" dispatch guidance.
  <one or two sentences>.    #            Pure agents carry NO user trigger phrases.
  Dispatched by <caller>.
layer: capability            # REQUIRED — role axis: capability | coordinator | orchestrator | substrate
user-invocable: false        # agents are never user-facing (this flag is the machine-readable source of truth)
disable-model-invocation: true
tools: Read, Grep, Glob, Bash    # OPTIONAL allowlist of tools the agent may use
disallowed-tools: Edit, Write, MultiEdit   # advisory/read-only agents MUST disallow these
model: sonnet                # tier word (opus | sonnet | haiku) or `inherit` — NEVER a versioned
                             #   model string (resolve tiers via arcus:model-strategy)
color: cyan                  # OPTIONAL UI hint
---
```

### Field rules

- **`name`** — lowercase kebab-case, equal to the file basename, no reserved words (`claude`,
  `anthropic`). Enforced by `checkAgentFrontmatter` (test harness).
- **`description`** — ≤ 1024 chars. For **pure agents**, do **not** include `Trigger on "…"` user
  phrases (those would route a user phrase to a non-user-facing agent). Describe *when a
  skill/orchestrator should dispatch it* (e.g. `Dispatched by arcus:<caller>`). Do **not** restate
  "not invoked directly by users" — the `user-invocable: false` flag is the machine-readable source of
  truth for that; keep the prose focused on the *use-when / dispatch* signal.
- **`layer`** — one of `capability | coordinator | orchestrator | substrate`. Capability agents must
  remain state-free (no checkpoint/branch ops) and own a Layer-2 eval spec
  (`tests/e2e/evals/specs/<name>/evals.json`).
- **`model`** — a **tier word** (`opus`/`sonnet`/`haiku`) or `inherit`. Never hardcode a versioned
  model id; tier→model resolution is owned solely by `arcus:model-strategy`.
- **Advisory reviewers** (`security-reviewer`, `performance-reviewer`, `code-quality-reviewer`,
  `history-context-reviewer`, `spec-compliance-reviewer`) additionally require
  `user-invocable: false`, `disable-model-invocation: true`, and `disallowed-tools ⊇
  [Edit, Write, MultiEdit]` (enforced by `checkAdvisoryReadOnly`).

## Body authoring

Agent and skill **bodies** follow the prompt-authoring standard in
[`authoring-style.md`](authoring-style.md): reference a callee's contract never its internals, say
each thing once, and cut prose that does not change what the model does.

## Dispatch convention

Agents are referenced from skill/agent bodies by the `arcus:<name>` token, exactly as skills are.
The test harness resolves every `arcus:<name>` reference against the **union** of skill directory
names and agent file basenames (`walkAll()` in `tests/lib/skills.mjs`), so an agent reference is a
first-class, validated cross-reference.

## Roster

Pure agents (9): `subagent-task-dispatcher`, `spec-compliance-reviewer`, `code-quality-reviewer`,
`security-reviewer`, `performance-reviewer`, `history-context-reviewer`, `review-consolidator`,
`simplify-and-verify`, `context-pack-builder`.

Execution agents behind a thin skill wrapper (3): `test-spec-compiler`, `pull-request-builder`,
`context-drift-sync` (each has a `skills/<name>/SKILL.md` wrapper that owns the user trigger and
dispatches here).
