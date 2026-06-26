---
name: context-drift-sync
description: >
  Assess whether a code-review-approved branch diff materially changed any shared
  `.context/` artifact, and surgically sync only the affected ones. Strict, diff-driven, FACTS-ONLY — no story artifacts read.
layer: capability
user-invocable: false
disable-model-invocation: true
model: sonnet
color: purple
---

# Context Drift Sync (.context/ Reconciliation)

## Overview

Diff a code change against a baseline, decide which shared `.context/` artifacts it **materially**
changed, surgically edit only those sections (**never regenerate**), and commit.

- **FACTS-ONLY**: judge from the diff and the `.context/` artifacts' own content — read **no** story
  artifacts (`plan.md`, `grounded-spec.md`, `context-pack.md`, `test-plan.md`).
- **NO-OP is the default; sync is the exception.** Materiality is defined solely by the trigger
  catalog (`drift-triggers.md`) — reference it, never restate it. When in doubt, don't flag.

## Contract

Reads the inputs below, edits `.context/`, commits, and returns the assessment to its caller.

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `change_set` | yes | git diff | The code change to assess (committed + working tree). **No story artifacts.** |
| `repo_context` | yes | `.context/` snapshot | The artifacts to reconcile — `flows/*.md`, `repo_map.md`, `repo_scope.md`, `testing-patterns.md`, `design-and-coding-patterns.md` — their bodies **and** context-meta blocks. |
| `sync_scope` | yes | `branch` \| `full-sweep` | `branch`: assess only what `change_set` introduced; bump only flagged-and-edited artifacts; baseline = `base_ref`. `full-sweep`: assess each artifact since its own last verification; re-level every assessed artifact; baseline = each artifact's stored `verification-commit`. |
| `base_ref` | for `branch` | git ref | Baseline to diff against for `branch` scope (e.g. `merge-base(HEAD, <base-branch>)`). Unused for `full-sweep`. |
| `apply_mode` | yes | `auto` \| `confirm` | `auto`: apply edits + commit without asking. `confirm`: present the assessment, get one consolidated yes/no, then apply all or skip all. |
| `commit_label` | yes | string | Conventional-commit scope for `commit.sh` (the pipeline passes the story id; standalone defaults to `context`). A label only — never read back as state. |

### Output
- **`context_drift_assessment`** — a per-artifact report (triggers crossed, flagged, skipped, edits
  applied). In-pipeline the rationale lives in the commit body only; standalone defaults to
  `.arcus/outputs/context-drift-sync/<timestamp>.md`. Never ask where to write; callers override.

## Locating helper scripts

Resolve `<BIN>` = `.arcus/bin/` if it exists, else `$ARCUS_HOME/scripts/` (read `ARCUS_HOME` from
`.arcus/env`)

## The context-meta Block

Every `.context/` artifact carries an HTML-comment metadata block near its top:

```
<!-- context-meta
verification-commit: <sha>
generated-at: <ISO-8601 UTC>
confidence: high | medium | low
-->
```

`verification-commit` is **the commit at which this artifact was last verified accurate** — not the
diff baseline, and legitimately different across artifacts (they are re-verified at different times).
`full-sweep` uses it as each artifact's baseline (Step 1); refresh it per the bump rule in Sync Actions.

## Drift-Check Algorithm

Evaluate **each** `.context/` artifact independently.

### Step 1 — Choose the diff baseline (per `sync_scope`)

- **`branch`**: baseline = `base_ref` (the caller's fork point, e.g. `merge-base(HEAD, <base-branch>)`)
  for **every** artifact. Assess only the drift this change introduced; pre-fork/main-level drift is
  out of scope (it is the `full-sweep`'s job).
- **`full-sweep`**: baseline = each artifact's own stored `verification-commit` (fallback
  `merge-base(HEAD, <default-branch>)` when missing/blank/`unknown`), so each artifact is assessed back
  to its last-verified commit.

### Step 2 — Compute the change set (cheap first)

Using the baseline from Step 1, collect the changed-file list using **name-status only** — do not
read hunks yet:

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
pattern/convention/idiom listings), applying the strict triggers from the **trigger catalog** (Resources).

After mapping to existing artifacts, run a **new-flow completeness check**:

1. Scan the diff for any new flow surface as defined by the catalog's "new flow surface" trigger
   (HTTP handlers, listeners, jobs, UI routes, new public cross-cutting service methods, new outbound
   integration entries, etc.).
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

