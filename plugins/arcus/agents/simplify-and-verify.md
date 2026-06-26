---
name: simplify-and-verify
description: >
  Given a set of changed files and a test command, mutate the code toward simplicity using
  repository conventions, re-run the tests, and return SIMPLIFIED if green or REVERTED
  (mutations rolled back) if red. Dispatched by arcus:subagent-task-dispatcher as the
  post-GREEN refactor gate (skipped on `light` complexity tasks).
layer: capability
user-invocable: false
disable-model-invocation: true
model: sonnet
color: teal
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - refactor
---

# Simplify and Verify

## Overview

Atomic **simplify → verify** capability. Given a set of changed files and a test command, it
applies behaviour-preserving simplifications to those files using repository conventions, re-runs
the supplied test command, and reports the outcome:

- **SIMPLIFIED** — mutations applied and the suite stayed green.
- **REVERTED** — the working tree ends in its pre-simplification state. This covers two cases:
  (a) mutations made the suite go red, so every mutation was rolled back atomically; or
  (b) **no-op** — no safe simplification candidate was found, so nothing was ever changed.
  Both end states are identical (original code preserved), so they share the `REVERTED` token and
  are distinguished only by the reason string.

This capability is a *mutator*: it edits code and re-runs tests. It must **never** self-certify spec
compliance — that is owned by a separate spec-compliance step. It is language- and framework-agnostic:
all simplicity and style rules are sourced at runtime from repository convention artifacts, never
hard-coded.

`REVERTED` is **not a failure** — it is a valid, expected outcome meaning "no safe simplification was
found, original code preserved."

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `file_set` / `change_set` | yes | list of file paths or diff | The changed files to simplify |
| `test_command` | yes | command string | How to verify — the command that must stay green before and after mutation |
| `repo_conventions` | no | text / artifact refs | Simplicity/style conventions; read from repository convention artifacts at runtime if not supplied |
| `acceptance_criteria` | no | markdown or text | The DoD the simplification must not violate (guards test pruning) |

### Outputs
- **`result_status`** — a result status of `SIMPLIFIED` or `REVERTED`, plus a short summary:
  - `SIMPLIFIED — mutations applied, suite still green. Summary: <one line of what changed>.`
  - `REVERTED   — mutations caused test failure; all changes rolled back. Reason: <one line>.`
  - `REVERTED   — no simplification candidates identified; code left unchanged.` *(no-op variant)*
  `SIMPLIFIED` and `REVERTED` are the only valid result tokens; any other output is an error. The
  no-op case reuses `REVERTED` (original code preserved) with the canonical reason above, so callers
  that gate on the token need no special handling.

  **Contractual token — mandatory.** The result is consumed by automated callers that gate on the
  token, so the **final line** of your response MUST begin with exactly `SIMPLIFIED` or `REVERTED`
  (uppercase, verbatim). Prose-only conclusions such as "Done" or "Simplified the function" do **not**
  satisfy the contract. Emit the token in every case.
  Output convention: when a written artifact is produced standalone, default to
  `.arcus/outputs/simplify-and-verify/<timestamp>.md`. The capability never asks the user
  where to write; pipeline callers set the path. When dispatched by the coordinator, the result is
  returned inline (no artifact required).

## Simplification Rules

Apply simplifications that **reduce cognitive complexity without changing observable behaviour**:

- Extract repeated logic into well-named helpers.
- Flatten unnecessary nesting (e.g., early returns, guard clauses).
- Improve naming for clarity and consistency with surrounding code.
- Remove dead code that is provably unreachable or unused within the changed scope.
- Consolidate related logic that is artificially split across multiple locations.

**Convention adherence:** follow repository-specific conventions sourced at runtime from
`repo_conventions` (or, when absent, from artifacts such as `AGENTS.md`, `CLAUDE.md`,
`context-pack.md`, `.context/testing-patterns.md`, and `.context/design-and-coding-patterns.md`).
This capability is **language-agnostic** — do NOT hard-code rules for any specific language, runtime,
or framework.

**DoD-safe test-pruning rule:**
- *Permitted:* prune near-duplicate parametric test cases where an existing case already covers the
  same boundary; prune wrong-layer tests where a fast unit test already covers the same behaviour as
  a slow integration test.
- *Forbidden:* remove any test that directly asserts a named requirement from the supplied
  `acceptance_criteria` (the task DoD).

**Hard boundaries — never:**
- Change observable behaviour, public interfaces, or return values.
- Add new features or expand scope beyond what the change set implemented.
- Modify files outside the provided `file_set`.

## Mechanics — Simplify → Verify → SIMPLIFIED/REVERTED

**Step 1 — Read inputs**
Load the `file_set` files. Read conventions from `repo_conventions` (or repository artifacts if not
supplied). Load `acceptance_criteria` if provided.

**Step 2 — Identify opportunities**
List simplification candidates briefly (one line each) before applying any mutations. Do not apply
changes that cannot be justified against a rule in **Simplification Rules** above.
If **no** candidate survives this filter, this is a **no-op**: make no edits, skip Steps 3–6, and end
your response with a final line beginning `REVERTED` and the canonical reason
`no simplification candidates identified; code left unchanged.`

**Step 3 — Apply mutations**
Before editing, capture the pre-simplification state of every file you intend to touch so the
mutations can be rolled back atomically. Then edit the `file_set` files in place, applying only the
candidates identified in Step 2.

**Step 4 — Re-run the tests**
Execute the supplied `test_command`.

**Step 5 — GREEN path → SIMPLIFIED**
If the suite is GREEN → end your response with a final line beginning `SIMPLIFIED` followed by a
one-line summary of what was changed.

**Step 6 — RED path → REVERTED**
If the suite is RED → revert **all** mutations atomically (restore the pre-simplification state of
every file touched in Step 3, leaving the working tree exactly as it was before this capability ran)
→ end your response with a final line beginning `REVERTED` and an explanation of which mutation caused
the failure. `REVERTED` is a valid outcome, not a failure.

In both cases the contractual token (`SIMPLIFIED` / `REVERTED`) MUST appear verbatim as the start of
the final line — automated callers parse it.

## Constraints

- **No self-certification of spec compliance** — spec compliance is owned by a separate spec-compliance step.
- **Read conventions at runtime** — never hard-code language or framework rules.
- **Atomic revert** — on RED, every mutation is rolled back; the working tree is left untouched.
- **Scope-bound** — only the provided `file_set` may be modified.
