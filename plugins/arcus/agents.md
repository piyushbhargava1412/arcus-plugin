# ARCUS Agents

This directory holds **agents** — the model-only, isolated-context execution personas of the ARCUS
pipeline. Agents are the second of the two ARCUS *surfaces*:

| Surface | Lives in | Invocation | Examples |
|---------|----------|-----------|----------|
| **Skill** | `plugins/arcus/skills/<name>/SKILL.md` | user **and** model invocable by **bare name** (`arcus-controller`); injected into the main context | `arcus-controller`, `kick-off`, `code-reviewer` |
| **Agent** | `plugins/arcus/agents/<name>.md` (flat file) | model-only; dispatched as an isolated subagent via **Agent Resolution** in `arcus:model-strategy` — never user-facing | `security-reviewer`, `subagent-task-dispatcher`, `context-pack-builder` |

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
Both **Claude Code** and **GitHub Copilot CLI** read it directly and register the agent as
`arcus-plugin:<name>`, enforcing its `tools:` allowlist. VS Code Copilot Chat (`.agent.md`,
`runSubagent`) and OpenCode have equivalent primitives with different dialects; per-surface packaging
validation is a documented follow-up.

```yaml
---
name: <kebab-case>            # REQUIRED — must equal the file basename (no .md)
description: >               # REQUIRED — what it does + "use when …" dispatch guidance.
  <one or two sentences>.    #            Pure agents carry NO user trigger phrases.
  Dispatched by <caller>.
layer: capability            # REQUIRED — role axis: capability | coordinator | orchestrator | substrate
user-invocable: false        # agents are never user-facing (this flag is the machine-readable source of truth)
                             # NEVER add `disable-model-invocation` — see Field rules below
tools: Read, Grep, Glob      # REQUIRED allowlist — the only restriction hosts enforce.
                             #   Add Bash ONLY if the agent truly needs a shell: it grants an
                             #   indirect write, and it suppresses Grep/Glob on Claude Code
                             #   (but NOT on Copilot CLI — so keep Grep/Glob declared anyway).
disallowedTools: Edit, Write, MultiEdit  # camelCase ONLY — Claude Code ignores the kebab spelling
model: sonnet                # tier word (opus | sonnet | haiku) or `inherit` — NEVER a versioned
                             #   model string (resolve tiers via arcus:model-strategy)
color: cyan                  # OPTIONAL UI hint
---
```

### What each field is load-bearing for

Measured 2026-07-29 unless marked inferred. "CI" means the repo's own test harness, which is the
only consumer for fields no host reads.

| Field | Claude Code | Copilot CLI | OpenCode | CI |
| --- | --- | --- | --- | --- |
| `name` | registers `arcus-plugin:<name>` | registers `arcus-plugin:<name>` | flat `<name>` | L1-13 basename match |
| `description` | dispatch routing | dispatch routing | dispatch routing | L1-13 (present, ≤1024) |
| `layer` | inert | inert | inert | **L1-5, L1-6, L1-12** |
| `user-invocable` | inert | inert | → `hidden: true` | **L4-1 roster** |
| `tools` | **enforced** | **enforced** | → `permission:` | **L1-4** |
| `disallowedTools` | **enforced** | inferred inert | → `permission: deny` | **L1-4** |
| `disallowed-tools` | **silently ignored** | inferred inert | read as fallback | **L1-4 rejects** |
| `disable-model-invocation` | ignored on agents | **drops from registry** | inferred inert | **L1-13 rejects** |
| `model` | tier word honoured | **does not resolve tier words** — warns visibly and falls back; a valid slug is honoured | mapped to a model id | L1-10 |
| `color` | UI hint | inert | mapped to hex | — |