Flag an artifact **only if at least one catalog trigger** is crossed. A change that crosses no trigger
is a **NO-OP** for that artifact. The gate is deliberately strict.

### Step 6 — NO-OP short-circuit

If **nothing crosses threshold across all artifacts**, report exactly **No material context drift**, then:

- **`branch`:** make **no edits and no commit** — a clean run is a true NO-OP and never re-levels baselines.
- **`full-sweep`:** still advance every assessed artifact's `verification-commit`/`generated-at` and
  commit that re-leveling (body: all under `Skipped:` / "verified accurate, no content change") —
  re-convergence is the sweep's purpose, so a clean sweep is the one case that writes a hash-only commit.

Otherwise proceed to Sync Actions.

## Sync Actions (surgical — NOT regeneration)

For each **flagged** artifact:

1. **Edit only the affected section(s).** Do not regenerate the whole file. Touch the smallest set of
   lines that makes the artifact accurate again.
2. **Create new flow files for `needs-new-flow-file` entries.** For each surface marked
   `needs-new-flow-file` in Step 3, create `.context/flows/<kebab-slug>.md` following the conventions
   of existing flow files (frontmatter / context-meta block, Entry Points, Core Path, Scope, and any
   other sections present in peer files). Set `verification-commit = HEAD`, `generated-at = <now>`,
   `confidence = medium`. A new flow file changes the flow set, so it **also triggers the AGENTS.md
   update** (step 4).
3. **Refresh that artifact's context-meta block:** set `verification-commit = HEAD`,
   `generated-at = <now, ISO-8601 UTC>`, and keep or adjust `confidence` to reflect the edit.
   - **`branch`:** re-bump **only the flagged-and-edited** artifacts. Assessed-but-skipped (NO-OP)
     artifacts keep their existing hash — they were checked only against this change, so advancing them
     would overclaim verification and swallow pre-fork drift the next sweep must catch.
   - **`full-sweep`:** advance **every assessed** artifact (flagged and skipped) to re-level all
     artifacts onto one common baseline. Skipped artifacts get only the hash/`generated-at` bump (not a
     `confidence` change).
4. **Flow add/remove → also update `AGENTS.md`.** Only when the **set** of flow files changes (a flow
   file added or removed): regenerate the `AGENTS.md` **Business Flows index** and **Navigation table**
   per the catalog's AGENTS.md Flow-Index Rule. In-place body edits to any artifact leave `AGENTS.md`
   untouched.

### Commit — the body is the sole audit record

Commit via:

```
<BIN>/commit.sh <commit_label> "docs(context): sync ARCUS context"
```

The commit **message body** is the audit record — put all rationale there. Structure it as:

```
Updated:
- <artifact path>: <reason — which trigger crossed / what changed>
- .context/flows/<slug>.md: created — new flow surface: <short description>   # for each new-flow-file creation
- AGENTS.md: <reason — flow added/removed, index + navigation regenerated>   # only if a flow file changed

Skipped:
- <artifact path>: <why not flagged — e.g. "pure internal refactor, no entry/steps/integration change">
```

Every assessed artifact appears under exactly one of `Updated:` or `Skipped:`.

## Apply mode

- **`auto`**: apply the surgical edits + context-meta refresh + `AGENTS.md` update (if a flow changed)
  and commit, with no prompt. On NO-OP, report "No material context drift" (no commit in `branch` scope).
- **`confirm`**: if any artifact is flagged, render
  [`"$ARCUS_HOME"/agent-resources/context-drift-sync/assets/drift-assessment-template.md`]("$ARCUS_HOME"/agent-resources/context-drift-sync/assets/drift-assessment-template.md)
  (the per-artifact table + one-line change summaries) and present its **single consolidated yes/no** —
  **not** per-artifact prompts, **not** a deselect UI. One `yes` applies **all** flagged edits and
  commits; one `no` skips them **all** (no commit, no context-meta change). On NO-OP, report and stop.

On finish, return the `context_drift_assessment` to the caller.

## Resources

- **Strict trigger catalog**: [`"$ARCUS_HOME"/agent-resources/context-drift-sync/references/drift-triggers.md`]("$ARCUS_HOME"/agent-resources/context-drift-sync/references/drift-triggers.md)
- **Gated assessment template**: [`"$ARCUS_HOME"/agent-resources/context-drift-sync/assets/drift-assessment-template.md`]("$ARCUS_HOME"/agent-resources/context-drift-sync/assets/drift-assessment-template.md)
