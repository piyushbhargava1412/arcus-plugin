---
name: context-pack-builder
description: Build a minimal, story-specific context pack from shared artifacts. Use when starting a new story, building context for a specific story ID, or performing pre-specification planning. Trigger on "start a new story", "build context for story", or "prepare context pack".
layer: capability
standalone: true
---

# Feature Context Pack Builder

## Overview

Generates a targeted, minimal context pack for a single user story by mapping it to shared repository flows. This prevents context overload and keeps the agent focused on relevant business logic.

## Workflow

### Step 0: Script Execution Note
This skill runs a bundled helper script (`match_flows.py`) via shell. Because the shell runs from the workspace—not this skill's directory—invoke the script by absolute path: resolve `ARCUS_HOME` from `.arcus/env`, then run `"$ARCUS_HOME"/skills/context-pack-builder/scripts/match_flows.py`. Other resources (templates, references) load by relative path automatically.

### Step 1: Initialize & Extract ID
- Extract the **Story ID** and **Summary** from the user's input. 
- If the ID is missing, determine it based on user provided information.
- Create the target directory: `.arcus/specs/[STORY-ID]/`

### Step 2: Map Business Flows
- Run the helper script to identify relevant flows without reading every file:
  `python3 "$ARCUS_HOME/skills/context-pack-builder/scripts/match_flows.py" .`
- Compare the story summary against the flow summaries returned by the script.
- Select the **1–2 most relevant flows**. Include more only if the story spans multiple domain areas.

### Step 3: Gather Context
- Read the full content of the **selected flow files** from `.context/flows/`.
- Read `.context/repo_scope.md`, `.context/repo_map.md`, `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md` for high-level grounding.
- **Rules:** Do NOT perform a full repository scan. Rely only on these shared artifacts.

### Step 4: Synthesize & Generate
- Use the `./assets/context-pack-template.md` to structure the output.
- In **Relevant Flows**, link each selected flow as a markdown link to `.context/flows/<name>.md` so consumers can read flow detail at full fidelity from the source. Synthesize only; do not copy flow content into the pack.
- Identify likely working areas (packages/classes) based on flow entry points.
- Explicitly capture any gaps or ambiguities in the "Assumptions / Gaps" section.

### Step 5: Persist
- Write the final document to `.arcus/specs/[STORY-ID]/context-pack.md`.
- Overwrite if it already exists.

## Success Criteria
- **Minimalist**: The pack contains only what is needed for the specific story.
- **Accurate**: Flows selected directly relate to the story's intent.
- **Standardized**: Follows the provided template exactly.

## Failure Modes
- **NO_MATCHING_FLOW**: If no flow matches the story, produce a pack based on `repo_scope.md` but mark "Flows" as "NONE MATCHED" and list this as a high risk.
- **INSUFFICIENT_CONTEXT**: If `.context/` files are missing, alert the user that the repository needs "context reconciliation" first.

## Resources
- **Template**: `./assets/context-pack-template.md`
- **Matching Script**: `./scripts/match_flows.py` (resolve via `$ARCUS_HOME` for execution)
- **Design Patterns**: `./references/design-patterns.md`
