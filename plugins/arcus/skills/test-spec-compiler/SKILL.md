---
name: test-spec-compiler
description: Act as a QA Lead to design a comprehensive test matrix and verification plan for a story. Use when you have an implementation blueprint and need to define verification metrics before code is written. Trigger on "compile test plan", "design test suite", or "create test matrix".
layer: capability
standalone: true
---

# Test Spec Compiler

## Overview
Acts as the **QA Lead** to ensure high-quality, regression-free development. It evaluates the implementation tasks defined in the blueprint and generates a multi-layered test matrix (Unit, Integration, Edge Case) that the runner will use to satisfy the Definition of Done (DoD).

## Workflow

### Step 1: Input Gathering
Read the following artifacts from `.arcus/specs/[STORY-ID]/`:
1. `blueprint.md`: The planned implementation tasks.
2. `plan.md`: The technical decisions (especially error-handling choices).
3. `context-pack.md`: For Testing Patterns and the **Relevant Flows** links. Follow those links into `.context/flows/*` for flow detail (Entry Points, Core Path, Data Touchpoints, Integrations, Tests).

### Step 2: Analysis & Dependency Mapping
- Analyze each task in `blueprint.md`.
- Identify the data touchpoints and integrations that require verification by reading the **Data Touchpoints** and **Integrations** sections of the flow files linked under Relevant Flows in `context-pack.md`.
- Determine which existing test suites are impacted and where new suites are needed.

### Step 3: Design the Test Matrix
- Categorize tests into **Functional**, **Edge Case**, and **Error Handling**.
- **Crucial**: Map every test case to a specific **Task ID** from the `blueprint.md`. This allows the `subagent-task-dispatcher` to know exactly which tests to implement in each iteration.
- **Complexity Classification**: For each test case, assess its difficulty and assign a `complexity` level (`heavy`, `medium`, or `light`). Use the guardrail heuristics in the `arcus:model-strategy` skill (Classification Guardrails → Test Complexity section). Do NOT use model names — only difficulty levels.
- **Alignment**: Ensure all test designs align with the **Testing Patterns** identified in the `context-pack.md`.
- Follow the strategies in `./references/qa-best-practices.md`.

### Step 4: Define Regression Targets
- Identify which business flows might be indirectly impacted by reading the flow files linked under **Relevant Flows** in `context-pack.md`.
- Explicitly list these as regression checks in the test plan.

### Step 5: Persist the Test Plan
- Use `./assets/test-plan-template.md` to structure the final matrix.
- Write the output to `.arcus/specs/[STORY-ID]/test-plan.md`.

## Success Criteria
- **Comprehensive**: Covers Happy Path, Edge Cases, and expected Failures.
- **Actionable**: Provides specific file paths or method names for test implementation.
- **Pattern-Aligned**: Uses the same assertion and mocking styles as the existing codebase.

## Resources
- **Test Plan Template**: `./assets/test-plan-template.md`
- **QA Best Practices**: `./references/qa-best-practices.md`

## Handoff Protocol

On finish, this skill marks its own checkpoint key complete:
`<BIN>/checkpoint.sh complete <STORY_ID> test_plan` (resolve `<BIN>` as `.arcus/bin/` →
`$ARCUS_HOME/scripts/`). It then names **only its immediate successor** — Implementation. It does
**NOT** enumerate the full pipeline; that lives only in the afk `arcus:arcus-controller`.

- **Successor**: Implementation — skill `arcus:implementation-runner`, resume phrase
  `"implement <STORY_ID>"`.
- **Same-session continuation**: on a `"yes"` / `"proceed"`, load and follow
  `arcus:implementation-runner` directly.
- **Cold resume** (new session): the user types `"implement <STORY_ID>"`, which re-activates
  Implementation by description-matching + the checkpoint.

Emit exactly this shape:

```
[Handoff] Test Plan complete → next: Implementation
Summary: <N test cases>
Artifacts: .arcus/specs/<STORY_ID>/test-plan.md
Proceed? Reply "yes" to run Implementation, or "no" to pause.
Resume later with: "implement <STORY_ID>"
```

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `implementation_plan` | markdown | Task breakdown with Definition of Done per task | orchestrator passes it / standalone user supplies it |
| `spec_grounding` | markdown | Technical decisions including error-handling choices (optional) | orchestrator passes it / standalone user supplies it |
| `context_pack` | markdown | Testing patterns and relevant flows (optional) | orchestrator passes it / standalone user supplies it |

### Outputs
- **`test_matrix`** (markdown) — Multi-layered test plan categorized by functional, edge case, and error handling; each test case mapped to a specific task ID with complexity classification and pattern alignment.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/test-spec-compiler/<story-id-or-timestamp>.md`. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/test-spec-compiler/<story-id-or-timestamp>.md`; orchestrators override with an explicit path.
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.
