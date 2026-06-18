# Flow: Story Branch Workspace Initialization

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:03:49Z
confidence: high
-->

## Overview
Initialization is now **split into two deferred steps**: (1) a **Scaffold** step (`scaffold.sh`)
creates the per-story ARCUS workspace and records the *planned* branch in the checkpoint **without
creating a git branch**; (2) a later **Branch** step (`branch.sh`), run at the start of
Implementation, realizes the actual git branch. The `arcus/<id>-N` naming convention is defined once
in the shared `scripts/lib/branch_name.sh` library, sourced by both scripts.

## Entry Points
- **Type**: Job (Scaffold)
- **Path/Topic**: `.arcus/bin/scaffold.sh <STORY_FILE|STORY_ID> [--base <branch>] [--mode <gated|afk>]`
- **File**: `plugins/arcus/scripts/scaffold.sh`
- **Type**: Job (Branch realization, deferred to Implementation)
- **Path/Topic**: `.arcus/bin/branch.sh <STORY_ID> [--base <branch>]`
- **File**: `plugins/arcus/scripts/branch.sh`

## Core Path
### Scaffold (no git branch)
1. `plugins/arcus/scripts/scaffold.sh` resolves `STORY_ID` (via `extract_story_id.sh` for a file, else direct).
2. `plugins/arcus/scripts/scaffold.sh` sources `scripts/lib/branch_name.sh` and computes the **planned** `arcus/<STORY_ID>-N` name.
3. `plugins/arcus/scripts/scaffold.sh` creates `.arcus/specs/<STORY_ID>/`, copies the story to `story.md`, and ensures the `.arcus/` ignore rule exists.
4. `plugins/arcus/scripts/scaffold.sh` calls `checkpoint.sh init` to write the schema-v2 checkpoint recording the planned `branch_name` / `base_branch` and `mode`. **No git branch is created.**

### Branch realization (start of Implementation)
5. `plugins/arcus/scripts/branch.sh` validates a clean working tree, reads the planned `branch_name` / `base_branch` from the checkpoint, and **re-computes** the name to absorb collisions created since scaffold.
6. `plugins/arcus/scripts/branch.sh` creates and checks out the branch from `origin/<base>` (or `<base>`).
7. `plugins/arcus/scripts/branch.sh` calls `checkpoint.sh set-branch` when the realized name differs from the planned name, so the checkpoint reflects the bump.

## Data Touchpoints
- **Entities**: `.arcus/specs/<STORY_ID>/` (story workspace root)
- **Entities**: `.arcus/specs/<STORY_ID>/session-checkpoint.json` (planned then realized `branch_name`/`base_branch`)
- **Entities**: `.gitignore` (workspace ignore configuration)
- **Entities**: Git refs/branches (`arcus/<STORY_ID>-<N>`)
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: Git CLI (`git status`, `git branch`, `git checkout`, `git fetch`)
- **Channel**: Local git command invocations in `branch.sh` (none in `scaffold.sh`)

## Scope
- `plugins/arcus/scripts/scaffold.sh`
- `plugins/arcus/scripts/branch.sh`
- `plugins/arcus/scripts/lib/branch_name.sh`
- `plugins/arcus/scripts/checkpoint.sh`
- `plugins/arcus/skills/solution-architect/SKILL.md` (drives Scaffold in the gated flow)
- `plugins/arcus/skills/implementation-runner/SKILL.md` (drives the deferred Branch step)
- `plugins/arcus/skills/arcus-controller/SKILL.md` (drives both in the AFK flow)
- `plugins/arcus/scripts/bootstrap.sh`

## Tests
- `plugins/arcus/scripts/tests/checkpoint.test.sh` (covers the checkpoint init / `set-branch` behavior)
