---
name: code-simplifier
description: >
  Refactor gate for the ARCUS task loop. Runs after GREEN (tests passing) and before
  spec-check. Mutates changed files toward simplicity using repository conventions, then
  re-runs the test suite. Returns SIMPLIFIED if the suite stays green, REVERTED if it
  goes red (mutations rolled back). Skipped on `light` complexity tasks. Dispatched by
  arcus:subagent-task-dispatcher — not invoked directly by users.
layer: coordinator
standalone: false
user-invocable: false
disable-model-invocation: true
disallowed-tools: AskUserQuestion
---

## Overview

This skill implements the **REFACTOR** phase of red-green-refactor inside the ARCUS dispatcher loop.

It is a *mutator*: it applies simplifications to task-changed files and re-runs the test suite to
confirm no regressions. It must **never** self-certify spec compliance — that responsibility belongs
exclusively to the subsequent `arcus:spec-compliance-reviewer` step.

This skill runs as a subagent dispatched by `arcus:subagent-task-dispatcher` at `medium` complexity
(resolved via `arcus:model-strategy` → `sonnet`). It is skipped for tasks whose complexity is
classified as `light`.

---

## Inputs

The following inputs are provided in the subagent prompt by the dispatcher:

1. **Changed files** — the exact set of files modified by the task implementation.
2. **Repository conventions** — read at runtime from `AGENTS.md`, `CLAUDE.md`,
   `context-pack.md`, `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md`. Never hard-code language or
   framework rules; conventions are always sourced from repository artifacts.
3. **Task DoD** — the Definition of Done for this task, sourced from `blueprint.md`. Used
   to guard test pruning: no test that directly asserts a named DoD requirement may be removed.

---

## Refactoring Rules

Apply simplifications that **reduce cognitive complexity without changing observable behaviour**:

- Extract repeated logic into well-named helpers.
- Flatten unnecessary nesting (e.g., early returns, guard clauses).
- Improve naming for clarity and consistency with surrounding code.
- Remove dead code that is provably unreachable or unused within the changed scope.
- Consolidate related logic that is artificially split across multiple locations.

**Convention adherence:** follow repository-specific conventions discovered at runtime from
`AGENTS.md`, `CLAUDE.md`, and `context-pack.md`. This skill is **language-agnostic** — do NOT
hard-code rules for any specific language, runtime, or framework.

**DoD-safe test-pruning rule:**
- *Permitted:* prune near-duplicate parametric test cases where an existing case already covers
  the same boundary; prune wrong-layer tests where a fast unit test already covers the same
  behaviour as a slow integration test.
- *Forbidden:* remove any test that directly asserts a named requirement from the task's DoD list
  in `blueprint.md`.

**Hard boundaries — never:**
- Change observable behaviour, public interfaces, or return values.
- Add new features or expand scope beyond what the task implemented.
- Modify files outside the changed-file set provided by the dispatcher.

---

## Protocol

**Step 1 — Read inputs**
Load the changed files and read repository conventions from `AGENTS.md`, `CLAUDE.md`,
`context-pack.md`, `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md`. Load the task DoD from `blueprint.md`.

**Step 2 — Identify opportunities**
List simplification candidates briefly (one line each) before applying any mutations. Do not
apply changes that cannot be justified against a rule in the Refactoring Rules section above.

**Step 3 — Apply mutations**
Edit the changed files in place. Apply only the candidates identified in Step 2.

**Step 4 — Re-run the test suite**
Execute the same test command used during the TDD verify step for this task (provided by the
dispatcher in the subagent prompt).

**Step 5 — GREEN path**
If the suite is GREEN → return `SIMPLIFIED` with a one-line summary of what was changed.

**Step 6 — RED path**
If the suite is RED → revert all mutations (restore the pre-simplification state of every file
touched in Step 3) → return `REVERTED` with an explanation of which mutation caused the failure.

---

## Return Contract

```
SIMPLIFIED — mutations applied, suite still green. Summary: <one line>.
REVERTED   — mutations caused test failure; all changes rolled back. Reason: <one line>.
```

The downstream `arcus:spec-compliance-reviewer` step reads this return value. `SIMPLIFIED` and
`REVERTED` are the only valid return tokens; any other output is treated as an error by the
dispatcher.

---

## Layer Rules

> Layer: **coordinator** — a thin, **stateless** sequencer of capabilities. Owns **no** pipeline state: no checkpoint reads/writes, no branch ops, no stage gates. Its only job is to call capabilities in a fan-out/consolidate or chained pattern and pass each one explicit inputs.

- **Owned state**: none.
- **Sequences**: Read repository conventions (from `AGENTS.md`, `CLAUDE.md`, `context-pack.md`, `.context/testing-patterns.md`, `.context/design-and-coding-patterns.md`) + task DoD (from `blueprint.md`) + changed files → identify simplification candidates → apply mutations in place → re-run test suite → on GREEN return SIMPLIFIED, on RED revert mutations and return REVERTED.
- **Delegation**: Linear chain — this is a DoD-guarded refactor mutator, not a fan-out coordinator. No subagents dispatched; runs inline as a self-contained simplification pass.

## Constraints

- **Model tier:** `medium` (dispatched by coordinator via `arcus:model-strategy`; resolves to `sonnet`).
- **No `context: fork`** — runs as a standard subagent within the dispatcher loop.
- **No self-certification of spec compliance** — spec compliance is owned exclusively by the
  subsequent `arcus:spec-compliance-reviewer` step.
- **Read conventions at runtime** from `AGENTS.md`, `CLAUDE.md`, `context-pack.md`,
  `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md`; never hard-code language or framework rules.
- **DoD guard** — always load the task DoD from `blueprint.md` before pruning any tests.
