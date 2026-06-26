---
name: context-pack-builder
description: >
  Build a minimal, story-specific context pack from shared artifacts. Use when an
  orchestrator is starting a new story, building context for a specific story ID, or
  performing pre-specification planning. Dispatched by arcus:kick-off
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

### Step 1: Read the story Summary
- Read the **Summary** from the `story` input — it drives flow matching in Step 2.

### Step 2: Map Business Flows
- Run the helper script to identify relevant flows without reading every file:
  `python3 "$ARCUS_HOME/agent-resources/context-pack-builder/scripts/match_flows.py" .`
- Compare the story summary against the flow summaries returned by the script.
- Select the **1–2 most relevant flows**. Include more only if the story spans multiple domain areas.

### Step 3: Gather Context
- Read the full content of the **selected flow files** from the `repo_context` directory (flows subdirectory).
- Read the scope, map, testing-patterns, and design-and-coding-patterns files from the `repo_context` input for high-level grounding. Do NOT perform a full repository scan — rely only on these shared artifacts.

### Step 4: Synthesize & Generate
- Use the template at `"$ARCUS_HOME"/agent-resources/context-pack-builder/assets/context-pack-template.md` to structure the output.
- In **Relevant Flows**, link each selected flow as a markdown link relative to the `repo_context` location so consumers can read flow detail at full fidelity from the source. Synthesize only; do not copy flow content into the pack.
- Identify likely working areas (packages/classes) based on flow entry points.
- Explicitly capture any gaps or ambiguities in the "Assumptions / Gaps" section.

### Step 5: Persist
- Write the final document to the output path (default `.arcus/outputs/context-pack-builder/<timestamp>.md` when no explicit path is passed; the dispatcher may override it).
- Overwrite if it already exists.

## Failure Modes
- **NO_MATCHING_FLOW**: If no flow matches the story, produce a pack based on the scope file from `repo_context` but mark "Flows" as "NONE MATCHED" and list this as a high risk.
- **INSUFFICIENT_CONTEXT**: If `repo_context` files are missing, alert the user that the repository needs "context reconciliation" first.

## Resources
- **Template**: `"$ARCUS_HOME"/agent-resources/context-pack-builder/assets/context-pack-template.md`
- **Matching Script**: `"$ARCUS_HOME"/agent-resources/context-pack-builder/scripts/match_flows.py`
- **Design Patterns**: `"$ARCUS_HOME"/agent-resources/context-pack-builder/references/design-patterns.md`

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `story` | yes | markdown or text | The user story requirement describing what needs to be built |
| `repo_context` | yes | directory path | Path to shared repository context artifacts (flows, scope, map, patterns) |

### Outputs
- **`context_pack`** (markdown) — Story-to-code correlations: relevant business flows (linked), likely working areas, repository patterns, testing conventions, and identified gaps or assumptions.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/context-pack-builder/<timestamp>.md`. The capability never asks the user where to write.

