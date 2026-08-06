# Reference: Decision Heuristics

When generating options and selecting decisions for ambiguities, apply these heuristics in priority order.

## Selection Priority (highest to lowest)

1. **Pattern Consistency** — Does it match how this repository already handles the same situation?
   - Check `context-pack.md` flows for precedent
   - If the repo already solves a similar problem, follow that pattern
2. **Simplicity** — Fewest new dependencies, least complex implementation
   - Prefer stdlib over third-party
   - Prefer inline logic over new abstractions for one-off cases
3. **Reversibility** — Easiest to change later if the decision is wrong
   - Prefer additive changes over destructive ones
   - Prefer configuration over hard-coding
4. **Safety** — No risk of data loss, security breach, or production incident
   - When in doubt, fail closed rather than open

## Option Generation Rules

- **Option A** should always be the conservative/safe choice (existing patterns)
- **Option B** should always be the pragmatic choice (simplest thing that works)
- **Option C** is optional — only when A and B have significant, non-obvious tradeoffs
- Every option MUST cite evidence from `context-pack.md` — a specific pattern, flow, or convention

## Fast-Track Decisions

Not every ambiguity needs full option analysis. Fast-track when:
- The repository has an obvious, consistent pattern for this exact case
- Only one viable option exists (document it, skip the table)
- The ambiguity is trivial (e.g., naming convention already established in the repo)

For fast-tracked decisions, write: **Decision**: [choice] — *Fast-tracked: [1-word reason]*

## Confidence Flagging

| Confidence | When to Use | Marker |
|------------|-------------|--------|
| High | Repo has clear precedent, choice is obvious | (none needed) |
| Medium | Repo has partial precedent, reasonable inference | (none needed) |
| Low | No repo precedent, purely judgement-based | ⚠️ LOW CONFIDENCE |
| Zero-option | No precedent AND no safe default can be formed | `zero-option` (escalate) |

Flag low-confidence decisions so downstream stages (implementation, review) know to handle them carefully.

`zero-option` is an **escalation signal**, not a decision: it means no viable option could be
generated. Still record the safest placeholder in the grounded spec, and list the item in the
`## Open Questions` block so the orchestrator can surface it. A `zero-option` item is always a
candidate for `## Open Questions`, whatever the caller intends to do with it.

## Open-Question Selection & Phrasing Rules

You never converse with the user. You write the `## Open Questions` block; the orchestrator decides
whether to surface it. Three rules govern what goes in it:

**1. Ask only mutually independent gaps.** If resolving gap X would change or dissolve gap Y,
surface X and hold Y back for a second round. Because all questions are asked at once, you no longer
get the protection the old one-at-a-time interview had — where an early answer could dissolve a later
question before it was asked. Two questions whose answers can contradict each other is a defect, so
do that filtering yourself.

**2. Cap at 7, ranked by blast radius.** Anything past the cap is auto-resolved with the safest
option, flagged `⚠️ LOW CONFIDENCE`, and noted as capped. Five good questions beat fifteen mediocre
ones.

**3. Every entry carries your own recommendation.** For each question:

- **Exactly one** option marked `recommended: true`, and
- that recommendation carries a **one-line rationale** grounded in the selection priority above —
  pattern consistency, simplicity, reversibility, safety — and
- the reader is always free to answer in their own words.

This makes your reasoning visible while keeping the user's answer authoritative. When answers come
back (via the `answers` input), record each one in `## Dialogue Answers` with the user's **verbatim**
wording next to the id you matched it to.

## Common Ambiguity Categories

| Category | Typical Resolution Strategy |
|----------|---------------------------|
| Missing error handling | Follow existing error patterns in the same layer (controller/service/repo) |
| Unclear data types | Use the most restrictive type that satisfies the requirement |
| Missing validation rules | Apply the same validation patterns used on similar fields in the codebase |
| Concurrency concerns | Default to the transaction/locking strategy already present in the project |
| Missing auth/security | Follow the authorization model of the nearest similar endpoint/operation |
| Scope ambiguity ("as needed") | Interpret as minimum viable — build only what's explicitly specified |
| Performance constraints | Unless stated, assume current throughput levels are sufficient |

## Internal Consistency Check

After all decisions are made, verify:
- No two decisions contradict each other
- Decisions in aggregate don't create a circular dependency
- The implementation boundary (included/excluded) is consistent with the decisions made
