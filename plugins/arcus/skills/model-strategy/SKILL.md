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
disable-model-invocation: true
---

# Model-Tiered Strategy

Single source of truth for complexity classification and model selection across all AFK skills.

## Complexity Levels

Skills that assess task difficulty use these three levels:

| Level  | Description                                                                 |
|--------|-----------------------------------------------------------------------------|
| heavy  | Deep reasoning, multi-file coordination, new patterns, ambiguity resolution |
| medium | Standard implementation, moderate reasoning, pattern-following              |
| light  | Simple changes, template filling, single-file edits following existing patterns |

## Complexity-to-Model Mapping

The dispatcher resolves complexity to a model tier using this table:

| Complexity | Model Tier |
|------------|------------|
| heavy      | opus       |
| medium     | sonnet     |
| light      | haiku      |

**Default**: If a task or test case is missing the `complexity` field, treat it as `medium`.

This mapping can be overridden for specific runs (e.g., "all Opus for a quality sprint") by changing this table only — no plan regeneration needed.

## Tier-to-Platform Model String Mapping

The dispatcher resolves the model tier to a platform-specific string:

| Model Tier | VS Code / GitHub Copilot        | Claude Code CLI |
|------------|---------------------------------|-----------------|
| opus       | "Claude Opus 4.6 (copilot)"    | "opus"          |
| sonnet     | "Claude Sonnet 4.6 (copilot)"  | "sonnet"        |
| haiku      | "Claude Haiku 4.5 (copilot)"   | "haiku"         |

**Update this table** when new model versions are released.

**VS Code / GitHub Copilot**: The `runSubagent` tool accepts a `model` parameter in `"Model Name (Vendor)"` format. Pass the resolved string directly.

**Claude Code CLI**: Dispatch subagents with the **`Agent` tool**, which **accepts a per-subagent `model` parameter** (`"opus"` / `"sonnet"` / `"haiku"`). Pass the resolved string directly so each task/reviewer runs on its complexity-appropriate tier — light/mechanical work on `haiku`, standard work on `sonnet`, judgment-heavy work on `opus`. 

## Static Stage Assignments

Fixed complexity for orchestrator-level stages (does not vary per story):

| Stage Subagent           | Complexity | Rationale                                    |
|--------------------------|------------|----------------------------------------------|
| context-pack-builder     | medium     | Codebase search + assembly                   |
| spec-finalizer           | heavy      | Multi-source synthesis, ambiguity resolution |
| implementation-planner   | heavy      | Architectural decomposition, task design     |
| test-spec-compiler       | medium     | Pattern-following matrix generation          |
| spec-compliance-reviewer | medium     | Checklist verification against spec          |
| code-quality-reviewer    | medium     | Pattern matching against conventions         |
| code-reviewer            | heavy      | Holistic review coordination, dedupe + judge |
| security-reviewer        | medium     | Vulnerability detection in changed code      |
| performance-reviewer     | medium     | Hot-path / resource regression detection     |
| pull-request-builder     | light      | Template fill + summary                      |
| repo-overview-discovery  | heavy      | Full repo scan, multi-area coordination      |
| flow-discovery           | heavy      | Code path tracing across multiple layers     |
| test-pattern-discovery   | medium     | Pattern extraction, template-following       |
| design-pattern-discovery | heavy      | Source-wide convention + anti-pattern synthesis |

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

## Resolution Chain

The full resolution at dispatch time:

```
complexity (heavy|medium|light)
  → model tier (opus|sonnet|haiku)        [from Complexity-to-Model Mapping]
    → platform model string               [from Tier-to-Platform Mapping]
      → passed as `model` parameter to the subagent spawner
        (Copilot: runSubagent; Claude Code: the Agent tool)
```

Skills MUST NOT fail when model selection is unavailable. The `model` parameter is always optional — if a platform or spawner ignores it, the subagent falls back to the session model.

## Escalation Rule

If a task fails after 2 retries at its assigned complexity:
- Promote complexity one level: light → medium → heavy
- Re-resolve through the mapping chain and pass the higher tier as the subagent `model` (Copilot `runSubagent` / Claude Code `Agent`)
- Only on a spawner that ignores `model` (e.g. the legacy `Task` tool) does escalation fall back to the session model
