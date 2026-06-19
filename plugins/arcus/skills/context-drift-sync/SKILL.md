---
name: context-drift-sync
description: >
  Assess whether a code-review-approved branch diff materially changed any shared
  `.context/` artifact, and surgically sync only the affected ones. Runs after code-review
  approval and before Closure. Strict, diff-driven, FACTS-ONLY — no story artifacts read.
  Trigger on "sync context for <STORY_ID>", "sync context", or "sync the context drift".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - context
    - tech-lead
---

# Context Drift Sync (Post-Review .context/ Reconciliation)

## Overview

Runs **after** the Code Review stage approves and **before** Closure. Its single job: decide whether
the approved branch diff **materially** changed any shared `.context/` artifact, and if so, **surgically
sync only the affected sections** — never regenerate.

This stage is deliberately **FACTS-ONLY** and **token-efficient**. It reads **no story artifacts** —
no `blueprint.md`, no `plan.md`, no `context-pack.md`, no `test-plan.md`. Planning intent is irrelevant;
only what the diff actually changed and what the `.context/` artifacts actually say matter. The strict
trigger catalog in [`references/drift-triggers.md`](references/drift-triggers.md) is the sole authority
for materiality — this skill **references** it and does not restate its triggers.

**NO-OP is the default outcome; sync is the exception.** A pure internal refactor (logic reshaped, names
changed, files moved without altering entry points, steps, integrations, structure, scope, or tests)
crosses no trigger and is a NO-OP. When in doubt, do not flag.

## Inputs

- `STORY_ID` (from the orchestrator / resume phrase). **Optional** in standalone "sync context" mode.
- The shared `.context/` artifacts themselves (their bodies + context-meta blocks).
- The git diff (computed below). **No story artifacts.**
- Persisted `mode` from the checkpoint (read it; do **not** re-infer).

The `.context/` artifacts in scope:

- `.context/flows/*.md` (one per business flow)
- `.context/repo_map.md`
- `.context/repo_scope.md`
- `.context/testing-patterns.md`

## Helper Scripts

Resolve `<BIN>` = `.arcus/bin/` if it exists, else `$ARCUS_HOME/scripts/` (read `ARCUS_HOME` from
`.arcus/env`). This is the same resolution rule the sibling skills use.

| Script | Usage | Purpose |
|--------|-------|---------|
| `checkpoint.sh <action> <STORY_ID> [args]` | `read` / `set-status` / `complete` | Read persisted `mode` + `base_branch`; mark `context_sync` status/complete |
| `commit.sh <STORY_ID> <message>` | commit the sync | Persists the surgical edits with the structured audit body (excludes `.arcus` artifacts per repo convention) |

`base_branch` comes from the checkpoint (`<BIN>/checkpoint.sh read <STORY_ID>`). In standalone no-story
mode, fall back to the repository default branch (e.g. `origin/HEAD` → `main`).

## The context-meta Block

Every `.context/` artifact carries an HTML-comment metadata block near its top:

```
<!-- context-meta
verification-commit: <sha>
generated-at: <ISO-8601 UTC>
confidence: high | medium | low
-->
```

- `verification-commit` is the commit at which the artifact was last verified accurate. It is the
  **per-artifact diff baseline** — each artifact may carry a different one, so only drifted artifacts get
  re-bumped.
- The skill **reads** `verification-commit` to compute drift and **refreshes** the block on any artifact
  it edits.

## Workflow / Drift-Check Algorithm (FACTS-ONLY)

Evaluate **each** `.context/` artifact independently. Read **no** story artifacts.

### Step 1 — Per-artifact baseline

For each artifact, read `verification-commit` from its context-meta block.
**Fallback** when missing/blank/`unknown`: `git merge-base HEAD <base_branch>`.

### Step 2 — Compute the change set (cheap first)

Per artifact (its own baseline), collect the changed-file list using **name-status only** — do not read
hunks yet:

