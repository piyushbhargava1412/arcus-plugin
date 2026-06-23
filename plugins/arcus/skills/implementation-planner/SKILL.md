---
name: implementation-planner
description: Act as a Tech Lead to design a technical approach and decompose a user story into atomic implementation tasks. Generates and scores at least two candidate approaches, and in dialogue (gated) mode interviews the user on the design decision before producing the blueprint. Use when you have a context pack and a grounded plan and need to generate a blueprint. Trigger on "plan the implementation", "generate implementation blueprint", or "break down the story".
layer: capability
standalone: true
---

# Implementation Planner

## Overview
Acts as the **Tech Lead** to bridge the gap between requirements and execution. It absorbs the context-specific artifacts and the grounded plan to design a concrete technical approach and a sequence of atomic, testable tasks. It generates **at least two** scored candidate approaches, deliberates on the chosen one (interviewing the user in dialogue mode), records the design deliberation into the shared deliberation record, and emits a machine-parsed atomic task list — together these form the `implementation_plan` output.

## Execution Modes

This skill receives `mode` as an explicit input parameter. It branches on the `mode` value:

| Mode | Behaviour |
|------|-----------|
| **dialogue** | Generate and score the candidate approaches, then **ask the user** to choose the design approach as an interview question (one option marked **Recommended** with a one-line rationale, plus an explicit custom-answer option), folding their answer in before designing. Record the Q&A in the `## Design Dialogue Answers` section of the `implementation_plan` output. |
| **autonomous** (afk) | Never block for input. Auto-select the **highest-scoring** candidate approach and record it. Skip the interview and leave the `## Design Dialogue Answers` section empty or omit it. |

In **both** modes you must still produce the design sections **and** the atomic task list — together the `implementation_plan` output (see Output). In dialogue mode the user's choice is authoritative and overrides the highest-scoring pick. If the `implementation_plan` output already has a populated `## Design Dialogue Answers` section, reuse it and do NOT re-ask the design question.

## Inputs

This skill runs **after** `spec-finalizer`, so the shared deliberation record already exists. Use the following named inputs:

1. The `story` input — The original User Story / Requirements.
2. The `context_pack` input — The repository subset relevant to the story (optional). Follow its **Relevant Flows** links into `.context/flows/*` for flow detail (Entry Points, Core Path, Data Touchpoints, Integrations, Tests).
3. The `spec_grounding` input — The grounded decisions from `spec-finalizer` (`## Context Grounding`, `## Resolved Ambiguities`, `## Dialogue Answers`, `## Implementation Boundary`, `## Guardrail Check`). These are the authoritative grounded choices that constrain the design.

## Output

This skill produces the following — nothing else, together forming the `implementation_plan` output (written to the caller-provided output path; standalone default `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`):

- The shared deliberation record — appends this skill's **owned** design sections (see ownership contract below): `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and `## Design Dialogue Answers` (**dialogue mode only**).
- The machine-parsed atomic task list (blueprint), structured from `./assets/blueprint-template.md`.

### Shared deliberation record — Section Ownership Contract

The shared deliberation record is co-owned with `spec_grounding` from `spec-finalizer`, which runs **before** this skill and owns the requirements half: `# Plan: [STORY-ID]` title, `## Context Grounding`, `## Resolved Ambiguities`, `## Dialogue Answers`, `## Implementation Boundary`, `## Guardrail Check`. The concrete write target is the output path the caller provides; this skill constructs no path itself. To avoid clobbering:

- The shared deliberation record (the `spec_grounding` content) will already exist when this skill runs. **Append** this skill's owned design sections to the existing record; do NOT recreate or overwrite the whole record.
- implementation-planner OWNS and writes ONLY: `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and `## Design Dialogue Answers`.
- Leave all of `spec-finalizer`'s owned sections intact. Never overwrite them.

## Workflow

