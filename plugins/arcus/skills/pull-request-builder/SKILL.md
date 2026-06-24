---
name: pull-request-builder
description: Finalize the development workflow by summarizing changes and creating a pull request. Use when all tasks in the plan are completed and verified. Trigger on "finalize workflow", "create pull request", or "submit changes".
layer: capability
standalone: true
---

# Pull Request Builder

## Overview
Acts as the "Final Gatekeeper" to wrap up the automated development cycle. It gathers all evidence of work from the provided inputs, synthesizes a high-quality PR description, and handles the submission to the repository platform.

## Workflow

### Step 1: Evidence Gathering
Read the named inputs:
1. `story`: The original intent.
2. `spec_grounding` (optional): The tech lead decisions.
3. `implementation_plan` (optional): The task breakdown (to verify all tasks are marked as done).
4. `test_matrix` (optional): The verification evidence.

### Step 2: Change Summarization
- Analyze the `change_set` input to understand which files were modified.
- Categorize changes into Features, Fixes, and Tests.
- Draft the PR description using `./assets/pr-template.md`.

### Step 2b: Context Updates (from the Context Sync stage)
The `context_sync` stage (skill `arcus:context-drift-sync`) runs immediately before Closure and may
have reconciled shared context artifacts. Detect and render those updates from the `change_set`:

- Check the `change_set` input for changes under context directories or to navigation files.
- **If present**: read the **sync commit body** (the `docs(context): sync ARCUS context for
  <STORY_ID>` commit — e.g. scan recent commit bodies for the `Updated:` / `Skipped:` structure) and
  render a `## Context Updates` section in the PR description from its `Updated:` lines (and, if useful,
  `Skipped:` lines). The commit body is the **sole** source of this rationale.
- **If absent** (no context changes): omit the `## Context Updates` section entirely.

### Step 3: Final Artifact Generation
- Run the full test suite one last time on the feature branch.
- Save the final, synthesized PR description to the output path (default `.arcus/outputs/pull-request-builder/<story-id-or-timestamp>.md` for standalone mode; orchestrators provide an explicit path).
- Ensure the description includes a high-level summary, the list of changed files, and evidence of successful verification.

## Success Criteria
- **Professional**: PR description is technical, concise, and accurate.
- **Complete**: All story requirements are mapped to PR features.
- **Clean**: No debugging code or excessive comments are left behind.
- **Artifact-Ready**: The PR description is written to the output path.

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

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `story` | markdown or text | The original user story requirement | orchestrator passes it / standalone user supplies it |
| `change_set` | git diff output | The full branch diff showing all changes | orchestrator passes it / standalone user supplies it |
| `spec_grounding` | markdown | Technical decisions (optional) | orchestrator passes it / standalone user supplies it |
| `implementation_plan` | markdown | Task breakdown (optional) | orchestrator passes it / standalone user supplies it |
| `test_matrix` | markdown | Verification evidence (optional) | orchestrator passes it / standalone user supplies it |

### Outputs
- **`pull_request_description`** (markdown) — Professional PR summary with high-level overview, categorized changes (features/fixes/tests), context updates (if any), and verification evidence.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/pull-request-builder/<story-id-or-timestamp>.md`. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/pull-request-builder/<story-id-or-timestamp>.md`; orchestrators override with an explicit path.
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.

## Caller Guidance

This capability receives **named inputs**, not file paths. How they arrive depends on the caller:

- **Pipeline (via an orchestrator/coordinator)**: the caller resolves the ARCUS workspace paths and
  passes the **content** of each input plus an explicit `output_path`. The capability constructs no
  ARCUS paths itself.
- **Standalone (a developer who has never used ARCUS)**: the user supplies the required inputs
  (`story`, `change_set`) directly — pasted inline or as a file they point to. Optional inputs (`spec_grounding`, `implementation_plan`, `test_matrix`) absent →
  proceed without them and note the omission. Output defaults to
  `.arcus/outputs/pull-request-builder/<story-id-or-timestamp>.md`.

The skill body below is written in terms of the named inputs; it never reads a hard-coded ARCUS
workspace path.

## Standalone Invocation

A developer can invoke this capability standalone by supplying the `change_set` (the full branch diff showing all changes) and the `story` (the original user story requirement). Optionally, they can provide `spec_grounding`, `implementation_plan`, and `test_matrix` for richer PR context. The capability generates a professional PR description/summary with a high-level overview, categorized changes (features/fixes/tests), context updates (if any), and verification evidence, and writes it to the output path (default `.arcus/outputs/pull-request-builder/<story-id-or-timestamp>.md`).

