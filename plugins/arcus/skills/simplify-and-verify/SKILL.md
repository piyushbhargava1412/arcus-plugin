---
name: simplify-and-verify
description: >
  Given a set of changed files and a test command, mutate the code toward simplicity using
  repository conventions, re-run the tests, and return SIMPLIFIED if green or REVERTED
  (mutations rolled back) if red. Standalone-invocable; trigger like
  "simplify and verify these files".
layer: capability
standalone: true
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - refactor
disable-model-invocation: true
---

# Simplify and Verify

## Overview

Atomic **simplify → verify** capability. Given a set of changed files and a test command, it
applies behaviour-preserving simplifications to those files using repository conventions, re-runs
the supplied test command, and reports the outcome:

- **SIMPLIFIED** — mutations applied and the suite stayed green.
- **REVERTED** — mutations made the suite go red, so every mutation was rolled back atomically and
  the working tree was restored to its pre-simplification state.

This capability is a *mutator*: it edits code and re-runs tests. It must **never** self-certify spec
compliance — that is owned by a separate spec-compliance step. It is language- and framework-agnostic:
all simplicity and style rules are sourced at runtime from repository convention artifacts, never
hard-coded.

`REVERTED` is **not a failure** — it is a valid, expected outcome meaning "no safe simplification was
found, original code preserved."

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `file_set` / `change_set` | list of file paths or diff | The changed files to simplify | the code-simplifier coordinator (dispatched per task) passes the changed files; standalone user supplies a file list |
| `test_command` | command string | How to verify — the command that must stay green before and after mutation | the coordinator passes it; standalone user supplies it |
| `repo_conventions` | text / artifact refs | *(optional)* The simplicity/style conventions to apply | read at runtime from repository convention artifacts (e.g. `AGENTS.md`, `CLAUDE.md`, `context-pack.md`, `.context/testing-patterns.md`, `.context/design-and-coding-patterns.md`) if not supplied |
| `acceptance_criteria` | markdown or text | *(optional)* The DoD the simplification must not violate (guards test pruning) | the coordinator passes the task DoD; standalone user supplies it if relevant |

### Outputs
- **`result_status`** — a result status of `SIMPLIFIED` or `REVERTED`, plus a short summary:
  - `SIMPLIFIED — mutations applied, suite still green. Summary: <one line of what changed>.`
  - `REVERTED   — mutations caused test failure; all changes rolled back. Reason: <one line>.`
  `SIMPLIFIED` and `REVERTED` are the only valid result tokens; any other output is an error.
  Output convention: when a written artifact is produced standalone, default to
  `.arcus/outputs/simplify-and-verify/<story-id-or-timestamp>.md`. The capability never asks the user
  where to write; pipeline callers set the path. When dispatched by the coordinator, the result is
  returned inline (no artifact required).

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/simplify-and-verify/<story-id-or-timestamp>.md`; orchestrators override with an explicit path.
2. **Optional inputs** (`repo_conventions`, `acceptance_criteria`) — never ask. Proceed without them; source conventions from repository artifacts at runtime and note any omission.
3. **Required inputs with no sensible default** (the `file_set` + the `test_command`) — ask once, clearly. Cannot proceed without these.

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

**Step 3 — Apply mutations**
Before editing, capture the pre-simplification state of every file you intend to touch so the
mutations can be rolled back atomically. Then edit the `file_set` files in place, applying only the
candidates identified in Step 2.

**Step 4 — Re-run the tests**
Execute the supplied `test_command`.

**Step 5 — GREEN path → SIMPLIFIED**
If the suite is GREEN → return `SIMPLIFIED` with a one-line summary of what was changed.

**Step 6 — RED path → REVERTED**
If the suite is RED → revert **all** mutations atomically (restore the pre-simplification state of
every file touched in Step 3, leaving the working tree exactly as it was before this capability ran)
→ return `REVERTED` with an explanation of which mutation caused the failure. `REVERTED` is a valid
outcome, not a failure.

## Standalone Invocation

A user can invoke this capability directly without any ARCUS pipeline, by supplying the two required
inputs:

- **`file_set`** — a list of changed files to simplify (e.g. "simplify and verify these files:
  `src/parser.py`, `src/lexer.py`").
- **`test_command`** — the command that must stay green (e.g. `pytest tests/unit`).

Optionally, the user may point at `repo_conventions` and/or `acceptance_criteria`; if absent, the
capability sources conventions from repository artifacts and proceeds, noting the omission. The
capability applies the mechanics above and returns `SIMPLIFIED` or `REVERTED`. If a written artifact
is requested standalone, it defaults to `.arcus/outputs/simplify-and-verify/<story-id-or-timestamp>.md`.

## Constraints

- **No self-certification of spec compliance** — spec compliance is owned by a separate spec-compliance step.
- **Read conventions at runtime** — never hard-code language or framework rules.
- **Atomic revert** — on RED, every mutation is rolled back; the working tree is left untouched.
- **Scope-bound** — only the provided `file_set` may be modified.