- Committed branch changes: `git diff --name-status <verification-commit>...HEAD`
- **Plus** the uncommitted working tree:
  - `git diff --name-status` (unstaged)
  - `git diff --cached --name-status` (staged)
  - `git ls-files --others --exclude-standard` (untracked)

Union these into the artifact's candidate changed-file set.

### Step 3 — Map changed files → artifacts

Map each changed file to candidate artifacts using each artifact's **own listed file scopes** (a flow
file's Entry Points / Core Path / Scope; `repo_map`'s module/script/config/test listings; `repo_scope`'s
ownership/integration listings; `testing-patterns`' framework/layer/command listings), applying the
strict triggers in [`references/drift-triggers.md`](references/drift-triggers.md).

### Step 4 — Read hunks only for flagged candidates (token economy)

Only for files that map to a candidate artifact do you read the actual diff hunks
(`git diff <verification-commit>...HEAD -- <file>` and the working-tree equivalents) to confirm whether a
trigger is genuinely crossed. Never read hunks for files that map to no artifact.

### Step 5 — Strict materiality gate

Flag an artifact **only if at least one trigger** from `references/drift-triggers.md` is crossed.
A change that crosses no trigger is a **NO-OP** for that artifact. The gate is deliberately strict.

### Step 6 — NO-OP short-circuit

If **nothing crosses threshold across all artifacts**:

- Report exactly: **No material context drift**.
- Make **no edits and no commit**.
- Mark the stage complete and hand off to Closure (per Handoff Protocol).

Otherwise proceed to Sync Actions.

## Sync Actions (surgical — NOT regeneration)

For each **flagged** artifact:

1. **Edit only the affected section(s).** Do not regenerate the whole file. Touch the smallest set of
   lines that makes the artifact accurate again.
2. **Refresh that artifact's context-meta block:** set `verification-commit = HEAD`,
   `generated-at = <now, ISO-8601 UTC>`, and keep or adjust `confidence` to reflect the edit. Only the
   flagged (edited) artifacts get re-bumped; unflagged artifacts are left untouched.
3. **Flow add/remove → also update `AGENTS.md`.** If the change introduces a **new flow file** or
   **removes** one (the set of flow files changes), regenerate the `AGENTS.md` **Business Flows index**
   and **Navigation table** per the AGENTS.md Flow-Index Rule in `references/drift-triggers.md`. In-place
   edits to the body of an existing flow file, `repo_map.md`, `repo_scope.md`, or `testing-patterns.md`
   do **NOT** touch `AGENTS.md`.

### Commit — the body is the sole audit record

Commit via:

```
<BIN>/commit.sh <STORY_ID> "docs(context): sync ARCUS context for <STORY_ID>"
```

The commit **message body** is the **only** audit record. There is **no plan.md subsection** and **no
new artifact file** — the rationale lives only in the commit body. Structure the body as:

```
Updated:
- <artifact path>: <reason — which trigger crossed / what changed>
- AGENTS.md: <reason — flow added/removed, index + navigation regenerated>   # only if a flow file changed

Skipped:
- <artifact path>: <why not flagged — e.g. "pure internal refactor, no entry/steps/integration change">
```

Every assessed artifact appears under exactly one of `Updated:` or `Skipped:`.

## Modes

Read the persisted `mode` from the checkpoint (`<BIN>/checkpoint.sh read <STORY_ID>`); do **not**
re-infer it.

### Gated (default, user-driven)

1. Run the drift-check. If NO-OP, report "No material context drift" and skip to Handoff (no template,
   no commit).
2. If at least one artifact is flagged, render
   [`assets/drift-assessment-template.md`](assets/drift-assessment-template.md): the per-artifact
   assessment table plus the per-artifact one-line change summaries.
3. Present the **single consolidated `yes/no` confirmation** from the template. This is **authoritative
   from planning** — it is **NOT** per-artifact prompts and **NOT** a deselect UI. One `yes` applies
   **all** flagged edits; one `no` skips them **all**.
   - On **`yes`**: apply the surgical edits, refresh context-meta, update `AGENTS.md` if a flow changed,
     and commit.
   - On **`no`**: skip all edits (no commit, no context-meta change), mark the stage complete, proceed.
