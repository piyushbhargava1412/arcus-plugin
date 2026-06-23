---
name: pull-request-builder
description: Finalize the development workflow by summarizing changes and creating a pull request. Use when all tasks in the blueprint are completed and verified. Trigger on "finalize workflow", "create pull request", or "submit changes".
layer: capability
standalone: true
---

# Pull Request Builder

## Overview
Acts as the "Final Gatekeeper" to wrap up the automated development cycle. It gathers all evidence of work (logs, tests, changed files), synthesizes a high-quality PR description, and handles the submission to the repository platform.

## Workflow

### Step 1: Evidence Gathering
Read the following from `.arcus/specs/[STORY-ID]/`:
1. `story.md`: The original intent.
2. `plan.md`: The tech lead decisions.
3. `blueprint.md`: The plan (to verify all tasks are marked as done).
4. `test-plan.md`: The verification evidence.

### Step 2: Change Summarization
- Use `git diff --stat` to list exactly which files were modified.
- Categorize changes into Features, Fixes, and Tests.
- Draft the PR description using `./assets/pr-template.md`.

### Step 2b: Context Updates (from the Context Sync stage)
The `context_sync` stage (skill `arcus:context-drift-sync`) runs immediately before Closure and may
have reconciled shared `.context/` artifacts. Detect and render those updates:

- Check `git diff --stat <base_branch>...HEAD` for changes under `.context/**` or to `AGENTS.md`.
- **If present**: read the **sync commit body** (the `docs(context): sync ARCUS context for
  <STORY_ID>` commit — e.g. `git log --format=%b -1 <sha>`, or scan recent commit bodies for the
  `Updated:` / `Skipped:` structure) and render a `## Context Updates` section in the PR description
  from its `Updated:` lines (and, if useful, `Skipped:` lines). The commit body is the **sole** source
  of this rationale.
- **If absent** (no `.context/**` / `AGENTS.md` changes): omit the `## Context Updates` section
  entirely.

Do **NOT** read any `plan.md` "Context Sync" subsection — no such subsection exists; the Context Sync
stage deliberately persists its rationale only in the commit body.

### Step 3: Final Artifact Generation
- Run the full test suite one last time on the feature branch.
- Save the final, synthesized PR description to `.arcus/specs/[STORY-ID]/PR_DESCRIPTION.md`.
- Ensure the description includes a high-level summary, the list of changed files, and evidence of successful verification.

## Success Criteria
- **Professional**: PR description is technical, concise, and accurate.
- **Complete**: All story requirements are mapped to PR features.
- **Clean**: No debugging code or excessive comments are left behind.
- **Artifact-Ready**: The file `PR_DESCRIPTION.md` exists in the workspace.

## Resources
- **PR Template**: `./assets/pr-template.md`

## Handoff Protocol

On finish, this skill marks its own checkpoint key complete:
`<BIN>/checkpoint.sh complete <STORY_ID> closure` (resolve `<BIN>` as `.arcus/bin/` →
`$ARCUS_HOME/scripts/`).

This is the **TERMINAL stage** of the ARCUS pipeline — there is **no successor and no further
handoff**. Once the pull request is created and `closure` is marked complete, the pipeline is
**complete**. Do not emit a "proceed?" handoff block; instead emit a terminal completion line:

```
[Complete] Pipeline complete for <STORY_ID> → PR: <link>
```

