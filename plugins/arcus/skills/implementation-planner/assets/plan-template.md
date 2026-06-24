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
[The selected approach and why. In dialogue mode the user's choice is authoritative and overrides the
highest-scoring pick.]

## Design / Impacted Files
[High-level "How": the logic flow from entry point to data persistence, the design patterns applied
(aligned with `.context/design-and-coding-patterns.md` and honoring its **Avoid** rules), and the
impacted-file map.]
- `path/to/file1`: [Modification/Creation details]
- `path/to/file2`: [Modification/Creation details]

## Design Dialogue Answers

*(Dialogue mode only. One block per design question actually asked of the user. In autonomous mode
there is no interview; leave this section empty or omit it.)*

### Q1: [The design question asked]
**Options presented:**
- A — [approach] **(Recommended)** — *[one-line rationale]*
- B — [approach]
- Custom — [user may propose their own approach]

**Chosen answer**: [Recommended option / custom answer]
**Rationale**: [Why — user direction is authoritative]

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