4. Then emit the Handoff block.

### AFK (autonomous)

One-shot, like `spec-finalizer` / `implementation-planner`. **No gate** — the `arcus:arcus-controller`
owns gating. Run the same strict drift-check, auto-decide using the same triggers, apply the surgical
edits + context-meta refresh + `AGENTS.md` update (if a flow changed), and commit with the structured
`Updated:` / `Skipped:` body. On NO-OP, report "No material context drift" and continue. Do **not**
render the gated template. Continue to Closure.

### Standalone

Invocable directly:

- `"sync context for <STORY_ID>"` — resume against an existing checkpoint; behaves per the persisted
  `mode`, then hands to Closure.
- `"sync context"` — **no story**. Run the **same** algorithm using per-artifact `verification-commit`
  baselines (fallback: `git merge-base HEAD <default-branch>`). Requires **no `story_id`** and **no
  checkpoint**: do **not** read or mutate any checkpoint, and do **not** hand off to Closure. Report the
  assessment and (on flagged artifacts) apply edits + commit, then stop. If invoked outside the pipeline
  with no checkpoint, treat the confirmation like Gated (ask before editing) unless the caller says
  otherwise.

## Handoff Protocol

On finish, this skill marks its **own** checkpoint key complete:
`<BIN>/checkpoint.sh complete <STORY_ID> context_sync` (resolve `<BIN>` as `.arcus/bin/` →
`$ARCUS_HOME/scripts/`).

It names **only its immediate successor** — **Closure**. It does **NOT** enumerate the full pipeline;
that lives only in the afk `arcus:arcus-controller`.

- **Successor — Closure:** skill `arcus:pull-request-builder`, resume phrase
  `"create pull request for <STORY_ID>"`.
- **Same-session continuation:** on a `"yes"` / `"proceed"`, load and follow `arcus:pull-request-builder`
  directly.
- **Cold resume** (new session): the user types `"create pull request for <STORY_ID>"`, which
  re-activates Closure by description-matching + the checkpoint.
- **In AFK:** skip the gate; the controller continues to Closure on its own.
- **In standalone no-checkpoint mode:** no checkpoint mutation and no Closure handoff — just report.

Emit the handoff block:

```
[Handoff] Context Sync complete → next: Closure
Summary: <K artifacts updated, J skipped — or "no material drift">
Artifacts: <changed .context/** + AGENTS.md paths, or "none">
Proceed? Reply "yes" to run Closure, or "no" to pause.
Resume later with: "create pull request for <STORY_ID>"
```

## Success Criteria

- **FACTS-ONLY**: no `blueprint.md` / `plan.md` / `context-pack.md` / `test-plan.md` read — drift is
  established only from the diff and the artifacts' own content.
- **Strict gate with a clean NO-OP path**: artifacts are flagged only when a trigger in
  `references/drift-triggers.md` is crossed; "No material context drift" produces no edits and no commit.
- **Token-efficient**: name-status first; hunks read only for flagged candidates; the repo is never
  rescanned.
- **Surgical edits + context-meta refresh**: only affected sections are edited; only edited artifacts
  get `verification-commit = HEAD` and a refreshed `generated-at`.
- **AGENTS.md updated only on flow add/remove**: in-place body edits never touch `AGENTS.md`.
- **Commit-body-only rationale**: structured `Updated:` / `Skipped:` lines are the sole audit record —
  **no plan.md subsection** and **no new artifact file**.
- **All three modes** specified (Gated single consolidated yes/no, AFK one-shot no-gate, Standalone with
  optional no-story / no-checkpoint).
- **Handoff names only Closure** (`arcus:pull-request-builder`, resume `"create pull request for
  <STORY_ID>"`); the full pipeline is never enumerated here.

## Resources

- **Strict trigger catalog**: [`references/drift-triggers.md`](references/drift-triggers.md)
- **Gated assessment template**: [`assets/drift-assessment-template.md`](assets/drift-assessment-template.md)
