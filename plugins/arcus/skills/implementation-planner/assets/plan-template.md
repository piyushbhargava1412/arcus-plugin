<!--
IMPLEMENTATION PLAN — owned solely by implementation-planner.
This is `.arcus/specs/<STORY-ID>/plan.md`. It holds BOTH the design deliberation and the atomic
task list. Its inputs are the grounded spec (`grounded-spec.md`) from spec-finalizer plus the story
and (optional) context pack. The `### Task N:` headings are parsed by the implementation loop.
-->

# Plan: [STORY-ID] - [STORY-TITLE]

## Approach Evaluation
[Scored comparison of the >=2 candidate approaches. One row per candidate; columns for blast radius,
backward-compat, complexity, security (where relevant), plus a total/notes column.]

| Approach | Blast radius | Backward-compat | Complexity | Security | Total / Notes |
|----------|--------------|-----------------|------------|----------|---------------|
| A — [name] |  |  |  |  |  |
| B — [name] |  |  |  |  |  |

## Chosen Approach & Reasoning
[The selected approach and why. On a resume pass the user's choice is authoritative and overrides the
highest-scoring pick.]

## Design / Impacted Files
[High-level "How": the logic flow from entry point to data persistence, the design patterns applied
(aligned with `.context/design-and-coding-patterns.md` and honoring its **Avoid** rules), and the
impacted-file map.]
- `path/to/file1`: [Modification/Creation details]
- `path/to/file2`: [Modification/Creation details]

## Open Questions

*(ALWAYS present. Holds the design choice ONLY when it is genuinely close-run — top two candidates
within 2 points — or hard to reverse (schema migration, public API shape, new dependency). When one
approach clearly dominates, write an empty list; do not manufacture a ceremonial question. The plan
is complete either way. Answered-ness is derived from `## Design Dialogue Answers` — do NOT add a
`status` field here.)*

```yaml
- id: PL-1
  gap: Which approach should we take for [the design decision]?
  reason: low-confidence
  options:
    - {key: A, text: [candidate A], recommended: true, rationale: [one line: why this one]}
    - {key: B, text: [candidate B]}
  tentative: A
```

## Design Dialogue Answers

*(Resume pass only — populated when the caller re-invokes with an `answers` input. One `### Round N`
subsection per round, max 2 rounds. On a first pass leave empty or omit.)*

### Round 1

| Question | What the user said (verbatim) | Resolved to |
|----------|-------------------------------|-------------|
| PL-1 | "[the exact fragment of the user's reply matched to this question]" | [option key or custom approach] |

*(Quoting verbatim is mandatory — it makes a mis-matched answer reviewable rather than invisible.
The user's answer is authoritative and overrides the highest-scoring pick.)*

---

## Implementation Tasks
[A sequence of atomic, testable tasks. Each task must be small enough to be executed in a single loop.]

### Task 1: [Task Title]
- **Complexity**: [heavy|medium|light]
- **Description**: [What needs to be done]
- **Files**: [Files involved in this specific task]
- **Technical Detail**: [Logic, algorithms, or API changes]
- **Definition of Done (DoD)**:
  - [ ] Requirement 1
  - [ ] Unit test covering [X] passes
  - [ ] No regression in [Y]

### Task 2: [Task Title]
- **Complexity**: [heavy|medium|light]
- **Description**: [Detailed description]
- **Files**: [Files involved]
- **Technical Detail**: [Logic]
- **Definition of Done (DoD)**:
  - [ ] Requirement 1
  - [ ] [X] integrated with [Y]

## Architecture & Safety
- **Design Patterns**: [List patterns used, e.g., Strategy, Factory — aligned with `.context/design-and-coding-patterns.md`, and honoring its **Avoid** rules]
- **Security Considerations**: [Data handling, Auth check]
- **Cleanup / Technical Debt**: [Any specific cleanups required after implementation]

---
*Next Step: Invoke `test-spec-compiler` to generate the test matrix for these tasks.*

