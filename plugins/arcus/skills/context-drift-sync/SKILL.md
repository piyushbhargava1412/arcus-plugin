---
name: context-drift-sync
description: >
  Assess whether a code-review-approved branch diff materially changed any shared
  `.context/` artifact, and surgically sync only the affected ones. Runs after code-review
  approval and before Closure. Strict, diff-driven, FACTS-ONLY — no story artifacts read.
  Trigger on "sync context for <STORY_ID>", "sync context", or "sync the context drift".
layer: capability
standalone: true
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

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `approved_change_set` | git diff | Code-review-approved branch diff (committed + working tree) | orchestrator passes it / standalone computes from branch |
| `repo_context` | markdown artifacts | Existing shared repository context (repo_map, repo_scope, flows, testing conventions, design conventions) | orchestrator passes paths / standalone reads from `.context/` |
| `drift_baseline` | git ref | Baseline commit to diff against (merge-base for story scope, per-artifact hash for standalone) | orchestrator passes it / standalone computes per mode |

### Outputs
- **`context_drift_assessment`** (structured report) — Per-artifact assessment: which triggers crossed, which artifacts flagged, which skipped, and the surgical edits applied.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/context-drift-sync/<story-id-or-timestamp>.md`. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/context-drift-sync/<story-id-or-timestamp>.md`; orchestrators override with an explicit path (in-pipeline this is commit-body-only, no file).
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.

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
- `.context/design-and-coding-patterns.md`

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

- `verification-commit` means exactly **"the commit at which this artifact was last verified
  accurate"** — nothing more. It is **not** always the diff baseline (see Step 1).
- **Per-artifact divergence is normal and correct.** Different artifacts will sit on different
  `verification-commit` hashes, because they get re-verified at different times. This is the honest
  record, not drift. Only a **standalone full sweep** (see Standalone mode) re-levels every assessed
  artifact onto one common commit; a **story-scope run never re-levels** — it advances only the
  artifacts it actually re-verified.
- The skill **refreshes** the block **only on artifacts it flags-and-edits** (story scope) or **on
  every artifact it assesses** (standalone full sweep). An artifact that is assessed-but-skipped in a
  story run keeps its existing hash — it was checked only against *this branch's* changes, not
  re-verified against everything since its stored hash, so advancing it would overclaim.

## Workflow / Drift-Check Algorithm (FACTS-ONLY)

Evaluate **each** `.context/` artifact independently. Read **no** story artifacts.

### Step 1 — Choose the diff baseline (mode-dependent)

The baseline depends on **what drift this run is responsible for**:

- **Story-scope run** (in-pipeline: gated / AFK / `"sync context for <STORY_ID>"`): baseline =
  **`git merge-base HEAD <base_branch>`** — the branch fork point — for **every** artifact. A story
  owns only the drift **its own branch introduced**, which is exactly `merge-base...HEAD`. This is
  common across all artifacts, always recent (the branch was just cut), and bounded to this branch —
  so the change set never grows unbounded no matter how stale any artifact's stored hash is.
  Pre-fork drift on `<base_branch>` (e.g. from teammates not using ARCUS) is **deliberately out of
  scope** for a story run; it is the standalone full sweep's job.
- **Standalone full sweep** (`"sync context"`, no story): baseline = each artifact's stored
  `verification-commit` (fallback `git merge-base HEAD <default-branch>` when missing/blank/`unknown`).
  This run *is* responsible for main-level drift, so it assesses each artifact all the way back to its
  own last-verified commit.

### Step 2 — Compute the change set (cheap first)

Using the baseline from Step 1 (`<baseline>` = the branch merge-base for a story run, or the
artifact's stored `verification-commit` for a standalone sweep), collect the changed-file list using
**name-status only** — do not read hunks yet:

- Committed changes: `git diff --name-status <baseline>...HEAD`
- **Plus** the uncommitted working tree:
  - `git diff --name-status` (unstaged)
  - `git diff --cached --name-status` (staged)
  - `git ls-files --others --exclude-standard` (untracked)

Union these into the artifact's candidate changed-file set.

### Step 3 — Map changed files → artifacts

Map each changed file to candidate artifacts using each artifact's **own listed file scopes** (a flow
file's Entry Points / Core Path / Scope; `repo_map`'s module/script/config/test listings; `repo_scope`'s
ownership/integration listings; `testing-patterns`' framework/layer/command listings; `design-and-coding-patterns`'
pattern/convention/idiom listings), applying the
strict triggers in [`references/drift-triggers.md`](references/drift-triggers.md).

After mapping to existing artifacts, run a **new-flow completeness check**:

1. Scan the diff for any new flow surface as defined in the "new flow surface" trigger in
   `references/drift-triggers.md` (HTTP handlers, listeners, jobs, UI routes, new public
   cross-cutting service methods, new outbound integration entries, etc.).
