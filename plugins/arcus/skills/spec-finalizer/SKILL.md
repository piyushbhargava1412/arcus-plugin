---
name: spec-finalizer
description: >
  Analyze a user story for completeness and resolve all ambiguities by generating
  options grounded in repository patterns and selecting the best choice autonomously.
  Trigger on "finalize spec", "resolve ambiguities", or "ground the story".
metadata:
   version: "2.2.0"
   team: krill
   type:
    - agents
    - tech-lead
---

# Spec Finalizer (Story Completeness + Ambiguity Resolution)

## Overview

Acts as a Senior Tech Lead performing a completeness audit on a user story. Identifies every gap, generates 2-3 resolution options grounded in repository patterns, selects the best option with documented rationale, and verifies internal consistency before handing off to implementation planning.

## Execution Modes

This skill runs in one of two modes. The caller (the `arcus:arcus-controller`) decides which:

| Mode | Context | Behaviour |
|------|---------|-----------|
| **dialogue** (gated) | Runs in the **main thread** | Auto-resolve what you confidently can, then **ask the user** the highest-impact open questions **one at a time**, folding each answer in before asking the next. Record answers in the `## Dialogue Answers` section of `plan.md`. |
| **one-shot** (afk / subagent) | Runs as an isolated subagent | Never block for input. Auto-resolve every ambiguity (safest option, flagged `⚠️ LOW CONFIDENCE` where weak), and surface unresolved items via the Step 7 `NEEDS_INPUT` block. Skip / leave empty the `## Dialogue Answers` section. |

In **both** modes you must still produce a complete `plan.md` (spec-finalizer's owned sections —
see Output). In dialogue mode, the user's answers are authoritative and override your tentative
picks. If `plan.md` already has a populated `## Dialogue Answers` section, reuse it and do NOT
re-ask questions already answered.

## Inputs

- `.arcus/specs/[STORY-ID]/story.md` — The user story
- `.arcus/specs/[STORY-ID]/context-pack.md` — Repository context (flows, patterns, constraints)
- Project-wide guardrails (if present in `AGENTS.md` or `CLAUDE.md`)

## Output

This skill produces **exactly** the following — nothing else:

- `.arcus/specs/[STORY-ID]/plan.md` — A single **shared** deliberation record. spec-finalizer
  writes ONLY its owned sections into it (always): `# Plan: [STORY-ID]` title, `## Context Grounding`,
  `## Resolved Ambiguities`, `## Dialogue Answers` (**dialogue mode only**), `## Implementation Boundary`,
  and `## Guardrail Check`.

### Shared plan.md — Section Ownership Contract

`plan.md` is a single file shared with `implementation-planner`, which runs **after** this skill and
**appends** its own design sections (`## Approach Evaluation`, `## Chosen Approach & Reasoning`,
`## Design / Impacted Files`, `## Design Dialogue Answers`) to the SAME file. To avoid clobbering:

- spec-finalizer runs first, so it **creates** `plan.md` (with the `# Plan: [STORY-ID]` title) if it
  is absent.
- If `plan.md` already exists, **append/merge** — replace only the sections spec-finalizer owns (listed
  above) in place and leave any `implementation-planner` design sections untouched. Never overwrite the
  whole file.
- spec-finalizer must only ever write or replace its OWN sections.

## Workflow

### Step 1: Completeness Analysis

Read `story.md` and `context-pack.md`. Systematically scan for:

| Category | What to Look For |
|----------|-----------------|
| **Missing Error States** | Happy path defined but no error/edge cases specified |
| **Ambiguous Data Mapping** | Vague field names, unclear transformations, missing types |
| **Unclear Scope Boundaries** | "As needed", "suitable", "appropriate" — any weasel words |
| **Missing Non-Functionals** | No mention of performance, concurrency, or scale constraints |
| **Integration Gaps** | External calls mentioned without error handling or retry strategy |
| **Security Gaps** | Data access without authorization model, PII without masking |
| **Testing Gaps** | Behaviors described without clear acceptance criteria |

Produce a numbered list of identified ambiguities.

### Step 2: Option Generation (Per Ambiguity)

Consult `./references/decision-heuristics.md` for resolution strategies and option generation rules.

For EACH ambiguity identified in Step 1, generate **2-3 options**:

- **Option A**: The conservative/safe choice (aligns with existing patterns)
- **Option B**: The pragmatic choice (simplest implementation that works)
- **Option C** (optional): An alternative if A and B have significant tradeoffs

Each option MUST be grounded in evidence from `context-pack.md` — reference specific patterns, flows, or conventions found in the repository.

**Fast-track rule**: If the repository has an obvious, consistent pattern for a given ambiguity, fast-track the decision (skip the options table). See decision-heuristics.md for when this applies.

**Zero-option case**: If you genuinely cannot construct even one viable resolution for an ambiguity
(no repo precedent AND no reasonable default — resolving it would require fabricating business
intent), do NOT invent one. Mark the ambiguity as `zero-option` and carry it into the escalation
list (see Step 7). This is distinct from low-confidence, where a safe option does exist.

