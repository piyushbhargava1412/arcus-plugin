---
name: context-pack-builder
description: >
  Build a minimal, story-specific context pack from shared artifacts. Use when an
  orchestrator is starting a new story, building context for a specific story ID, or
  performing pre-specification planning. Dispatched by arcus:kick-off — not invoked
  directly by users.
layer: capability
user-invocable: false
disable-model-invocation: true
model: sonnet
color: blue
---

# Feature Context Pack Builder

## Overview

Generates a targeted, minimal context pack for a single user story by mapping it to shared repository flows. This prevents context overload and keeps the agent focused on relevant business logic.

## Workflow

### Step 0: Script Execution Note
This skill runs a bundled helper script (`match_flows.py`) via shell. Because the shell runs from the workspace—not this skill's directory—invoke the script by absolute path: resolve `ARCUS_HOME` from `.arcus/env`, then run `"$ARCUS_HOME"/agent-resources/context-pack-builder/scripts/match_flows.py`. Bundled resources (templates, references) likewise live under `"$ARCUS_HOME"/agent-resources/context-pack-builder/`; load them by that absolute path.

### Step 1: Initialize & Extract ID
- Extract the **Story ID** and **Summary** from the `story` input. 
- If the ID is missing, determine it based on user provided information.

### Step 2: Map Business Flows
- Run the helper script to identify relevant flows without reading every file:
  `python3 "$ARCUS_HOME/agent-resources/context-pack-builder/scripts/match_flows.py" .`
- Compare the story summary against the flow summaries returned by the script.
- Select the **1–2 most relevant flows**. Include more only if the story spans multiple domain areas.

### Step 3: Gather Context
- Read the full content of the **selected flow files** from the `repo_context` directory (flows subdirectory).
- Read the scope, map, testing-patterns, and design-and-coding-patterns files from the `repo_context` input for high-level grounding.
- **Rules:** Do NOT perform a full repository scan. Rely only on these shared artifacts from `repo_context`.

### Step 4: Synthesize & Generate
- Use the template at `"$ARCUS_HOME"/agent-resources/context-pack-builder/assets/context-pack-template.md` to structure the output.
- In **Relevant Flows**, link each selected flow as a markdown link relative to the `repo_context` location so consumers can read flow detail at full fidelity from the source. Synthesize only; do not copy flow content into the pack.
- Identify likely working areas (packages/classes) based on flow entry points.
- Explicitly capture any gaps or ambiguities in the "Assumptions / Gaps" section.

### Step 5: Persist
- Write the final document to the output path (default `.arcus/outputs/context-pack-builder/<story-id-or-timestamp>.md` when no explicit path is passed; the dispatcher may override it).
- Overwrite if it already exists.

## Success Criteria
- **Minimalist**: The pack contains only what is needed for the specific story.
- **Accurate**: Flows selected directly relate to the story's intent.
- **Standardized**: Follows the provided template exactly.

## Failure Modes
- **NO_MATCHING_FLOW**: If no flow matches the story, produce a pack based on the scope file from `repo_context` but mark "Flows" as "NONE MATCHED" and list this as a high risk.
- **INSUFFICIENT_CONTEXT**: If `repo_context` files are missing, alert the user that the repository needs "context reconciliation" first.

## Resources
- **Template**: `"$ARCUS_HOME"/agent-resources/context-pack-builder/assets/context-pack-template.md`
- **Matching Script**: `"$ARCUS_HOME"/agent-resources/context-pack-builder/scripts/match_flows.py`
- **Design Patterns**: `"$ARCUS_HOME"/agent-resources/context-pack-builder/references/design-patterns.md`

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `story` | markdown or text | The user story requirement describing what needs to be built | orchestrator passes it |
| `repo_context` | directory path | Path to shared repository context artifacts (flows, scope, map, patterns) | orchestrator passes it |

### Outputs
- **`context_pack`** (markdown) — Story-to-code correlations: relevant business flows (linked), likely working areas, repository patterns, testing conventions, and identified gaps or assumptions.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/context-pack-builder/<story-id-or-timestamp>.md`. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/context-pack-builder/<story-id-or-timestamp>.md`; orchestrators override with an explicit path.
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.

## Caller Guidance

This capability receives **named inputs**, not file paths. They are passed by the dispatching skill or orchestrator:

- **Pipeline (via an orchestrator/coordinator)**: the caller resolves the ARCUS workspace paths and
  passes the **content** of each input plus an explicit `output_path`. The capability constructs no
  ARCUS paths itself.

The skill body below is written in terms of the named inputs; it never reads a hard-coded ARCUS
workspace path.
