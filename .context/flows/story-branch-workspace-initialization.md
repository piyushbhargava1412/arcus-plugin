# Flow: Story Branch Workspace Initialization

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:03:49Z
confidence: high
-->

## Overview
Creates an isolated story branch and scaffolds the per-story ARCUS workspace for downstream stage artifacts.

## Entry Points
- **Type**: Job
- **Path/Topic**: `.arcus/bin/branch.sh <STORY_ID> [--base <branch>]`
- **File**: `plugins/arcus/scripts/branch.sh`

## Core Path
1. `plugins/arcus/scripts/branch.sh` parses `STORY_ID` and optional `--base`.
2. `plugins/arcus/scripts/branch.sh` validates clean working tree via `git status --porcelain`.
3. `plugins/arcus/scripts/branch.sh` enumerates local/remote refs and computes next `arcus/<STORY_ID>-<N>` branch.
4. `plugins/arcus/scripts/branch.sh` creates and checks out the branch from base.
5. `plugins/arcus/scripts/branch.sh` creates `.arcus/specs/<STORY_ID>/` and ensures `.arcus/` ignore rule exists.

## Data Touchpoints
- **Entities**: `.arcus/specs/<STORY_ID>/` (story workspace root)
- **Entities**: `.gitignore` (workspace ignore configuration)
- **Entities**: Git refs/branches (`arcus/<STORY_ID>-<N>`)
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: Git CLI (`git status`, `git branch`, `git checkout`, `git fetch`)
- **Channel**: Local git command invocations in `branch.sh`

## Scope
- `plugins/arcus/scripts/branch.sh`
- `plugins/arcus/skills/arcus-controller/SKILL.md`
- `plugins/arcus/scripts/bootstrap.sh`

## Tests
- Not detected for this flow — checked: `plugins/arcus/scripts/tests/`