Two fields to read carefully. `layer` is **inert on every host** yet drives four CI gates — it is
not decoration. `disable-model-invocation` is the mirror image: no CI gate wanted it, and it silently
disabled the plugin on a host. A field being ignored by your host says nothing about whether it
matters.

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
  model id; tier→model resolution is owned solely by `arcus:model-strategy`. Note: Copilot CLI
  does not resolve tier words in frontmatter — it warns visibly and falls back; tier selection
  there must be passed as a slug at dispatch (see `arcus:model-strategy` § Tier-to-Platform).
- **`disable-model-invocation`** — **never set it.** Orchestrated dispatch *is* model invocation, so
  the flag cannot mean "orchestrator-only". Measured: Copilot CLI honours it on **both** agents and
  skills by dropping the item from its registry (the agent then loses host-enforced `tools:`); Claude
  Code ignores it on agents but honours it on skills. `user-invocable: false` already carries the
  "not user-facing" intent. Rejected by `checkAgentFrontmatter` (L1-13).
- **`tools`** — the allowlist, and the **only** restriction hosts actually enforce. Measured
  2026-07-29: `Read, Grep, Glob` yields exactly those three on Claude Code and
  `view, grep, glob` on Copilot CLI (where `skill` and `sql` are auto-granted, yielding
  `view, grep, glob, skill, sql` total). Adding `Bash` to that list causes Claude Code to drop
  `Grep`/`Glob`, so the shorter list is also the more capable one there.
- **`Skill` must be in `tools:` if the body tells the agent to consult a skill.** The allowlist
  omits it by default, and the failure is silent: measured on Copilot CLI, `tools: Read, Skill`
  yields `view, skill` and loads the skill; `tools: Read, Grep, Glob` yields `view, grep, glob` and
  the agent reports it has no way to load one — then answers anyway from whatever is already in its
  prompt. Enforced by `checkSkillLoadCapability` (L1-17), which distinguishes a consult
  ("the heuristics **in** the `arcus:model-strategy` **skill**") from provenance prose
  ("runs as part of the `arcus:code-reviewer` fan-out") and only requires the tool for the former.
  On Copilot CLI, `skill` (and `sql`) are auto-granted regardless of the allowlist, but gate L1-17
  enforces the requirement for Claude Code and route-2 correctness.
- **`disallowedTools`** — **camelCase only.** Claude Code honours `disallowedTools` and silently
  ignores kebab-case `disallowed-tools`, which ARCUS used for its entire history — so the denylist
  never fired. It is defence-in-depth; never rely on it alone.
- **A denylist cannot make an agent read-only if the allowlist contains `Bash`.** Measured: an agent
  with no `Write` tool created a file with `printf x > f`. Same for a dispatch tool (`Task`/`Agent`),
  which can spawn a writer. Enforced by `checkAdvisoryReadOnly` via `INDIRECT_WRITE_TOOLS`; the one
  documented exception is `history-context-reviewer`, whose `git log`/`git blame` archaeology is
  irreducibly shell-shaped and whose read-only-ness is therefore trusted, not enforced.
- **Advisory reviewers** (`security-reviewer`, `performance-reviewer`, `code-quality-reviewer`,
  `history-context-reviewer`, `spec-compliance-reviewer`) additionally require
  `user-invocable: false`, a `tools:` allowlist naming no write-capable tool, and
  `disallowedTools ⊇ [Edit, Write, MultiEdit]` (enforced by `checkAdvisoryReadOnly`).

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

Pure agents (13): `subagent-task-dispatcher`, `spec-compliance-reviewer`, `code-quality-reviewer`,
`security-reviewer`, `performance-reviewer`, `history-context-reviewer`, `review-consolidator`,
`simplify-and-verify`, `context-pack-builder`, `repo-overview-discovery`, `flow-discovery`,
`test-pattern-discovery`, `design-pattern-discovery`.

Execution agents behind a thin skill wrapper (3): `test-spec-compiler`, `pull-request-builder`,
`context-drift-sync` (each has a `skills/<name>/SKILL.md` wrapper that owns the user trigger and
dispatches here).
