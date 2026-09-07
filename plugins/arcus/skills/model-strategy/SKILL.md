---
name: model-strategy
description: >
  Shared reference for complexity classification and complexity-to-model resolution used by
  all ARCUS skills. Loaded by name (the `arcus:model-strategy` skill) when an
  orchestrator or sub-skill needs to classify work as `heavy`/`medium`/`light` and turn that
  classification into a dispatch decision via the `models.mjs` resolver. Not invoked directly by users.
layer: substrate
standalone: false
user-invocable: false
---

# Model-Tiered Strategy

Single source of truth for complexity classification across all AFK skills. Classification is the
part a model does; the complexity-to-model data is **not in this file** — `.arcus/bin/models.mjs`
owns the tier words, the per-host bindings and every override.

## Complexity Levels

| Level | Description |
| --- | --- |
| heavy | Deep reasoning, multi-file coordination, new patterns, ambiguity resolution |
| medium | Standard implementation, moderate reasoning, pattern-following |
| light | Simple changes, template filling, single-file edits following existing patterns |

**Default**: a task or test case missing the `complexity` field is treated as `medium`. Overriding a
whole run (e.g. "all one model for a quality sprint") is a **policy** change — see *Configuring model
policy* — never an edit to this skill.

## Dispatch Requirement (MUST)

Run the resolver, then do **exactly** what it returns. This is not optional prose — it is a
checkpoint every dispatch call must pass before it is sent.

Before sending **any** subagent/agent dispatch call, on whichever dispatch mechanism your host
provides:

1. Classify the work's complexity (`heavy` / `medium` / `light`) per **Complexity Levels** and
   **Classification Guardrails**, or read it off **Static Stage Assignments** if it is a fixed
   orchestrator-level stage.
2. Run the resolver **in this turn**, for this dispatch:

   ```bash
   node .arcus/bin/models.mjs resolve --complexity <heavy|medium|light> [--stage <agent-name>] \
        --checkpoint .arcus/specs/<STORY_ID>/session-checkpoint.json
   ```

3. Branch on the **shape** of the JSON it prints — never on `mode`, which is provenance only:

   | Signal in the JSON | What the caller does |
   | --- | --- |
   | `"dispatch": false` | Send the dispatch with **no model parameter at all** |
   | `"model"` present | Use that string **verbatim** as the model parameter |
   | `"models"` present | Pick the key for the host you are running on; use that value **verbatim** |

   If `"models"` carries no key for your host: **warn and omit the model parameter.** At this layer
   omitting is the conservative act — the session model is a known quantity — and reaching for a
   neighbouring column is a guess.

4. If effort is also relevant (review specialists, time-sensitive stages), resolve and set it too
   per **Effort Resolution** in the same pass.

**The failure mode this section names is *guessing*.** Recalling an identifier from memory, reusing
one you saw earlier in the session or in another file, adapting one you "know" is current, or
skipping step 2 because the answer looks obvious — each produces a string with no provenance, which
either fails loudly on an unknown id or, worse, silently bills a run to a model nobody chose. A
dispatch whose model parameter did not come out of this turn's resolver run is malformed and must
not be sent. If you catch yourself about to fill it in from memory "just this once," that is the
failure mode this section names — stop and run the resolver first.

## Host Dispatch Mechanics

Where the resolved value goes, and what **shape** each host's identifiers take. These are formats,
never values — every value comes from the resolver:

| Host | Where the value goes | Identifier format |
| --- | --- | --- |
| Copilot CLI | `model` on the `task` tool (which also takes `reasoning_effort` / `context_tier`) | `<model-slug>` |
| VS Code | the model argument to `runSubagent` | `"<Model Name> (<vendor>)"` |
| Claude Code | `model` on `Agent` | `<tier-word>` |
| OpenCode | no per-dispatch parameter — pinned per agent in `model:` frontmatter at build time | `<provider>/<model-id>` |

Copilot CLI is the one host where the parameter is **mandatory whenever the resolver returns a
value**: it does not resolve tier words, it warns visibly and falls back. Copilot CLI and VS Code are
different surfaces with different identifier formats — do not treat them as one key. On OpenCode an
inheriting policy omits the frontmatter line entirely rather than emitting a placeholder. Full
per-host mechanics live in [Running Across Hosts](/concepts/cross-host).

## Configuring model policy

The policy is data, not prose, and out of the box it **inherits**: every dispatch runs on the
session's own model and `resolve` answers `"dispatch": false`. To tier a run, spell out the tiers
you want (host↔model mapping is entirely user-supplied — there is no built-in preset); to force one
model across a sprint, set a flat policy.

`.arcus/bin/models.mjs` reads two places, highest first: the `model_policy` frozen into the story's
session checkpoint at scaffold time (which pins a story to one policy for its whole run), then the
`models` block of `.arcus/config.json`, then the inherit default. There are deliberately no env-var
overrides and no `--model` flag. If a mid-story `.arcus/config.json` edit disagrees with the frozen
policy, the resolver warns and the **frozen policy still wins** — adopt the new one with
`checkpoint.sh set-model-policy`. Inspect what actually applies:

