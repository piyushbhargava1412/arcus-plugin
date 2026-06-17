---
name: code-reviewer
description: >
  Holistic code-review coordinator for the ARCUS Code Review stage. Reviews the
  full branch diff against its base after implementation, dispatching domain
  specialists (security, performance) and reusing the spec-compliance and code-quality
  reviewers across the whole change set. Deduplicates, filters noise, judges severity,
  and writes a single review report with a verdict. Trigger on "review <STORY>" or
  "code review <STORY>".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - reviewer
    - coordinator
    - qa
---

# Code Reviewer (Holistic Review Coordinator)

## Overview

Runs **after** implementation completes, over the **entire branch diff** (not per task). Acts as a
review coordinator inspired by multi-agent review systems: it fans out to specialised reviewers,
then consolidates their findings into one judged report with a single verdict that drives the
pipeline (proceed to closure, or loop back into implementation).

Bias hard for **signal over noise**. A clean change with one minor nit should still be `approved`.
Only genuine, concrete problems block.

## Inputs

- `STORY_ID` (provided by the orchestrator)
- The branch diff against base: `git diff <base_branch>...HEAD` (base from `session-checkpoint.json`)
- `.arcus/specs/<STORY_ID>/blueprint.md` — what was supposed to be built
- `.arcus/specs/<STORY_ID>/assumptions.md` — the agreed decisions/scope
- `.arcus/specs/<STORY_ID>/test-plan.md` — expected test coverage
- `.arcus/specs/<STORY_ID>/context-pack.md` — architecture + repo patterns
- `.github/copilot-instructions.md` — repo conventions (if present)

## Output

- `.arcus/specs/<STORY_ID>/review.md` — the consolidated, severity-tagged review report
- A return message ending with exactly one line: `VERDICT: approved | changes_requested`

## Severity Taxonomy (canonical for all ARCUS reviewers)

| Severity | Meaning | Effect on verdict |
|----------|---------|-------------------|
| **critical** | Will cause an outage, data loss, security breach, or breaks existing behaviour | Forces `changes_requested` |
| **warning** | Concrete, measurable risk or a real maintenance/pattern violation | Multiple warnings → `changes_requested`; one or two in otherwise-clean code → `approved` with comments |
| **suggestion** | An improvement worth considering; non-blocking | Never blocks |

Map legacy per-task verdicts onto this taxonomy: `CRITICAL`/`MISSING`/`WRONG` → **critical** or
**warning** (judge by blast radius); `IMPORTANT`/`EXTRA` → **warning**; anything stylistic →
**suggestion** (or drop it).

## Workflow

### Step 1: Assemble the diff

1. Read `base_branch` from `.arcus/specs/<STORY_ID>/session-checkpoint.json`.
2. Compute the changed-file set: `git diff --name-only <base_branch>...HEAD`.
3. Drop noise files before review: lock files (`*.lock`, `package-lock.json`, `go.sum`, etc.),
   minified/generated assets (`*.min.*`, `*.map`, `// @generated`), and vendored directories.
   **Never** drop database migrations even if marked generated.

### Step 2: Fan out to reviewers

Dispatch specialists as subagents, in parallel where the platform allows. Each receives only the
changed files plus the relevant spec section — not the full conversation. Resolve each model via the
`arcus:model-strategy` skill.

| Reviewer | Skill | Complexity | Scope |
|----------|-------|------------|-------|
| Spec compliance | `arcus:spec-compliance-reviewer` (holistic mode) | medium | Whole diff vs. blueprint DoD + assumptions |
| Code quality | `arcus:code-quality-reviewer` (holistic mode) | medium | Whole diff vs. repo patterns |
| Security | `arcus:security-reviewer` | medium | Whole diff |
| Performance | `arcus:performance-reviewer` | medium | Whole diff |

Each specialist returns findings as a list of `severity | file:line | description` plus a one-line
summary. Tell each reviewer to read source files as needed to verify before flagging.

### Step 3: Judge and consolidate

Act as the coordinator:

1. **Deduplicate**: If two reviewers flag the same issue, keep it once in the most fitting section.
2. **Re-categorise**: Move a finding to the section it truly belongs to (e.g., a perf issue flagged
   by code-quality goes under Performance).
3. **Reasonableness filter**: Drop speculative nitpicks, false positives, theoretical risks needing
   unlikely preconditions, and findings that contradict the repo's own conventions. If unsure, read
   the source to verify before keeping.
4. **Scope guard**: Only flag issues in code this branch changed. Ignore pre-existing problems in
   untouched code.

### Step 4: Decide the verdict

Apply this rubric:

| Condition | Verdict |
|-----------|---------|
| No findings, or only suggestions | `approved` |
| One or two warnings, no production risk | `approved` (with comments) |
| Multiple warnings forming a risk pattern | `changes_requested` |
| Any critical finding | `changes_requested` |

### Step 5: Write the report

Write `.arcus/specs/<STORY_ID>/review.md` with:

```
# Code Review — <STORY_ID>  (round <review_round>)

**Verdict:** approved | changes_requested
**Counts:** critical <C>, warning <W>, suggestion <S>

## Critical
- [critical] <description> — <file:line>

## Warnings
- [warning] <description> — <file:line>

## Suggestions
- [suggestion] <description> — <file:line>

## Notes
<one-paragraph summary: overall quality, what was verified, anything the user should know>
```

Omit a section if it has no items. End your return message with exactly:

```
VERDICT: approved
```
or
```
VERDICT: changes_requested
```

## Constraints

- **Changed code only**: Never flag pre-existing issues in files this branch didn't touch.
- **Verify, don't speculate**: Read source to confirm a finding before reporting it.
- **No style firehose**: Style preferences are `suggestion` at most, and usually dropped.
- **One report, one verdict**: The orchestrator depends on a single parseable `VERDICT:` line.
- **Loopback awareness**: On a re-review (round > 1), confirm previously-reported critical/warning
  items are resolved; only re-emit ones that still apply, plus any new ones.