**Read the `mode` input.** If `mode == dialogue`, follow the dialogue branch (interview the user on the design approach). If `mode == autonomous`, follow the autonomous branch (never block for input; auto-select the highest-scoring approach).

### Step 1: Input Analysis
Use the `story`, `context_pack`, and `spec_grounding` inputs (see Inputs). Treat the `spec_grounding` input's `## Resolved Ambiguities`, `## Dialogue Answers`, and `## Implementation Boundary` as authoritative grounded constraints — the design must honor them, not relitigate them.

### Step 2: Generate & Score ≥2 Candidate Approaches
Generate **AT LEAST 2** distinct candidate approaches for implementing the story (e.g. extend an existing component vs. introduce a new one; in-process vs. queued; reuse vs. rewrite). Each candidate must be grounded in evidence from the `context_pack` input and consistent with the `spec_grounding` input's grounded decisions.

Score each candidate on the following axes, **1–5** (5 = best for that axis), in the spirit of the blueprint template's Architecture & Safety section:

- **Blast radius** — how contained the change is (5 = minimal surface area touched).
- **Backward-compat** — preservation of existing behavior and contracts (5 = fully backward-compatible).
- **Complexity** — implementation/maintenance simplicity (5 = simplest).
- **Security** — where relevant; data handling, authz, exposure (5 = no new risk). Include this axis only when the story has a security dimension.

Record the scored comparison into the `## Approach Evaluation` section of the shared deliberation record as a table (one row per candidate, one column per axis, plus a total/notes column).

### Step 3: Select the Chosen Approach

**Dialogue mode — design interview — HARD REQUIREMENT:** After scoring, present the approach choice to the user as an INTERVIEW QUESTION. The question MUST list the candidate approaches, mark **EXACTLY ONE** option **Recommended** with a **one-line rationale** for why it is recommended, AND offer an explicit custom-answer option ("or propose your own approach"). This is mandatory in dialogue mode — no exceptions. Example shape:

```
Q: Which approach should we take for <the design decision>?
  A — <candidate A> (Recommended) — <one-line rationale for why A is recommended>
  B — <candidate B>
  C — <candidate C>
  Or propose your own approach.
```

The user's answer is authoritative and overrides the highest-scoring pick. Record the chosen approach + reasoning into the `## Chosen Approach & Reasoning` section of the shared deliberation record, and record the question, the options presented (including which was marked Recommended), and the user's answer into its `## Design Dialogue Answers` section.

**Autonomous mode:** NO interview — never block for input. Auto-select the **highest-scoring** candidate from Step 2 (break ties by lowest blast radius, then simplest). Record it into `## Chosen Approach & Reasoning` with the score-based rationale. Leave `## Design Dialogue Answers` empty or omit it.

### Step 4: Design the Approach
For the chosen approach:
- Map out the **Impacted Files**. Identify which existing files need modification and which new files are required, drawing on the Entry Points, Core Path, and Scope sections of the flow files linked under Relevant Flows in the `context_pack` input.
- Identify the core design patterns to be applied, drawing on `.context/design-and-coding-patterns.md` (design patterns in use, layering/structure, naming/idioms, error-handling conventions, and its **Avoid** rules) so the design matches established repository conventions.
- Synthesize the "How" — explain the logic flow from entry point to data persistence.

Record the impacted-file map and design notes into the `## Design / Impacted Files` section of the shared deliberation record.

### Step 5: Decompose into Atomic Tasks
- Break down the implementation into a sequence of small, manageable tasks.
- Follow the guidelines in `./references/task-decomposition.md`.
- **Constraint**: Each task must be "atomic"—focused on a single logical change and including its own validation (tests).
- **Complexity Classification**: For each task, assess its difficulty and assign a `complexity` level (`heavy`, `medium`, or `light`). Use the guardrail heuristics in the `arcus:model-strategy` skill (Classification Guardrails section). Do NOT use model names — only difficulty levels.