### Step 3: Decision Selection

For each ambiguity, select the best option using the priority order defined in `./references/decision-heuristics.md`.

Document the selected option and the rationale (1 sentence). Flag low-confidence decisions with ⚠️.

**Dialogue mode only — confirm with the user:** After autonomous selection, identify the items that
are `zero-option` or `⚠️ LOW CONFIDENCE`. Ask the user about these **one at a time**, presenting the
gap and the generated options. Incorporate each answer before asking the next. Stop once the remaining
ambiguities can be resolved confidently. Do not ask about fast-tracked or high/medium-confidence
decisions — resolve those silently.

**HARD REQUIREMENT — every gated question presents YOUR own recommendation.** When you ask the user
about a `zero-option` / `⚠️ LOW CONFIDENCE` item, the question MUST present its options with **exactly
one** option explicitly marked **Recommended** plus a **one-line rationale** for why it is recommended,
AND an explicit custom-answer option (e.g. "or provide your own"). This is mandatory for every gated
question — no exceptions. Example shape:

```
Q: <the gap, phrased as a question>
  A — <option A> (Recommended) — <one-line rationale for why A is recommended>
  B — <option B>
  C — <option C>
  Or provide your own answer.
```

Record each chosen answer (whether the recommended option or the user's custom answer) into the
`## Dialogue Answers` section of `.arcus/specs/[STORY-ID]/plan.md`. The user's answer is authoritative
and overrides your recommendation.

### Step 4: Boundary Definition

Based on the resolved ambiguities, explicitly define:
- **Included**: What WILL be built (concrete list)
- **Excluded**: What is explicitly OUT OF SCOPE (prevents drift)

### Step 5: Self-Review (Internal Consistency)

Before writing the output, verify:
- No two decisions contradict each other
- Decisions in aggregate don't create circular dependencies
- The implementation boundary is consistent with the decisions made
- No weasel words remain in the scope definition

Fix any issues inline. Do not skip this step.

### Step 6: Write Output

Write the decisions to `.arcus/specs/[STORY-ID]/plan.md` using the template at
`./assets/plan-template.md`. Respect the **section ownership contract** (see Output): create `plan.md`
if it does not exist; if it already exists, replace only spec-finalizer's owned sections in place and
leave any `implementation-planner` design sections intact — never overwrite the whole file. In dialogue
mode, fill the `## Dialogue Answers` section from the recorded Q&A; in one-shot mode, leave it empty or
omit it.

### Step 7: Emit Escalation Signal (return message)

After writing the file, your return message to the orchestrator MUST end with a machine-readable
escalation block so the orchestrator can decide whether to involve the user. List every ambiguity
that is either `zero-option` or `⚠️ LOW CONFIDENCE` (omit fast-tracked / high / medium decisions):

```
NEEDS_INPUT:
- id: <ambiguity number from Step 1>
  reason: zero-option | low-confidence
  gap: <one-line description of what is unresolved>
  options: <"A: ...; B: ..." — or "none" for zero-option>
  tentative: <the option you selected autonomously — or "none" for zero-option>
  why: <one line: why confidence is low / why no option could be formed>
```

If there are no such ambiguities, emit exactly:

```
NEEDS_INPUT: none
```

This block is informational. You still resolve every ambiguity autonomously in `plan.md`
(zero-option items get the safest available placeholder, flagged `⚠️ LOW CONFIDENCE`). The
orchestrator — not this skill — decides whether to pause and ask the user.

## Constraints

- **User interaction is mode-dependent**: In **one-shot** mode you cannot talk to the user — never
  block for input; resolve every ambiguity autonomously and surface weak items via the Step 7
  `NEEDS_INPUT` block. In **dialogue** mode you may ask the user directly (one question at a time)
  about `zero-option` / `⚠️ LOW CONFIDENCE` items only. Either way, `plan.md` must end up fully
  resolved: where no answer is available, select the safest option and flag it `⚠️ LOW CONFIDENCE`,
  or mark it `zero-option` if no option can be formed.
- **Maximum 15 ambiguities**: If more than 15 gaps are found, the story is likely too large. Note this in the output and proceed with the top 15 by severity.
- **Time-bound**: Do not spend excessive reasoning on trivial ambiguities. Use the fast-track rule from the decision heuristics.

## Success Criteria

- **Zero weasel words remain**: No "suitable", "as needed", "appropriate" in scope
- **Every gap has a decision**: Each ambiguity maps to exactly one selected option
- **Grounded in evidence**: Every decision references repository patterns
- **Internally consistent**: No contradictions between decisions
- **Clear boundary**: Included/Excluded lists are concrete and specific

## Resources

- **Plan Template**: `./assets/plan-template.md`
- **Decision Heuristics**: `./references/decision-heuristics.md`
