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

This skill is the **REFACTOR-phase adapter** of red-green-refactor inside the ARCUS dispatcher loop.
It is a thin coordinator: it guards the gate, then **delegates the actual simplify-and-verify
mechanics** to the `arcus:simplify-and-verify` capability and relays that capability's
`SIMPLIFIED`/`REVERTED` result back to the dispatcher under the dispatcher contract.

It owns the adapter responsibilities only: the **DoD guard**, the **skip-on-`light`-complexity** rule,
and surfacing the result. It does **not** itself mutate files or re-run tests — that mechanics lives
in `arcus:simplify-and-verify`. It must **never** self-certify spec compliance — that responsibility
belongs exclusively to the subsequent `arcus:spec-compliance-reviewer` step.

This skill runs as a subagent dispatched by `arcus:subagent-task-dispatcher` after GREEN at `medium`
complexity (resolved via `arcus:model-strategy` → `sonnet`). It is **skipped** for tasks whose
complexity is classified as `light`.

---

## Inputs

The following inputs are provided in the subagent prompt by the dispatcher:

1. **Changed files** — the exact set of files modified by the task implementation (the `file_set`).
2. **Test command** — the same test command used during the TDD verify step for this task.
3. **Repository conventions** — sourced at runtime from `AGENTS.md`, `CLAUDE.md`, `context-pack.md`,
   `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md`. Never hard-code
   language or framework rules; conventions are always sourced from repository artifacts.
4. **Task DoD** — the Definition of Done for this task, sourced from `plan.md`. Used to guard
   test pruning: no test that directly asserts a named DoD requirement may be removed.

---

## Adapter Protocol

**Step 1 — Skip-on-light guard**
If the task's complexity is `light`, do nothing and return without invoking the capability. The
refactor gate is skipped on `light` tasks.

**Step 2 — DoD guard**
Load the task DoD from `plan.md`. This is the acceptance criteria that the simplification must
not violate (in particular, no test asserting a named DoD requirement may be pruned). Pass it through
to the capability so its DoD-safe test-pruning rule is enforced.

**Step 3 — Delegate**
Call the `arcus:simplify-and-verify` capability, passing it:
- the changed `file_set`,
- the `test_command` (the test command from the TDD verify step), and
- the repository conventions (+ the task DoD as `acceptance_criteria`).

The capability performs the mutate-toward-simplicity → re-run-tests → on-GREEN-`SIMPLIFIED` /
on-RED-revert-and-`REVERTED` mechanics. See `arcus:simplify-and-verify` for the full mechanics.

**Step 4 — Relay**
Relay the capability's result token back to the dispatcher unchanged (`SIMPLIFIED` or `REVERTED`).
A `REVERTED` result is **not** a failure — it means no safe simplification was found and the working
tree was left untouched.

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
- **Sequences**: Skip-on-`light` guard → load task DoD (from `plan.md`) as the DoD guard → call the `arcus:simplify-and-verify` capability with the changed `file_set` + the `test_command` + repository conventions (+ the task DoD as `acceptance_criteria`) → relay its `SIMPLIFIED`/`REVERTED` result back to the dispatcher.
- **Delegation**: Linear chain — guards the refactor gate, then delegates the mutate/verify/revert mechanics to the `arcus:simplify-and-verify` capability and surfaces its result under the dispatcher contract.

## Constraints

- **Model tier:** `medium` (dispatched by coordinator via `arcus:model-strategy`; resolves to `sonnet`).
- **No `context: fork`** — runs as a standard subagent within the dispatcher loop.
- **No self-certification of spec compliance** — spec compliance is owned exclusively by the
  subsequent `arcus:spec-compliance-reviewer` step.
- **Read conventions at runtime** from `AGENTS.md`, `CLAUDE.md`, `context-pack.md`,
  `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md`; never hard-code language or framework rules.
- **DoD guard** — always load the task DoD from `plan.md` and pass it to the capability before any test pruning can occur.
- **Skip on `light`** — the refactor gate does not run for `light` complexity tasks.
