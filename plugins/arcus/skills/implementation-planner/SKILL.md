---
name: implementation-planner
description: Act as a Tech Lead to design a technical approach and decompose a user story into atomic implementation tasks. Generates and scores at least two candidate approaches, selects one, and records the choice as an Open Question when it is close-run or hard to reverse. Use when you have a grounded spec (and optionally a context pack) and need to generate the implementation plan. Trigger on "plan the implementation", "generate implementation plan", or "break down the story".
layer: capability
standalone: true
---

# Implementation Planner

## Overview
Acts as the **Tech Lead** to bridge the gap between requirements and execution. It absorbs the context-specific artifacts and the grounded spec to design a concrete technical approach and a sequence of atomic, testable tasks. It generates **at least two** scored candidate approaches, selects one, and writes a single self-contained plan — the design deliberation plus a machine-parsed atomic task list — as the `implementation_plan` output.

The plan is always complete. When the design choice was close-run or hard to reverse, the skill additionally records it in `## Open Questions` for a human to optionally confirm. It never converses and never blocks — surfacing that question is the orchestrator's job.

## Execution Model

**This skill never talks to the user and never blocks for input.** It has no mode parameter. On
every run it does exactly two things:

1. Produces a **complete, usable** `implementation_plan` — approaches scored, one chosen, design
   mapped, tasks decomposed with a DoD each.
2. Emits the design decisions it was **least confident about** into the `## Open Questions` section
   of that same output.

Whether anyone *answers* those questions is the orchestrator's concern, not yours. An autonomous run
ignores them; a gated run surfaces them and re-invokes you with an `answers` input. You behave
identically either way — which is why you can always run as an isolated subagent.

### The answer round-trip

| `answers` input | What you do |
|-----------------|-------------|
| absent (first pass) | Run Steps 1–7. Emit `## Open Questions`. |
| present (resume pass) | Run Step 0 (map the answers), then **skip Step 2** and resume at Step 3 with the user's choice. |

The user's answer is authoritative and overrides the highest-scoring pick.

**Round cap — 2**, counted from the `### Round N` subsections under `## Design Dialogue Answers`.
Beyond that, take the highest-scoring approach, flag it `⚠️ LOW CONFIDENCE`, and note that it was
auto-resolved after the cap.

## Workflow

### Step 0: Fold In Answers (resume pass only — skip when `answers` is absent)

You are being re-invoked with the user's free-form reply to the questions you previously wrote into
`## Open Questions`. Expect prose, not a fixed syntax.

1. Map each reply fragment to a question `id` from the existing `## Open Questions` block.
2. Append a `### Round N` subsection to `## Design Dialogue Answers` recording, per question: the
   `id`, the **verbatim quoted** fragment you matched to it, and the resolved choice. Writing the
   mapping down is mandatory — it is what makes a wrong match reviewable rather than invisible.
3. Any question left unmatched is re-asked (if a round remains) or auto-resolved with an explicit
   `⚠️ LOW CONFIDENCE` note. **Never silently drop a question.**

**Guard — do not re-score.** If `## Open Questions` exists and every `id` in it is answered in
`## Design Dialogue Answers`, skip Step 2 and go straight to Step 3 using the answered choice. The
`## Approach Evaluation` table already on the artifact is authoritative — re-deriving it would
renumber the candidates the user just chose between.

### Step 1: Input Analysis
Use the `story`, `context_pack`, and `spec_grounding` inputs (see Inputs). Treat the `spec_grounding` input's `## Resolved Ambiguities`, `## Dialogue Answers`, and `## Implementation Boundary` as authoritative grounded constraints — the design must honor them, not relitigate them.

### Step 2: Generate & Score ≥2 Candidate Approaches
Generate **AT LEAST 2** distinct candidate approaches for implementing the story (e.g. extend an existing component vs. introduce a new one; in-process vs. queued; reuse vs. rewrite). Each candidate must be grounded in evidence from the `context_pack` input and consistent with the `spec_grounding` input's grounded decisions.

Score each candidate on the following axes, **1–5** (5 = best for that axis):

