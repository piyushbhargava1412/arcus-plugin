---
name: spec-finalizer
description: >
  Analyze a user story for completeness and resolve all ambiguities by generating
  options grounded in repository patterns and selecting the best choice autonomously.
  Trigger on "finalize spec", "resolve ambiguities", or "ground the story".
metadata:
  version: "2.0.0"
  team: krill
  type:
    - agents
    - tech-lead
---

# Spec Finalizer (Story Completeness + Ambiguity Resolution)

## Overview

Acts as a Senior Tech Lead performing a completeness audit on a user story. Identifies every gap, generates 2-3 resolution options grounded in repository patterns, selects the best option with documented rationale, and verifies internal consistency before handing off to implementation planning.

## Inputs

- `.aforge/specs/[STORY-ID]/story.md` — The user story
- `.aforge/specs/[STORY-ID]/context-pack.md` — Repository context (flows, patterns, constraints)
- `.github/copilot-instructions.md` — Project-wide guardrails (if present)

## Output

- `.aforge/specs/[STORY-ID]/assumptions.md` — Structured decisions document

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

### Step 3: Decision Selection

For each ambiguity, select the best option using the priority order defined in `./references/decision-heuristics.md`.

Document the selected option and the rationale (1 sentence). Flag low-confidence decisions with ⚠️.

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

Write the decisions to `.aforge/specs/[STORY-ID]/assumptions.md` using the template at `./assets/assumptions-template.md`.

## Constraints

- **NO user interaction**: Do not ask questions. If an ambiguity is truly unresolvable (e.g., fundamental business logic with no repo precedent), select the safest option and flag it with `⚠️ LOW CONFIDENCE` in the rationale.
- **Maximum 15 ambiguities**: If more than 15 gaps are found, the story is likely too large. Note this in the output and proceed with the top 15 by severity.
- **Time-bound**: Do not spend excessive reasoning on trivial ambiguities. Use the fast-track rule from the decision heuristics.

## Success Criteria

- **Zero weasel words remain**: No "suitable", "as needed", "appropriate" in scope
- **Every gap has a decision**: Each ambiguity maps to exactly one selected option
- **Grounded in evidence**: Every decision references repository patterns
- **Internally consistent**: No contradictions between decisions
- **Clear boundary**: Included/Excluded lists are concrete and specific

## Resources

- **Assumptions Template**: `./assets/assumptions-template.md`
- **Decision Heuristics**: `./references/decision-heuristics.md`
