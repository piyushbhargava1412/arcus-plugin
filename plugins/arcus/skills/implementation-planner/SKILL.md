---
name: implementation-planner
description: Act as a Tech Lead to design a technical approach and decompose a user story into atomic implementation tasks. Generates and scores at least two candidate approaches, and in dialogue (gated) mode interviews the user on the design decision before producing the blueprint. Use when you have a context pack and a grounded plan and need to generate a blueprint. Trigger on "plan the implementation", "generate implementation blueprint", or "break down the story".
metadata:
  version: "2.0.0"
  team: krill
  type:
    - agents
    - tech-lead
---

# Implementation Planner

## Overview
Acts as the **Tech Lead** to bridge the gap between requirements and execution. It absorbs the context-specific artifacts and the grounded plan to design a concrete technical approach and a sequence of atomic, testable tasks. It generates **at least two** scored candidate approaches, deliberates on the chosen one (interviewing the user in dialogue mode), records the design deliberation into the shared `plan.md`, and emits a machine-parsed task list as `blueprint.md`.

## Execution Modes

This skill runs in one of two modes. The caller (the `arcus:arcus-controller`) decides which:

| Mode | Context | Behaviour |
|------|---------|-----------|
| **dialogue** (gated) | Runs in the **main thread** | Generate and score the candidate approaches, then **ask the user** to choose the design approach as an interview question (one option marked **Recommended**), folding their answer in before designing. Record the Q&A in the `## Design Dialogue Answers` section of `plan.md`. |
| **one-shot** (afk / subagent) | Runs as an isolated subagent | Never block for input. Auto-select the **highest-scoring** candidate approach and record it. Skip the interview and leave the `## Design Dialogue Answers` section empty or omit it. |

In **both** modes you must still produce the plan.md design sections **and** `blueprint.md` (see Output). In dialogue mode the user's choice is authoritative and overrides the highest-scoring pick. If `plan.md` already has a populated `## Design Dialogue Answers` section, reuse it and do NOT re-ask the design question.

## Inputs

This skill runs **after** `spec-finalizer`, so `plan.md` already exists. Gather and read the following artifacts located in `.arcus/specs/[STORY-ID]/`:

1. `story.md` — The original User Story / Requirements.
2. `context-pack.md` — The repository subset relevant to the story. Follow its **Relevant Flows** links into `.context/flows/*` for flow detail (Entry Points, Core Path, Data Touchpoints, Integrations, Tests).
3. `plan.md` — The grounded decisions from `spec-finalizer` (`## Context Grounding`, `## Resolved Ambiguities`, `## Dialogue Answers`, `## Implementation Boundary`, `## Guardrail Check`). These are the authoritative grounded choices that constrain the design.

## Output

This skill produces the following — nothing else:

- `.arcus/specs/[STORY-ID]/plan.md` — appends this skill's **owned** design sections (see ownership contract below): `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and `## Design Dialogue Answers` (**dialogue mode only**).
- `.arcus/specs/[STORY-ID]/blueprint.md` — the machine-parsed atomic task list, structured from `./assets/blueprint-template.md`.

### Shared plan.md — Section Ownership Contract

`plan.md` is a single file shared with `spec-finalizer`, which runs **before** this skill and owns the requirements half: `# Plan: [STORY-ID]` title, `## Context Grounding`, `## Resolved Ambiguities`, `## Dialogue Answers`, `## Implementation Boundary`, `## Guardrail Check`. To avoid clobbering:

- `plan.md` will already exist when this skill runs. **Append** this skill's owned design sections to the existing file; do NOT recreate or overwrite the whole file.
- implementation-planner OWNS and writes ONLY: `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and `## Design Dialogue Answers`.
- Leave all of `spec-finalizer`'s owned sections intact. Never overwrite them.

## Workflow

### Step 1: Input Analysis
Read `story.md`, `context-pack.md`, and `plan.md` (see Inputs). Treat `plan.md`'s `## Resolved Ambiguities`, `## Dialogue Answers`, and `## Implementation Boundary` as authoritative grounded constraints — the design must honor them, not relitigate them.

### Step 2: Generate & Score ≥2 Candidate Approaches
Generate **AT LEAST 2** distinct candidate approaches for implementing the story (e.g. extend an existing component vs. introduce a new one; in-process vs. queued; reuse vs. rewrite). Each candidate must be grounded in evidence from `context-pack.md` and consistent with `plan.md`'s grounded decisions.

