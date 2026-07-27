---
name: spec-finalizer
description: >
  Analyze a user story for completeness and resolve all ambiguities by generating
  options grounded in repository patterns and selecting the best choice autonomously, then record
  the least-confident decisions as a ranked Open Questions block for a human to optionally confirm.
  Trigger on "finalize spec", "resolve ambiguities", or "ground the story".
layer: capability
standalone: true
---

# Spec Finalizer (Story Completeness + Ambiguity Resolution)

## Overview

Acts as a Senior Tech Lead performing a completeness audit on a user story. Identifies every gap, generates 2-3 resolution options grounded in repository patterns, selects the best option with documented rationale, and verifies internal consistency before handing off to implementation planning.

It always produces a **fully resolved** spec, and separately records the decisions it was **least confident about** as a ranked `## Open Questions` block. It never converses and never blocks — surfacing those questions to a human is the orchestrator's job.

## Execution Model

**This skill never talks to the user and never blocks for input.** It has no mode parameter. On
every run it does exactly two things:

1. Produces a **complete, usable** `spec_grounding` — every ambiguity resolved, weak picks flagged
   `⚠️ LOW CONFIDENCE`, zero-option items given the safest available placeholder.
2. Emits a **ranked list of what it was least sure about** into the `## Open Questions` section of
   that same output.

Whether anyone *answers* those questions is the orchestrator's concern, not yours. An autonomous run
ignores them; a gated run surfaces them and re-invokes you with an `answers` input. You behave
identically either way — which is why you can always run as an isolated subagent.

### The answer round-trip

| `answers` input | What you do |
|-----------------|-------------|
| absent (first pass) | Run Steps 1–7. Emit `## Open Questions`. |
| present (resume pass) | Run Step 0 (map the answers), then **skip Steps 1–3** and resume at Step 4. |

The user's answers are authoritative and override your tentative picks.

**Round cap — 2.** Round 1 asks every currently-known open question. Round 2 asks **only** gaps that
round-1 answers newly created or revealed. A third round is forbidden: resolve whatever remains with
the safest option, flag it `⚠️ LOW CONFIDENCE`, and note in the artifact that it was auto-resolved
after the round cap. Determine the current round by counting `### Round N` subsections already
present under `## Dialogue Answers`.

## Workflow

### Step 0: Fold In Answers (resume pass only — skip when `answers` is absent)

You are being re-invoked with the user's free-form reply to the questions you previously wrote into
`## Open Questions`. Humans do not answer in a fixed syntax — expect *"for #2 go with B, and the
third one use your judgement"*.

1. Map each reply fragment to a question `id` from the existing `## Open Questions` block.
2. Append a `### Round N` subsection to `## Dialogue Answers` recording, per question: the `id`, the
   **verbatim quoted** fragment of the user's reply you matched to it, and the resolved choice.
   Writing the mapping down is mandatory — it is what makes a wrong match reviewable rather than
   invisible.
3. Any question left unmatched is either re-asked in round 2 (if rounds remain) or auto-resolved with
   an explicit `⚠️ LOW CONFIDENCE` note. **Never silently drop a question.**
4. Update the affected entries in `## Resolved Ambiguities` to reflect the user's answers.

**Guard — do not re-analyze.** If `## Open Questions` exists and every `id` in it is answered in
`## Dialogue Answers`, skip Steps 1–3 entirely and resume at Step 4. Re-running the completeness
scan is not just wasted work: it re-derives the ambiguity list non-deterministically, so `SF-3` may
no longer denote the same gap the user answered.

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