### Step 6: Define DoD for each Task
- For every task, write a clear **Definition of Done (DoD)**.
- Ensure the DoD includes specific functional checks and verification metrics (unit/integration tests).

### Step 7: Persist Design Deliberation + Blueprint
- **Shared deliberation record**: Append this skill's owned design sections — `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, and (dialogue mode only) `## Design Dialogue Answers`. Honor the section ownership contract: append to the existing record and leave `spec-finalizer`'s sections intact.
- **Blueprint (atomic task list)**: Use `./assets/blueprint-template.md` to structure the atomic task list. Together with the design sections this constitutes the `implementation_plan` output, written to the caller-provided output path (standalone default `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`); this skill constructs no ARCUS path itself. This machine-parsed task list is consumed by `test-spec-compiler` and the Code stage.

## Success Criteria
- **Actionable**: A junior agent should be able to pick up any task and execute it without further planning.
- **Ordered**: Tasks are sequenced logically to resolve dependencies.
- **Traceable**: Every task relates back to a requirement in the `story` input or a grounded decision in the `spec_grounding` input.
- **Deliberated**: At least two candidate approaches were scored, and the chosen approach is recorded with reasoning (and, in dialogue mode, with the recorded user interview).

## Resources
- **Blueprint Template**: `./assets/blueprint-template.md`
- **Shared deliberation record (owned design sections)**: the `implementation_plan` output at the caller-provided output path
- **Task Decomposition Guide**: `./references/task-decomposition.md`

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

> **Section ownership**: governed by the manifest at `plugins/arcus/schemas/plan.md.schema.yaml`
> (resolve via the plugin / `ARCUS_HOME` path, never a hard-coded `.arcus/` path). implementation-planner
> owns and writes ONLY: `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`,
> `## Design Dialogue Answers` (dialogue mode). It never writes spec-finalizer's requirements sections.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `story` | markdown or text | The original user story requirement | orchestrator passes it / standalone user supplies it |
| `context_pack` | markdown | Story-to-code correlations including flows, patterns, constraints | orchestrator passes it / standalone user supplies it |
| `spec_grounding` | markdown | Resolved ambiguities and implementation boundary from spec finalization | orchestrator passes it / standalone user supplies it |
| `mode` | string | Execution mode: `dialogue` (interview user on design approach choice) or `autonomous` (auto-select highest-scoring approach) | orchestrator passes it / standalone user supplies it |

### Outputs
- **`implementation_plan`** (markdown) — Atomic task breakdown with Definition of Done per task, scored candidate approaches with chosen approach and rationale, impacted files map, and design dialogue answers (if mode=dialogue). Structured as blueprint and design sections in a shared plan document.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`. The capability never asks the user where to write.

### Mode
| Mode | Behaviour |
|------|-----------|
| `dialogue` | Interview the user one question at a time on low-confidence / open items; each question presents one **Recommended** option + rationale + a custom-answer option; fold answers in before proceeding. |
| `autonomous` | Never block. Auto-resolve with the safest option, flag weak picks, proceed. |

The caller passes `mode` explicitly (full explicit-parameter wiring is finalized in a later task).

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`; orchestrators override with an explicit path.
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.

## Caller Guidance

This capability receives **named inputs**, not file paths. How they arrive depends on the caller:

- **Pipeline (via an orchestrator/coordinator)**: the caller resolves the ARCUS workspace spec
  paths (the per-story spec directory under the ARCUS workspace) and passes the **content** of each
  input plus an explicit `output_path`. The capability constructs no ARCUS paths itself.
- **Standalone (a developer who has never used ARCUS)**: the user supplies the `story` text (and
  optionally `context_pack` and `spec_grounding`) directly — pasted inline or as a file they point
  to. Optional inputs absent → proceed without them and note the omission. Output defaults to
  `.arcus/outputs/implementation-planner/<story-id-or-timestamp>.md`.

The skill body below is written in terms of the named inputs; it never reads a hard-coded
ARCUS workspace spec path.
