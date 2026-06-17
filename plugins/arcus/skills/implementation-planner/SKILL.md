---
name: implementation-planner
description: Act as a Tech Lead to design a technical approach and decompose a user story into atomic implementation tasks. Use when you have a context pack and grounded assumptions and need to generate a blueprint. Trigger on "plan the implementation", "generate implementation blueprint", or "break down the story".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - tech-lead
---

# Implementation Planner

## Overview
Acts as the **Tech Lead** to bridge the gap between requirements and execution. It absorbs the context-specific artifacts and grounded assumptions to design a concrete technical approach and a sequence of atomic, testable tasks.

## Workflow

### Step 1: Input Analysis
Gather and read the following requirements artifacts located in `.arcus/specs/[STORY-ID]/`:
1. `story.md`: The original User Story / Requirements.
2. `context-pack.md`: The repository subset relevant to the story. Follow its **Relevant Flows** links into `.context/flows/*` for flow detail (Entry Points, Core Path, Data Touchpoints, Integrations, Tests).
3. `assumptions.md`: The technical decisions and grounded choices.

### Step 2: Design the Approach
- Map out the **Impacted Files**. Identify which existing files need modification and which new files are required, drawing on the Entry Points, Core Path, and Scope sections of the flow files linked under Relevant Flows in `context-pack.md`.
- Identify the core design patterns to be applied (e.g., matching existing repository patterns).
- Synthesize the "How" – explain the logic flow from entry point to data persistence.

### Step 3: Decompose into Atomic Tasks
- Break down the implementation into a sequence of small, manageable tasks.
- Follow the guidelines in `./references/task-decomposition.md`.
- **Constraint**: Each task must be "atomic"—focused on a single logical change and including its own validation (tests).
- **Complexity Classification**: For each task, assess its difficulty and assign a `complexity` level (`heavy`, `medium`, or `light`). Use the guardrail heuristics in the `arcus:model-strategy` skill (Classification Guardrails section). Do NOT use model names — only difficulty levels.

### Step 4: Define DoD for each Task
- For every task, write a clear **Definition of Done (DoD)**.
- Ensure the DoD includes specific functional checks and verification metrics (unit/integration tests).

### Step 5: Persist the Blueprint
- Use `./assets/blueprint-template.md` to structure the final plan.
- Write the output to `.arcus/specs/[STORY-ID]/blueprint.md`.

## Success Criteria
- **Actionable**: A junior agent should be able to pick up any task and execute it without further planning.
- **Ordered**: Tasks are sequenced logically to resolve dependencies.
- **Traceable**: Every task relates back to a requirement in the user story or an assumption in `assumptions.md`.

## Resources
- **Blueprint Template**: `./assets/blueprint-template.md`
- **Task Decomposition Guide**: `./references/task-decomposition.md`