Score each candidate on the following axes, **1–5** (5 = best for that axis), in the spirit of the blueprint template's Architecture & Safety section:

- **Blast radius** — how contained the change is (5 = minimal surface area touched).
- **Backward-compat** — preservation of existing behavior and contracts (5 = fully backward-compatible).
- **Complexity** — implementation/maintenance simplicity (5 = simplest).
- **Security** — where relevant; data handling, authz, exposure (5 = no new risk). Include this axis only when the story has a security dimension.

Record the scored comparison into `plan.md`'s `## Approach Evaluation` section as a table (one row per candidate, one column per axis, plus a total/notes column).

### Step 3: Select the Chosen Approach

**Dialogue (gated) mode — design interview — HARD REQUIREMENT:** After scoring, present the approach choice to the user as an INTERVIEW QUESTION. The question MUST list the candidate approaches, mark **EXACTLY ONE** option **Recommended** with a **one-line rationale** for why it is recommended, AND offer an explicit custom-answer option ("or propose your own approach"). This is mandatory in dialogue mode — no exceptions. Example shape:

```
Q: Which approach should we take for <the design decision>?
  A — <candidate A> (Recommended) — <one-line rationale for why A is recommended>
  B — <candidate B>
  C — <candidate C>
  Or propose your own approach.
```

The user's answer is authoritative and overrides the highest-scoring pick. Record the chosen approach + reasoning into `plan.md`'s `## Chosen Approach & Reasoning`, and record the question, the options presented (including which was marked Recommended), and the user's answer into `plan.md`'s `## Design Dialogue Answers`.

**One-shot (afk / subagent) mode:** NO interview — never block for input. Auto-select the **highest-scoring** candidate from Step 2 (break ties by lowest blast radius, then simplest). Record it into `## Chosen Approach & Reasoning` with the score-based rationale. Leave `## Design Dialogue Answers` empty or omit it.

### Step 4: Design the Approach
For the chosen approach:
- Map out the **Impacted Files**. Identify which existing files need modification and which new files are required, drawing on the Entry Points, Core Path, and Scope sections of the flow files linked under Relevant Flows in `context-pack.md`.
- Identify the core design patterns to be applied (e.g., matching existing repository patterns).
- Synthesize the "How" — explain the logic flow from entry point to data persistence.

Record the impacted-file map and design notes into `plan.md`'s `## Design / Impacted Files`.

### Step 5: Decompose into Atomic Tasks
- Break down the implementation into a sequence of small, manageable tasks.
- Follow the guidelines in `./references/task-decomposition.md`.
- **Constraint**: Each task must be "atomic"—focused on a single logical change and including its own validation (tests).
- **Complexity Classification**: For each task, assess its difficulty and assign a `complexity` level (`heavy`, `medium`, or `light`). Use the guardrail heuristics in the `arcus:model-strategy` skill (Classification Guardrails section). Do NOT use model names — only difficulty levels.

### Step 6: Define DoD for each Task
- For every task, write a clear **Definition of Done (DoD)**.
- Ensure the DoD includes specific functional checks and verification metrics (unit/integration tests).

### Step 7: Persist Design Deliberation + Blueprint
- **plan.md**: Append this skill's owned design sections — `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and (dialogue mode only) `## Design Dialogue Answers`. Honor the section ownership contract: append to the existing `plan.md` and leave `spec-finalizer`'s sections intact.
- **blueprint.md**: Use `./assets/blueprint-template.md` to structure the atomic task list and write it to `.arcus/specs/[STORY-ID]/blueprint.md`. This machine-parsed task list is consumed by `test-spec-compiler` and the Code stage.

## Success Criteria
- **Actionable**: A junior agent should be able to pick up any task and execute it without further planning.
- **Ordered**: Tasks are sequenced logically to resolve dependencies.
- **Traceable**: Every task relates back to a requirement in the user story or a grounded decision in `plan.md`.
- **Deliberated**: At least two candidate approaches were scored, and the chosen approach is recorded with reasoning (and, in dialogue mode, with the recorded user interview).

## Resources
- **Blueprint Template**: `./assets/blueprint-template.md`
- **Shared Plan (owned design sections)**: `.arcus/specs/[STORY-ID]/plan.md`
- **Task Decomposition Guide**: `./references/task-decomposition.md`
