---
name: test-spec-compiler
description: Act as a QA Lead to design a comprehensive test matrix and verification plan for a story. Use when you have an implementation plan and need to define verification metrics before code is written. Trigger on "compile test plan", "design test suite", or "create test matrix".
layer: coordinator
standalone: true
---

# Test Spec Compiler (thin wrapper)

This skill is the **user-facing entry point** for compiling a test plan. It owns the user
trigger only; the actual QA-Lead execution lives in the **`test-spec-compiler` agent**
(`plugins/arcus/agents/test-spec-compiler.md`), which holds the full test-matrix workflow
and its bundled template/reference assets.

## Behaviour

On activation (a user "compile test plan" / "design test suite" / "create test matrix"
request, or an orchestrator dispatch):

1. **Dispatch the execution agent** — dispatch the `test-spec-compiler` agent, resolving the
   dispatch target per **Agent Resolution** in `arcus:model-strategy`. Pass it the story's
   implementation plan (and grounded spec / context pack when available), and the output path
   for the resulting test plan.
2. **Relay** the agent's produced test plan (the `### Task N:` subsection of
   `## Detailed Test Matrix` per task, each case categorized as Happy Path / Edge Case /
   Error Case / Regression) back to the caller.