```bash
node .arcus/bin/models.mjs show
```

`show` prints the effective mode, its source, the bindings, and — per host — how to discover the
identifiers that host accepts. That discovery step is why no model-version table needs to live here.
A policy change takes effect on the next dispatch: no plan regeneration, no edit to this skill.

## Effort Resolution

Portable effort values (`low`/`medium`/`high`) for review specialists and time-sensitive stages, resolved to each host's mechanism:

| Effort | Resolution |
| --- | --- |
| low | **Copilot CLI** → `reasoning_effort: low` on the `task` tool; **Claude Code** / **VS Code** → explicit brevity directive in the dispatch prompt; **OpenCode** → not settable per dispatch |
| medium | **Copilot CLI** → `reasoning_effort: medium` on the `task` tool; **Claude Code** / **VS Code** → explicit thinking-budget directive in the dispatch prompt; **OpenCode** → not settable per dispatch |
| high | **Copilot CLI** → `reasoning_effort: high` on the `task` tool; **Claude Code** / **VS Code** → explicit extended-thinking directive in the dispatch prompt; **OpenCode** → not settable per dispatch |

## Agent Resolution (how to address an ARCUS agent)

ARCUS agents live at `agents/<name>.md` and always run as **isolated subagents**. Resolve the dispatch target by **matching the bare `<name>` against your host's live registry** — never by rewriting a prefix — using the **first route that works**:

1. **A registered subagent type ending in `<name>`.** **Prefer this**: the host then enforces the agent's `tools:` allowlist, which is what keeps the advisory reviewers read-only.
2. **A generic subagent** whose prompt opens with *"Read and follow the agent spec at `$ARCUS_HOME/agents/<name>.md`."* — only where no registry entry exists; under route 2 the agent's `tools:` restrictions are **advisory only** (honor them; never edit files from a read-only reviewer).

`arcus:<name>` is a **host-neutral reference token**, not a namespace: a skill has no single literal correct on both hosts (`arcus-plugin:model-strategy` is an error on Copilot CLI), so match against the registry your host offers. Host namespace/tool-name tables and route-2 details live in [Running Across Hosts](/concepts/cross-host). Resolve `$ARCUS_HOME` from `.arcus/env`; if absent, run the bootstrap first (see the Helper Scripts section of `arcus-controller`).

## Static Stage Assignments

Fixed complexity for orchestrator-level stages (does not vary per story). **This table is
documentation.** The binding copy is `STAGE_COMPLEXITY` in `.arcus/bin/models.mjs`, which `resolve
--stage <name>` reads; a unit test holds the two in bijection, so read either and get the same
answer.

| Stage Subagent | Complexity | Rationale |
| --- | --- | --- |
| context-pack-builder | medium | Codebase search + assembly |
| spec-finalizer | heavy | Multi-source synthesis, ambiguity resolution |
| implementation-planner | heavy | Architectural decomposition, task design |
| test-spec-compiler | medium | Pattern-following matrix generation |
| subagent-task-dispatcher | medium | Per-task context scoping and protocol execution |
| simplify-and-verify | medium | Convention-guided mutation behind a test gate |
| spec-compliance-reviewer | medium | Checklist verification against spec |
| code-quality-reviewer | medium | Pattern matching against conventions |
| code-reviewer (skill, not an agent — advisory) | heavy | Holistic review coordination, dedupe + judge |
| security-reviewer | medium | Vulnerability detection in changed code |
| performance-reviewer | medium | Hot-path / resource regression detection |
| history-context-reviewer | medium | Git-history correlation over changed lines |
| review-consolidator | medium | Dedupe + severity calibration over specialist findings |
| context-drift-sync | medium | Diff-driven drift assessment over shared artifacts |
| pull-request-builder | light | Template fill + summary |
| repo-overview-discovery | heavy | Full repo scan, multi-area coordination |
| flow-discovery | heavy | Code path tracing across multiple layers |
| test-pattern-discovery | medium | Pattern extraction, template-following |
| design-pattern-discovery | heavy | Source-wide convention + anti-pattern synthesis |

## Classification Guardrails

Heuristics for the implementation-planner and test-spec-compiler when assessing task/test complexity:

### Task Complexity

- Touches >3 files or introduces a new architectural pattern → **minimum medium**
- Requires resolving competing design approaches or cross-cutting concerns → **heavy**
- Follows an existing pattern with <2 files changed → **light eligible**
- Requires integration with external services or APIs → **minimum medium**
- Modifies shared infrastructure (base classes, config, build) → **heavy**

### Test Complexity

- Requires complex setup or validates multi-step interaction → **medium**
- Is a straightforward assertion against a single method → **light eligible**
- Requires mocking multiple dependencies or simulating failure scenarios → **medium**
- Validates architectural constraints or cross-cutting behavior → **heavy**
</content>
