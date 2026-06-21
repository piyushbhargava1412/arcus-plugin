# Flow: Story Commit Persistence

<!-- context-meta
verification-commit: be0eb93e8a0f015f0513832769b32636180154d8
generated-at: 2026-06-21T08:00:00Z
confidence: high
-->

## Overview
Creates conventional commits for story work while excluding generated `.arcus` artifacts from commit
payloads. During Implementation, the **per-task commits are driven by the `implementation-runner`
skill** (the single canonical loop driver): for each `### Task N:` it invokes the
`subagent-task-dispatcher` protocol, which calls `commit.sh` once per task after the full
RED→GREEN→refactor→spec-check sequence completes. The script mechanism itself is unchanged.

## Entry Points
- **Type**: Job
- **Path/Topic**: `.arcus/bin/commit.sh <STORY_ID> <message>`
- **File**: `plugins/arcus/scripts/commit.sh`

## Core Path
1. `plugins/arcus/scripts/commit.sh` validates `STORY_ID` and commit message inputs.
2. `plugins/arcus/scripts/commit.sh` stages all workspace changes via `git add --all`.
3. `plugins/arcus/scripts/commit.sh` removes `.arcus/` from index staging via `git reset -- .arcus/`.
4. `plugins/arcus/scripts/commit.sh` creates commit `feat(<STORY_ID>): <message>` when staged diff is non-empty.

## Data Touchpoints
- **Entities**: Git index/staging area
- **Entities**: Commit message format `feat(<STORY_ID>): <message>`
- **Entities**: `.arcus/` exclusion from staged content
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: Git CLI (`git add`, `git reset`, `git diff --cached`, `git commit`)
- **Channel**: Local git command invocations in `commit.sh`

## Scope
- `plugins/arcus/scripts/commit.sh`
- `plugins/arcus/skills/implementation-runner/SKILL.md` (drives the per-task commit loop)
- `plugins/arcus/skills/subagent-task-dispatcher/SKILL.md` (calls `commit.sh` per task after verify → refactor gate → spec-check)
- `plugins/arcus/skills/arcus-controller/SKILL.md`

## Tests
- Not detected for this flow — checked: `plugins/arcus/scripts/tests/`
