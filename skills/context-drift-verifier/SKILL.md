---
name: context-drift-verifier
description: Verify that code changes remain aligned with original requirements and architectural constraints. Use between development tasks to prevent "LLM hallucination drift". Trigger on "check for drift", "verify context alignment", or "sync workspace drift".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - engineering
---

# Context Drift Verifier

## Overview
Acts as a "High-Level Observer" to ensure the `atomic-task-runner` hasn't drifted from the original intent. It validates recent code mutations against the `context-pack.md` and `assumptions.md` to maintain project integrity during long sessions.

## Workflow

### Step 0:
Identify the skills folder (typically `.github/skills/` or `.agent/skills/`). Store this in an internal variable called `skills_folder`. In the below steps, resolve ${skills_folder} to the actual identified path.

### Step 1: Input Synchronization
Read the grounding artifacts from `.aforge/specs/[STORY-ID]/`:
1. `context-pack.md`: Architectural boundaries.
2. `assumptions.md`: Grounded technical choices.
3. `blueprint.md`: Expected file impacts.

### Step 2: Workspace Audit
- List all files modified in the current branch since the last checkpoint.
- Inspect the content of the most recently changed files.

### Step 3: Drift Detection
- Perform a "Sanity Check" using the patterns in `${skills_folder}/context-drift-verifier/references/drift-indicators.md`.
- **Key Questions**:
    - Does this code use the agreed-upon error patterns?
    - Are the imports within the sanctioned repository domain?
    - Does the implementation match the `assumptions.md`?

### Step 4: Resolution
- **No Drift**: Provide a confirmation and allow the next task to proceed.
- **Drift Detected**:
    - Clearly document the violation.
    - Recommend a corrective action (Refactor or Rollback).
    - If needed, force a re-reading of the `blueprint.md` to align the next task.

## Success Criteria
- **Consistent**: Codebase remains idiomatic to the brownfield project.
- **Valid**: Changes do not introduce "hidden" debt or boundary violations.