Produce a numbered list of identified ambiguities, assigning each a **stable id** of the form
`SF-1`, `SF-2`, … These ids are the contract the user's answers are matched against, so once
assigned they must not be renumbered between rounds. (The `SF-` prefix keeps this id space from
colliding with `arcus:implementation-planner`'s `PL-` ids, so one reply can address both.)

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

**Select the open-question set.** Identify the items that are `zero-option` or `⚠️ LOW CONFIDENCE` —
these are the candidates for `## Open Questions` (Step 6a). Never surface a fast-tracked or
high/medium-confidence decision; resolve those silently.

**Two rules govern what actually gets asked:**

- **Ask only independent gaps.** If resolving gap X would change or dissolve gap Y, surface X and
  hold Y back for round 2. Batching removes the natural protection the old one-at-a-time interview
  had — where answer 1 could dissolve question 3 before it was asked — so you must do that filtering
  yourself. Asking two questions whose answers can contradict each other is a defect.
- **Cap the batch at 7**, ranked by blast radius (highest first). Anything past the cap is
  auto-resolved with the safest option, flagged `⚠️ LOW CONFIDENCE`, and noted as capped. Five good
  questions beat fifteen mediocre ones, and a wall of questions is its own failure mode.

**HARD REQUIREMENT — every question carries YOUR own recommendation.** Every entry in
`## Open Questions` MUST present its options with **exactly one** marked `recommended: true` plus a
**one-line rationale**, and the reader must always be free to answer in their own words. This makes
your reasoning visible while keeping the user's answer authoritative.

Regardless of what is asked, the `spec_grounding` output is **always fully resolved** on this pass —
you never leave a decision blank pending an answer. `## Open Questions` records what you would
*prefer* a human to confirm, not what is missing.

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
template at `./assets/grounded-spec-template.md`. Fill `## Dialogue Answers` from the Step 0 mapping
when this is a resume pass; on a first pass leave it empty or omit it.

### Step 6a: Write `## Open Questions`

Write the Step 3 open-question set into the `## Open Questions` section of the **same output file**,
as a fenced `yaml` block. This is the machine-readable carrier the orchestrator reads — it lives in
the artifact, not in your return message, so it survives a cold resume where no conversation history
exists.

```yaml
- id: SF-1
  gap: <the gap, phrased as a question>
  reason: zero-option | low-confidence
  options:
    - {key: A, text: <option>, recommended: true, rationale: <one line: why this one>}
    - {key: B, text: <option>}
  tentative: A
```

Rules: exactly one option carries `recommended: true`; `tentative` names the option you actually
applied to the spec; `zero-option` entries may have an empty `options` list and `tentative: none`.
If nothing warrants asking, write the section with an empty list. **Do not add a `status` field** —
whether a question is answered is derived from `## Dialogue Answers`, which is the single source of
truth for that.

### Step 7: Emit the Summary Token (return message)

End your return message with exactly one line so the orchestrator can branch without re-reading the
file:

```
OPEN_QUESTIONS: <n>
```

where `<n>` is the number of entries written in Step 6a, or `none` when there are none.

## Constraints

- **Always fully resolved**: the `spec_grounding` output must end up fully resolved on **every** pass —
  where no answer is available, select the safest option and flag it `⚠️ LOW CONFIDENCE`, or mark it
  `zero-option` if no option can be formed. Never block waiting for an answer.
- **Never converse**: emit questions into `## Open Questions` and stop. Do not address the user
  directly, and do not ask a question in your return message.
- **At most 7 open questions per round, at most 2 rounds.**
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
| `context_pack` | no | markdown | Story-to-code correlations (flows, patterns, constraints); proceed without it, noting the omission |
| `guardrails` | no | markdown | Project guardrails from `AGENTS.md` / `CLAUDE.md` if present |
| `answers` | no | text | The user's free-form reply to a previously emitted `## Open Questions` block. When present, run Step 0 and skip Steps 1–3. |

### Output
- **`spec_grounding`** (markdown) — a self-contained grounded-spec record (sections per
  `./assets/grounded-spec-template.md`, including `## Open Questions`), written to the caller-provided
  path or, standalone, defaulting to `.arcus/outputs/spec-finalizer/<timestamp>.md`.
- **Return message** ends with `OPEN_QUESTIONS: <n>` or `OPEN_QUESTIONS: none`.
