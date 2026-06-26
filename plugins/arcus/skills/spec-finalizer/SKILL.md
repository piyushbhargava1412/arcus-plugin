---
name: spec-finalizer
description: >
  Analyze a user story for completeness and resolve all ambiguities by generating
  options grounded in repository patterns and selecting the best choice autonomously.
  Trigger on "finalize spec", "resolve ambiguities", or "ground the story".
layer: capability
standalone: true
---

# Spec Finalizer (Story Completeness + Ambiguity Resolution)

## Overview

Acts as a Senior Tech Lead performing a completeness audit on a user story. Identifies every gap, generates 2-3 resolution options grounded in repository patterns, selects the best option with documented rationale, and verifies internal consistency before handing off to implementation planning.

## Execution Modes

This skill receives `mode` as an explicit input parameter. It branches on the `mode` value:

| Mode | Behaviour |
|------|-----------|
| **dialogue** | Auto-resolve what you confidently can, then **ask the user** the highest-impact open questions **one at a time**, folding each answer in before asking the next. Each question presents **exactly one Recommended option** with a **one-line rationale** plus an explicit custom-answer option. Record answers in the `## Dialogue Answers` section of the `spec_grounding` output. |
| **autonomous** (afk) | Never block for input. Auto-resolve every ambiguity with the safest option, flagging weak picks `⚠️ LOW CONFIDENCE`. Surface unresolved items via the Step 7 `NEEDS_INPUT` escalation block. Skip / leave empty the `## Dialogue Answers` section. |

In **both** modes you must still produce a complete `spec_grounding` output (spec-finalizer's owned
sections — see Output). In dialogue mode, the user's answers are authoritative and override your
tentative picks. If the `spec_grounding` output already has a populated `## Dialogue Answers` section,
reuse it and do NOT re-ask questions already answered.

## Workflow

**Read the `mode` input.** If `mode == dialogue`, follow the dialogue branch (interview the user on low-confidence items). If `mode == autonomous`, follow the autonomous branch (never block for input; auto-resolve everything).

### Step 1: Completeness Analysis

Use the `story` input and the `context_pack` input. Systematically scan for:

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

Each option MUST be grounded in evidence from the `context_pack` input — reference specific patterns, flows, or conventions found in the repository.

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
`## Dialogue Answers` section of the `spec_grounding` output. The user's answer is authoritative
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

Write the decisions to the `spec_grounding` output (at the caller-provided output path) using the
template at `./assets/grounded-spec-template.md`. In dialogue mode, fill the `## Dialogue Answers`
section from the recorded Q&A; in autonomous mode, leave it empty or omit it.

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

This block is informational. You still resolve every ambiguity autonomously in the grounded spec
(zero-option items get the safest available placeholder, flagged `⚠️ LOW CONFIDENCE`). The
orchestrator — not this skill — decides whether to pause and ask the user.

## Constraints

- **Always fully resolved**: regardless of mode (see Execution Modes), the `spec_grounding` output must
  end up fully resolved — where no answer is available, select the safest option and flag it
  `⚠️ LOW CONFIDENCE`, or mark it `zero-option` if no option can be formed.
- **Maximum 15 ambiguities**: If more than 15 gaps are found, the story is likely too large. Note this in the output and proceed with the top 15 by severity.
- **Time-bound**: Do not spend excessive reasoning on trivial ambiguities. Use the fast-track rule from the decision heuristics.

## Resources

- **Grounded Spec Template**: `./assets/grounded-spec-template.md`
- **Decision Heuristics**: `./references/decision-heuristics.md`

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `story` | yes | markdown or text | The user story to analyze for completeness |
| `mode` | yes | string | `dialogue` or `autonomous` — see **Execution Modes** |
| `context_pack` | no | markdown | Story-to-code correlations (flows, patterns, constraints); proceed without it, noting the omission |
| guardrails | no | markdown | Project guardrails from `AGENTS.md` / `CLAUDE.md` if present |

### Output
- **`spec_grounding`** (markdown) — a self-contained grounded-spec record (sections per
  `./assets/grounded-spec-template.md`), written to the caller-provided path or, standalone, defaulting
  to `.arcus/outputs/spec-finalizer/<timestamp>.md`.
