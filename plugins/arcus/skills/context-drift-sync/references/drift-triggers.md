# Reference: Strict Drift Triggers

This catalog defines the **strict, per-artifact materiality triggers** the `context-drift-sync`
stage uses to decide whether a code-review-approved branch diff has materially changed any
`.context/` artifact. The stage runs diff-driven and token-efficient — it does NOT rescan the
repository.

## FACTS-ONLY Principle

Triggers are evaluated **only** from two inputs:

1. The **git diff** of the implemented branch against its base.
2. The **affected artifacts' own current content** (the `.context/` files themselves).

There is **NO** dependency on `blueprint.md`, `plan.md`, or `context-pack.md`. Planning-stage
intent is irrelevant here — only what the diff actually changed and what the artifacts actually say
matters. If a fact cannot be established from the diff or the artifact content, it does not exist
for the purposes of this check.

## Baseline & Scope Invariant

The diff baseline depends on **what drift the run owns**, and per-artifact baselines legitimately
diverge:

- **Story-scope run** (in-pipeline): baseline = `git merge-base HEAD <base_branch>` (the branch fork
  point) for every artifact. A story owns only the drift **its own branch introduced**. The change set
  is therefore bounded to the branch and never grows unbounded, regardless of how stale any artifact's
  stored `verification-commit` is. Only **flagged-and-edited** artifacts get their `verification-commit`
  bumped to HEAD; assessed-but-skipped artifacts keep their existing hash.
- **Standalone full sweep** (`sync context`, no story): baseline = each artifact's stored
  `verification-commit`. This run owns main-level / pre-fork drift and is the **only** operation that
  **re-levels** all assessed artifacts onto one common commit.

**Consequence (by design):** different `.context/` artifacts may sit on different
`verification-commit` hashes at any given time. This is correct — the hash records "last verified
accurate," not "last touched." Story runs never converge them; only the standalone full sweep does.
A story run thus **does not** chase drift that landed on `<base_branch>` before the branch was cut —
that is the sweep's responsibility.

## Strict Materiality Gate

Flag an artifact for sync **only if at least one trigger below is crossed**. A change that crosses
no trigger — for example a **pure internal refactor** (logic reshaped, names changed, files moved
without altering entry points, steps, integrations, structure, scope, or tests) — is a **NO-OP** for
that artifact. When in doubt, do not flag: the gate is deliberately strict to avoid churn.

## NO-OP Default

If **nothing crosses threshold for any artifact**, the stage reports:

> No material context drift

and makes **no edits and no commit**. NO-OP is the default outcome; sync is the exception.

---

## Flow Drift — `.context/flows/*.md`

Flag a flow file when **either** condition holds:

- A changed file appears in that flow's **Entry Points**, **Core Path**, or **Scope**, **AND** the
  change alters the **entry**, **steps**, or **integration** of the flow. A change that is a pure
  internal refactor (no change to entry/steps/integration) does **not** qualify.
- A **NEW** entry point, listener, job, or endpoint exists in the diff — this signals a **NEW flow**
  that no existing flow file documents.

## repo_map Drift — `.context/repo_map.md`

Flag `repo_map.md` when the diff introduces any of:

- A new **top-level module / package**.
- A new **entry surface**.
- A new **script**.
- A new **config hotspot**.
- A **dependency / tech-stack change** (e.g. `package.json`, another manifest, or a lockfile).
- A new **test location**.

## repo_scope Drift — `.context/repo_scope.md`

Flag `repo_scope.md` when the diff introduces any of:

- A new **core responsibility**.
- A new **major implementation area**.
- A **boundary change** (what the repo owns / includes / excludes).
- A new **integration, event, or API**.
- A **tech-stack signal change**.

## testing-patterns Drift — `.context/testing-patterns.md`

Flag `testing-patterns.md` when the diff introduces any of:

- A new **test framework / tool**.
- A new **test layer**.
- A new **canonical pattern**.
- A **changed full-suite command**.

---

## AGENTS.md Flow-Index Rule

`AGENTS.md` holds a **Business Flows index** and a **Navigation table**. Regenerate that index +
navigation table **only when a flow file is added or removed** (i.e. the set of flow files changes —
a flow-index/navigation change). Do **NOT** regenerate `AGENTS.md` for in-place edits to the body
of an existing flow file, `repo_map.md`, `repo_scope.md`, or `testing-patterns.md`.
