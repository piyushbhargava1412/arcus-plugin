---
name: atomic-task-runner
description: Act as a Software Engineer to execute implementation tasks one at a time using a test-driven loop. Use when you have a blueprint and a test plan and are ready to mutate code. Trigger on "begin execution", "run tasks", or "implement story".
metadata:
    version: "1.0.0"
    team: krill
    type:
      - agents
      - engineering
---

# Atomic Task Runner

## Key Rules
- **NO GIT COMMITS**: Do not perform any `git commit` operations. Only stage changes using `git add` if necessary. The orchestrator owns the commit lifecycle.
- **Verification Gated**: Do not move to the next task until the current one is verified by a passing test.

## Overview
Acts as the **Core Software Engineer** to execute the construction phase. It processes the implementation blueprint sequentially, applying code changes and verifying them against the test plan using an iterative loop.

## Workflow

### Step 1: Ingest execution Plan
Read the following from `.aforge/specs/[STORY-ID]/`:
1. `blueprint.md`: The prioritized task list.
2. `test-plan.md`: The verification matrix.
3. `context-pack.md` & `assumptions.md`: The technical constraints.

### Step 2: Sequential Execution
Process tasks in the order they appear in the `blueprint.md`.
**For each task:**
1. **Prepare**: Extract the specific files and logic from `blueprint.md`. Cross-reference the **Task ID** in `test-plan.md` to identify all test scenarios that must pass for this task.
2. **Execute Loop**: Follow the **Iterative Development Loop** defined in `./references/iterative-development.md` (Red -> Green -> Refactor).
3. **Verify**: Run the project's test suite (e.g., `mvn test`, `pytest`, `npm test`) for the specific test case.
4. **Final Check**: Use `get_errors` on all modified files.

### Step 3: Handle Blockers
- If a test fails and cannot be fixed within a few iterations, or if you encounter a conflict not covered by the `context-pack.md`, stop and invoke the `context-drift-verifier`.
- Do not proceed to Task N+1 if Task N is not 100% compliant with its DoD.

### Step 4: Progress Reporting
- Keep track of which tasks are finished.
- Ensure all artifacts are saved to the workspace.

## Success Criteria
- **Verified**: Every task is backed by a passing test.
- **Pattern-Correct**: Code matches the repository's style and architectural rules.
- **Clean**: No linting or compilation errors remain.

## Resources
- **Iterative Loop Guide**: `./references/iterative-development.md`
