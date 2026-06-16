---
name: context-pack-builder
description: Build a minimal, story-specific context pack from shared artifacts. Use when starting a new story, building context for a specific story ID, or performing pre-specification planning. Trigger on "start a new story", "build context for story", or "prepare context pack".
metadata:
  version: "1.1.0"
  team: krill
  type:
    - agents
    - context-management
---

# Feature Context Pack Builder

## Overview

Generates a targeted, minimal context pack for a single user story by mapping it to shared repository flows. This prevents context overload and keeps the agent focused on relevant business logic.

## Workflow

### Step 0:
Identify the skills folder (typically `.github/skills/` or `.agent/skills/`). Store this in an internal variable called `skills_folder`. In the below steps, resolve ${skills_folder} to the actual identified path.

### Step 1: Initialize & Extract ID
- Extract the **Story ID** and **Summary** from the user's input. 
- If the ID is missing, determine it based on user provided information.
- Create the target directory: `.aforge/specs/[STORY-ID]/`

### Step 2: Map Business Flows
- Run the helper script to identify relevant flows without reading every file:
  `python3 ${skills_folder}/context-pack-builder/scripts/match_flows.py .`
- Compare the story summary against the flow summaries returned by the script.
- Select the **1–2 most relevant flows**. Include more only if the story spans multiple domain areas.

### Step 3: Gather Context
- Read the full content of the **selected flow files** from `.context/flows/`.
- Read `.context/repo_scope.md`, `.context/repo_map.md`, and `.context/testing-patterns.md` for high-level grounding.
- **Rules:** Do NOT perform a full repository scan. Rely only on these shared artifacts.

### Step 4: Synthesize & Generate
- Use the `${skills_folder}/context-pack-builder/assets/context-pack-template.md` to structure the output.
- Identify likely working areas (packages/classes) based on flow entry points.
- Explicitly capture any gaps or ambiguities in the "Assumptions / Gaps" section.

### Step 5: Persist
- Write the final document to `.aforge/specs/[STORY-ID]/context-pack.md`.
- Overwrite if it already exists.

## Success Criteria
- **Minimalist**: The pack contains only what is needed for the specific story.
- **Accurate**: Flows selected directly relate to the story's intent.
- **Standardized**: Follows the provided template exactly.

## Failure Modes
- **NO_MATCHING_FLOW**: If no flow matches the story, produce a pack based on `repo_scope.md` but mark "Flows" as "NONE MATCHED" and list this as a high risk.
- **INSUFFICIENT_CONTEXT**: If `.context/` files are missing, alert the user that the repository needs "context reconciliation" first.

## Resources
- **Template**: `${skills_folder}/context-pack-builder/assets/context-pack-template.md`
- **Matching Script**: `${skills_folder}/context-pack-builder/scripts/match_flows.py`
- **Design Patterns**: `${skills_folder}/context-pack-builder/references/design-patterns.md`
