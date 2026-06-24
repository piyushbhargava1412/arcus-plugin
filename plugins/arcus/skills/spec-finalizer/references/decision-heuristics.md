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
generated. Still record the safest placeholder in the grounded spec, but list the item in the
`NEEDS_INPUT` block so the orchestrator can ask the user. A `zero-option` blocker is treated as a
hard blocker by the orchestrator regardless of interactive mode.

## Gated Question Recommendation Rule

In **dialogue (gated)** mode, every question put to the user about a `zero-option` /
`⚠️ LOW CONFIDENCE` item MUST be phrased so that:

- **Exactly one** option is explicitly marked **Recommended**, and
- that recommendation carries a **one-line rationale** for why it is recommended (grounded in the
  selection priority above — pattern consistency, simplicity, reversibility, safety), and
- the user is always offered an explicit **custom-answer** option ("or provide your own").

This makes the LLM's own recommendation visible while keeping the user's answer authoritative.
Record each chosen answer (recommended or custom) in the `## Dialogue Answers` section of the grounded spec.

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
