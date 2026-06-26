---
name: implementation-planner
description: Act as a Tech Lead to design a technical approach and decompose a user story into atomic implementation tasks. Generates and scores at least two candidate approaches, and in dialogue (gated) mode interviews the user on the design decision before producing the plan. Use when you have a grounded spec (and optionally a context pack) and need to generate the implementation plan. Trigger on "plan the implementation", "generate implementation plan", or "break down the story".
layer: capability
standalone: true
---

# Implementation Planner

## Overview
Acts as the **Tech Lead** to bridge the gap between requirements and execution. It absorbs the context-specific artifacts and the grounded spec to design a concrete technical approach and a sequence of atomic, testable tasks. It generates **at least two** scored candidate approaches, deliberates on the chosen one (interviewing the user in dialogue mode), and writes a single self-contained plan — the design deliberation plus a machine-parsed atomic task list — as the `implementation_plan` output.

## Execution Modes

This skill receives `mode` as an explicit input parameter. It branches on the `mode` value:

| Mode | Behaviour |
|------|-----------|
| **dialogue** | Generate and score the candidate approaches, then **ask the user** to choose the design approach as an interview question (one option marked **Recommended** with a one-line rationale, plus an explicit custom-answer option), folding their answer in before designing. Record the Q&A in the `## Design Dialogue Answers` section of the `implementation_plan` output. |
| **autonomous** (afk) | Never block for input. Auto-select the **highest-scoring** candidate approach and record it. Skip the interview and leave the `## Design Dialogue Answers` section empty or omit it. |

In **both** modes you must still produce the design sections **and** the atomic task list — together the `implementation_plan` output (see Output). In dialogue mode the user's choice is authoritative and overrides the highest-scoring pick. If the `implementation_plan` output already has a populated `## Design Dialogue Answers` section, reuse it and do NOT re-ask the design question.

## Workflow

**Read the `mode` input.** If `mode == dialogue`, follow the dialogue branch (interview the user on the design approach). If `mode == autonomous`, follow the autonomous branch (never block for input; auto-select the highest-scoring approach).

### Step 1: Input Analysis
Use the `story`, `context_pack`, and `spec_grounding` inputs (see Inputs). Treat the `spec_grounding` input's `## Resolved Ambiguities`, `## Dialogue Answers`, and `## Implementation Boundary` as authoritative grounded constraints — the design must honor them, not relitigate them.

### Step 2: Generate & Score ≥2 Candidate Approaches
Generate **AT LEAST 2** distinct candidate approaches for implementing the story (e.g. extend an existing component vs. introduce a new one; in-process vs. queued; reuse vs. rewrite). Each candidate must be grounded in evidence from the `context_pack` input and consistent with the `spec_grounding` input's grounded decisions.

Score each candidate on the following axes, **1–5** (5 = best for that axis), in the spirit of the plan template's Architecture & Safety section:

- **Blast radius** — how contained the change is (5 = minimal surface area touched).
- **Backward-compat** — preservation of existing behavior and contracts (5 = fully backward-compatible).
- **Complexity** — implementation/maintenance simplicity (5 = simplest).
- **Security** — where relevant; data handling, authz, exposure (5 = no new risk). Include this axis only when the story has a security dimension.

Record the scored comparison into the `## Approach Evaluation` section of the plan as a table (one row per candidate, one column per axis, plus a total/notes column).

### Step 3: Select the Chosen Approach

**Dialogue mode — design interview — HARD REQUIREMENT:** After scoring, present the approach choice to the user as an INTERVIEW QUESTION. The question MUST list the candidate approaches, mark **EXACTLY ONE** option **Recommended** with a **one-line rationale** for why it is recommended, AND offer an explicit custom-answer option ("or propose your own approach"). This is mandatory in dialogue mode — no exceptions. Example shape:

```
Q: Which approach should we take for <the design decision>?
  A — <candidate A> (Recommended) — <one-line rationale for why A is recommended>
  B — <candidate B>
  C — <candidate C>
  Or propose your own approach.
```

The user's answer is authoritative and overrides the highest-scoring pick. Record the chosen approach + reasoning into the `## Chosen Approach & Reasoning` section of the plan, and record the question, the options presented (including which was marked Recommended), and the user's answer into its `## Design Dialogue Answers` section.

**Autonomous mode:** NO interview — never block for input. Auto-select the **highest-scoring** candidate from Step 2 (break ties by lowest blast radius, then simplest). Record it into `## Chosen Approach & Reasoning` with the score-based rationale. Leave `## Design Dialogue Answers` empty or omit it.

### Step 4: Design the Approach
For the chosen approach:
- Map out the **Impacted Files**. Identify which existing files need modification and which new files are required, drawing on the Entry Points, Core Path, and Scope sections of the flow files linked under Relevant Flows in the `context_pack` input.
- Identify the core design patterns to be applied, drawing on `.context/design-and-coding-patterns.md` (design patterns in use, layering/structure, naming/idioms, error-handling conventions, and its **Avoid** rules) so the design matches established repository conventions.
- Synthesize the "How" — explain the logic flow from entry point to data persistence.

Record the impacted-file map and design notes into the `## Design / Impacted Files` section of the plan.

### Step 5: Decompose into Atomic Tasks
- Break down the implementation into a sequence of small, manageable tasks.
- Follow the guidelines in `./references/task-decomposition.md`.
- **Constraint**: Each task must be "atomic"—focused on a single logical change and including its own validation (tests).
- **Complexity Classification**: For each task, assess its difficulty and assign a `complexity` level (`heavy`, `medium`, or `light`). Use the guardrail heuristics in the `arcus:model-strategy` skill (Classification Guardrails section). Do NOT use model names — only difficulty levels.

### Step 6: Define DoD for each Task
- For every task, write a clear **Definition of Done (DoD)**.
- Ensure the DoD includes specific functional checks and verification metrics (unit/integration tests).

### Step 7: Write the Plan
Write a single self-contained plan using `./assets/plan-template.md`, containing both the design sections — `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and (dialogue mode only) `## Design Dialogue Answers` — and the machine-parsed atomic task list (`### Task N:` headings). This constitutes the `implementation_plan` output, written to the caller-provided output path (standalone default `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`); this skill constructs no ARCUS path itself. The task list is consumed by `test-spec-compiler` and the Code stage.

## Resources
- **Plan Template**: `./assets/plan-template.md`
- **Task Decomposition Guide**: `./references/task-decomposition.md`

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `story` | yes | markdown or text | The original user story requirement |
| `spec_grounding` | yes | markdown | Resolved ambiguities and implementation boundary from spec finalization |
| `mode` | yes | string | `dialogue` or `autonomous` — see **Execution Modes** |
| `context_pack` | no | markdown | Story-to-code correlations (flows, patterns, constraints); proceed without it, noting the omission |

### Outputs
- **`implementation_plan`** (markdown) — a single self-contained plan (sections per `./assets/plan-template.md`): scored candidate approaches, chosen approach + rationale, impacted-files map, design dialogue answers (dialogue mode), and the atomic `### Task N:` list (consumed downstream by `test-spec-compiler` and the Code stage). Written to the caller-provided path or, standalone, defaulting to `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`.

