---
name: test-spec-compiler
description: Act as a QA Lead to design a comprehensive test matrix and verification plan for a story. Use when you have an implementation blueprint and need to define verification metrics before code is written. Trigger on "compile test plan", "design test suite", or "create test matrix".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - qa
---

# Test Spec Compiler

## Overview
Acts as the **QA Lead** to ensure high-quality, regression-free development. It evaluates the implementation tasks defined in the blueprint and generates a multi-layered test matrix (Unit, Integration, Edge Case) that the runner will use to satisfy the Definition of Done (DoD).

## Workflow

### Step 0:
Identify the skills folder (typically `.github/skills/` or `.agent/skills/`). Store this in an internal variable called `skills_folder`. In the below steps, resolve ${skills_folder} to the actual identified path.

### Step 1: Input Gathering
Read the following artifacts from `.aforge/specs/[STORY-ID]/`:
1. `blueprint.md`: The planned implementation tasks.
2. `assumptions.md`: The technical decisions (especially error-handling choices).
3. `context-pack.md`: To understand existing test patterns and flows.

### Step 2: Analysis & Dependency Mapping
- Analyze each task in `blueprint.md`.
- Identify the data touchpoints and integrations that require verification.
- Determine which existing test suites are impacted and where new suites are needed.

### Step 3: Design the Test Matrix
- Categorize tests into **Functional**, **Edge Case**, and **Error Handling**.
- **Crucial**: Map every test case to a specific **Task ID** from the `blueprint.md`. This allows the `atomic-task-runner` to know exactly which tests to implement in each iteration.
- **Complexity Classification**: For each test case, assess its difficulty and assign a `complexity` level (`heavy`, `medium`, or `light`). Use the guardrail heuristics in `${skills_folder}/shared/model-strategy.md` (Classification Guardrails → Test Complexity section). Do NOT use model names — only difficulty levels.
- **Alignment**: Ensure all test designs align with the **Testing Patterns** identified in the `context-pack.md`.
- Follow the strategies in `${skills_folder}/test-spec-compiler/references/qa-best-practices.md`.

### Step 4: Define Regression Targets
- Based on `context-pack.md`, identify which business flows might be indirectly impacted.
- Explicitly list these as regression checks in the test plan.

### Step 5: Persist the Test Plan
- Use `${skills_folder}/test-spec-compiler/assets/test-plan-template.md` to structure the final matrix.
- Write the output to `.aforge/specs/[STORY-ID]/test-plan.md`.

## Success Criteria
- **Comprehensive**: Covers Happy Path, Edge Cases, and expected Failures.
- **Actionable**: Provides specific file paths or method names for test implementation.
- **Pattern-Aligned**: Uses the same assertion and mocking styles as the existing codebase.

## Resources
- **Test Plan Template**: `${skills_folder}/test-spec-compiler/assets/test-plan-template.md`
- **QA Best Practices**: `${skills_folder}/test-spec-compiler/references/qa-best-practices.md`