- **Blast radius** — how contained the change is (5 = minimal surface area touched).
- **Backward-compat** — preservation of existing behavior and contracts (5 = fully backward-compatible).
- **Complexity** — implementation/maintenance simplicity (5 = simplest).
- **Security** — where relevant; data handling, authz, exposure (5 = no new risk). Include this axis only when the story has a security dimension.

Record the scored comparison into the `## Approach Evaluation` section of the plan as a table (one row per candidate, one column per axis, plus a total/notes column).

### Step 3: Select the Chosen Approach

**Always select autonomously.** Take the **highest-scoring** candidate from Step 2 (break ties by
lowest blast radius, then simplest), or — on a resume pass — the option the user chose in Step 0,
which overrides the score. Record it into `## Chosen Approach & Reasoning` with its rationale.

**Then decide whether the choice is worth confirming.** Surface the design decision as an open
question (Step 7a) when the top two candidates score **within 2 points** of each other, or when the
chosen approach is **hard to reverse** (schema migration, public API shape, dependency addition).
When one approach clearly dominates, do **not** manufacture a question — resolve it silently and
leave `## Open Questions` empty. An open question is a signal that a human's judgement would
genuinely change the outcome, not a ceremonial checkpoint.

**HARD REQUIREMENT — the question carries YOUR own recommendation.** Any entry you write into
`## Open Questions` MUST mark **exactly one** option `recommended: true` with a **one-line
rationale**, and the reader must always be free to propose their own approach.

Note that the plan is **complete either way** — you never leave the design blank pending an answer.

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
Write a single self-contained plan using `./assets/plan-template.md`, containing both the design sections — `## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`, `## Open Questions`, and (resume pass only) `## Design Dialogue Answers` — and the machine-parsed atomic task list (`### Task N:` headings). This constitutes the `implementation_plan` output, written to the caller-provided output path (standalone default `.arcus/outputs/implementation-planner/<timestamp>.md`); this skill constructs no ARCUS path itself. The task list is consumed by `test-spec-compiler` and the Code stage.

### Step 7a: Write `## Open Questions`

Write the Step 3 decision — if it met the confirm-worthy bar — into the `## Open Questions` section
of the **same output file**, as a fenced `yaml` block. This is the machine-readable carrier the
orchestrator reads; it lives in the artifact, not in your return message, so it survives a cold
resume where no conversation history exists.

```yaml
- id: PL-1
  gap: Which approach should we take for <the design decision>?
  reason: low-confidence
  options:
    - {key: A, text: <candidate A>, recommended: true, rationale: <one line: why this one>}
    - {key: B, text: <candidate B>}
  tentative: A
```

Ids use the `PL-` prefix so they never collide with `arcus:spec-finalizer`'s `SF-` ids and a single
user reply can address both. Exactly one option carries `recommended: true`; `tentative` names the
approach you actually applied. If the choice was clear-cut, write the section with an empty list.
**Do not add a `status` field** — answered-ness is derived from `## Design Dialogue Answers`.

### Step 7b: Emit the Summary Token (return message)

End your return message with exactly one line:

```
OPEN_QUESTIONS: <n>
```

where `<n>` is the number of entries written in Step 7a, or `none` when there are none.

## Resources
- **Plan Template**: `./assets/plan-template.md`
- **Task Decomposition Guide**: `./references/task-decomposition.md`

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `story` | yes | markdown or text | The original user story requirement |
| `spec_grounding` | yes | markdown | Resolved ambiguities and implementation boundary from spec finalization |
| `context_pack` | no | markdown | Story-to-code correlations (flows, patterns, constraints); proceed without it, noting the omission |
| `answers` | no | text | The user's free-form reply to a previously emitted `## Open Questions` block. When present, run Step 0 and skip Step 2. |

### Outputs
- **`implementation_plan`** (markdown) — a single self-contained plan (sections per `./assets/plan-template.md`): scored candidate approaches, chosen approach + rationale, impacted-files map, `## Open Questions`, design dialogue answers (resume pass), and the atomic `### Task N:` list (consumed downstream by `test-spec-compiler` and the Code stage). Written to the caller-provided path or, standalone, defaulting to `.arcus/outputs/implementation-planner/<timestamp>.md`.
- **Return message** ends with `OPEN_QUESTIONS: <n>` or `OPEN_QUESTIONS: none`.