2. For each candidate, check whether **any** existing `.context/flows/*.md` file already covers it
   (i.e. the candidate appears in that file's Entry Points, Core Path, or Scope). Read the existing
   flow files to verify — do not assume from filenames alone.
3. If it is covered by an existing flow file → that file is already a flagged candidate (or will be
   caught by the existing-artifact mapping above); no extra action needed.
4. If it is **not** covered by any existing flow file → mark it `needs-new-flow-file` with a short
   description of the new surface. This is carried into Sync Actions as a create action, not an edit.

### Step 4 — Read hunks only for flagged candidates (token economy)

Only for files that map to a candidate artifact do you read the actual diff hunks
(`git diff <baseline>...HEAD -- <file>` and the working-tree equivalents) to confirm whether a
trigger is genuinely crossed. Never read hunks for files that map to no artifact.

### Step 5 — Strict materiality gate

Flag an artifact **only if at least one trigger** from `references/drift-triggers.md` is crossed.
A change that crosses no trigger is a **NO-OP** for that artifact. The gate is deliberately strict.

### Step 6 — NO-OP short-circuit

If **nothing crosses threshold across all artifacts**:

- Report exactly: **No material context drift**.
- **Story-scope run:** make **no edits and no commit** — a clean story run is a true NO-OP and never
  re-levels baselines. Mark the stage complete and hand off to Closure (per Handoff Protocol).
- **Standalone full sweep:** still advance every assessed artifact's `verification-commit`/`generated-at`
  to the synced commit and commit that re-leveling (body: all under `Skipped:` / "verified accurate, no
  content change") — re-convergence is the sweep's purpose, so a clean sweep is the one case that writes
  a hash-only commit.

Otherwise proceed to Sync Actions.

## Sync Actions (surgical — NOT regeneration)

For each **flagged** artifact:

1. **Edit only the affected section(s).** Do not regenerate the whole file. Touch the smallest set of
   lines that makes the artifact accurate again.
2. **Create new flow files for `needs-new-flow-file` entries.** For each surface marked
   `needs-new-flow-file` in Step 3, create `.context/flows/<kebab-slug>.md` following the conventions
   of existing flow files (frontmatter / context-meta block, Entry Points, Core Path, Scope, and any
   other sections present in peer files). Set `verification-commit = HEAD`, `generated-at = <now>`,
   `confidence = medium`. This counts as a flow-file addition and therefore **also triggers the
   AGENTS.md update** in step 3 below.
3. **Refresh that artifact's context-meta block:** set `verification-commit = HEAD`,
   `generated-at = <now, ISO-8601 UTC>`, and keep or adjust `confidence` to reflect the edit.
   - **Story-scope run:** re-bump **only the flagged-and-edited** artifacts. Artifacts that were
     assessed-but-skipped (NO-OP) keep their existing hash — a story checks them only against its own
     branch changes, not against everything since their stored hash, so advancing them would overclaim
     verification and would silently swallow pre-fork drift the next sweep must still catch. This is
     why per-artifact hashes legitimately diverge.
   - **Standalone full sweep:** advance **every assessed** artifact (flagged and skipped) to the synced
     commit — this is the run that re-levels all artifacts onto one common baseline. Skipped artifacts
     get only the hash/`generated-at` bump (not a `confidence` change), since they were re-verified
     accurate but not re-generated.
4. **Flow add/remove → also update `AGENTS.md`.** If the change introduces a **new flow file** or
   **removes** one (the set of flow files changes), regenerate the `AGENTS.md` **Business Flows index**
   and **Navigation table** per the AGENTS.md Flow-Index Rule in `references/drift-triggers.md`. In-place
   edits to the body of an existing flow file, `repo_map.md`, `repo_scope.md`, `testing-patterns.md`, or
   `design-and-coding-patterns.md`
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
- .context/flows/<slug>.md: created — new flow surface: <short description>   # for each new-flow-file creation
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
owns gating. AFK is a **story-scope run** (Step 1): use the **merge-base baseline** and re-bump only
the **flagged-and-edited** artifacts. Run the same strict drift-check, auto-decide using the same
triggers, apply the surgical edits + context-meta refresh + `AGENTS.md` update (if a flow changed),
and commit with the structured `Updated:` / `Skipped:` body. On NO-OP, report "No material context
drift" and continue (true NO-OP — no commit). Do **not** render the gated template. Continue to Closure.

### Standalone

Invocable directly:

- `"sync context for <STORY_ID>"` — resume against an existing checkpoint; a **story-scope run**
  (merge-base baseline, flagged-and-edited bump only — see Step 1), behaving per the persisted `mode`,
  then hands to Closure.
- `"sync context"` — **no story**, **full sweep**. Run the **same** algorithm but with the
  **standalone baseline** (each artifact's stored `verification-commit`; fallback
  `git merge-base HEAD <default-branch>`), so it assesses main-level / pre-fork drift that story runs
  deliberately skip. Requires **no `story_id`** and **no checkpoint**: do **not** read or mutate any
  checkpoint, and do **not** hand off to Closure. This is the run that **re-levels** all artifacts:
  advance **every assessed** artifact (flagged *and* skipped) to the synced commit so they re-converge
  onto one common baseline — including a clean sweep (a hash-only re-leveling commit). Report the
  assessment, apply edits + commit, then stop. If invoked outside the pipeline with no checkpoint, treat
  the confirmation like Gated (ask before editing) unless the caller says otherwise.

  > **Cadence note:** how often the full sweep runs (manual, or scheduled) is intentionally left open
  > here — defer to operational policy. It is the mechanism that keeps `<base_branch>` context true
  > when not everyone uses ARCUS, so it should run on *some* regular cadence.

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
  `references/drift-triggers.md` is crossed; in a story run, "No material context drift" produces no
  edits and no commit (a standalone sweep still writes a hash-only re-leveling commit).
- **Branch-scoped baseline in-pipeline**: a story run diffs from `merge-base(HEAD, base_branch)`, so the
  change set is bounded to the branch and never grows unbounded with stale hashes; pre-fork/main-level
  drift is owned by the standalone full sweep, not by story runs.
- **Per-artifact divergence is honest**: a story run re-bumps `verification-commit` only on
  flagged-and-edited artifacts; skipped artifacts keep their hash. Only a standalone full sweep
  re-levels every assessed artifact onto one common commit.
- **Token-efficient**: name-status first; hunks read only for flagged candidates; the repo is never
  rescanned.
- **Surgical edits + context-meta refresh**: only affected sections are edited; refreshed
  `verification-commit = HEAD` + `generated-at` follow the bump rule above.
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
