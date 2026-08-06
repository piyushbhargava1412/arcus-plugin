---
name: model-strategy
description: >
  Shared reference for complexity classification and complexity-to-model resolution used by
  all ARCUS skills. Loaded by name (the `arcus:model-strategy` skill) when an
  orchestrator or sub-skill needs to resolve a `heavy`/`medium`/`light` complexity to a model tier
  and platform model string. Not invoked directly by users.
layer: substrate
standalone: false
user-invocable: false
---

# Model-Tiered Strategy

Single source of truth for complexity classification and model selection across all AFK skills.

## Complexity Levels

| Level | Description |
| --- | --- |
| heavy | Deep reasoning, multi-file coordination, new patterns, ambiguity resolution |
| medium | Standard implementation, moderate reasoning, pattern-following |
| light | Simple changes, template filling, single-file edits following existing patterns |

## Complexity-to-Model Mapping

| Complexity | Model Tier |
| --- | --- |
| heavy | opus |
| medium | sonnet |
| light | haiku |

**Default**: a task or test case missing the `complexity` field is treated as `medium`. This mapping can be overridden for a run (e.g. "all Opus for a quality sprint") by editing this table only — no plan regeneration needed.

## Tier-to-Platform Model String Mapping

The dispatcher resolves the tier to a platform-specific string. **Copilot CLI and VS Code are different surfaces with different model-string formats** — do not treat them as one column:

| Model Tier | GitHub Copilot CLI (slug id) | VS Code Copilot Chat | Claude Code CLI | OpenCode (provider/model-id) |
| --- | --- | --- | --- | --- |
| opus | `claude-opus-4.8` | "Claude Opus 4.6 (copilot)" | "opus" | `github-copilot/claude-opus-4.8` |
| sonnet | `claude-sonnet-4.6` | "Claude Sonnet 4.6 (copilot)" | "sonnet" | `github-copilot/claude-sonnet-4.6` |
| haiku | `claude-haiku-4.5` | "Claude Haiku 4.5 (copilot)" | "haiku" | `github-copilot/claude-haiku-4.5` |

**Update this table** when new model versions are released. Pass the resolved string as the per-dispatch `model`: **Copilot CLI**'s `task` tool takes a **slug id** — mandatory here, since Copilot CLI does not resolve tier words (it warns visibly and falls back; a valid slug is honoured), and also accepts `reasoning_effort`/`context_tier`; **VS Code**'s `runSubagent` takes `"Model Name (Vendor)"`; **Claude Code**'s `Agent` takes `"opus"`/`"sonnet"`/`"haiku"` and also honours tier words in frontmatter. **OpenCode** has no per-dispatch `model` — it is pinned per agent in `model:` frontmatter at build time (default provider GitHub Copilot; Amazon Bedrock alternative and full per-host mechanics in [Running Across Hosts](/concepts/cross-host)).

## Dispatch Requirement (MUST)

Resolving a tier from the tables above is **not optional prose** — it is a checkpoint every dispatch
call must pass before it is sent. **Omitting the resolved `model` (or, on OpenCode, relying on the
per-agent frontmatter pin without having checked it matches the intended tier) is itself a failure
mode**, exactly like skipping a required input: the dispatch silently falls back to whatever model
the calling session happens to be running on, defeating the entire cost/quality tiering this skill
exists to enforce, with no visible error.

Before sending **any** subagent/agent dispatch call, on whichever dispatch mechanism your host
provides:

1. Classify the work's complexity (`heavy` / `medium` / `light`) per **Complexity Levels** and
   **Classification Guardrails**, or read it off **Static Stage Assignments** if it is a fixed
   orchestrator-level stage.
2. Resolve that complexity to a platform-specific model string per **Tier-to-Platform Model String
   Mapping** for the host you are actually running on.
3. Populate the dispatch call's model-selection parameter with that resolved string (Copilot CLI:
   `model`; Claude Code: `model` on `Agent`; VS Code: the model argument to `runSubagent`) —
   **before** issuing the call, not as a follow-up correction.
4. If effort is also relevant (review specialists, time-sensitive stages), resolve and set it too
   per **Effort Resolution** in the same pass.

A dispatch call that reaches step 3 without a resolved model string populated is malformed and must
not be sent. If you catch yourself about to omit it "just this once," that is the failure mode this
section names — stop and resolve it first.

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

Fixed complexity for orchestrator-level stages (does not vary per story):

| Stage Subagent | Complexity | Rationale |
| --- | --- | --- |
| context-pack-builder | medium | Codebase search + assembly |
| spec-finalizer | heavy | Multi-source synthesis, ambiguity resolution |
| implementation-planner | heavy | Architectural decomposition, task design |
| test-spec-compiler | medium | Pattern-following matrix generation |
| spec-compliance-reviewer | medium | Checklist verification against spec |
| code-quality-reviewer | medium | Pattern matching against conventions |
| code-reviewer | heavy | Holistic review coordination, dedupe + judge |
| security-reviewer | medium | Vulnerability detection in changed code |
| performance-reviewer | medium | Hot-path / resource regression detection |
| history-context-reviewer | medium | Git-history correlation over changed lines |
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
