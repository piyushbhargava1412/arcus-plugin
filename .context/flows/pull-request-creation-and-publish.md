# Flow: Pull Request Creation And Publish

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:03:49Z
confidence: high
-->

## Overview
Publishes the current story branch and opens a GitHub pull request using story-scoped PR description content.

## Entry Points
- **Type**: Job
- **Path/Topic**: `.arcus/bin/pr.sh <STORY_ID>`
- **File**: `plugins/arcus/scripts/pr.sh`

## Core Path
1. `plugins/arcus/scripts/pr.sh` resolves `.arcus/specs/<STORY_ID>/PR_DESCRIPTION.md` and current git branch.
2. `plugins/arcus/scripts/pr.sh` reads `base_branch` from `.arcus/specs/<STORY_ID>/session-checkpoint.json` (fallback: `main`).
3. `plugins/arcus/scripts/pr.sh` pushes the current branch to origin with `--force-with-lease`.
4. `plugins/arcus/scripts/pr.sh` runs `gh pr create` with title/body/base and emits `PR_URL`.

## Data Touchpoints
- **Entities**: `.arcus/specs/<STORY_ID>/PR_DESCRIPTION.md`
- **Entities**: `.arcus/specs/<STORY_ID>/session-checkpoint.json` (`base_branch`)
- **Entities**: Current git branch and remote PR URL output
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: GitHub CLI (`gh pr create`) and Git remote (`git push origin`)
- **Channel**: Shell command invocations in `pr.sh`

## Scope
- `plugins/arcus/scripts/pr.sh`
- `plugins/arcus/scripts/checkpoint.sh`
- `plugins/arcus/skills/arcus-controller/SKILL.md`

## Tests
- Not detected for this flow — checked: `plugins/arcus/scripts/tests/`
