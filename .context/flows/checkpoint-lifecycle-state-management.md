# Flow: Checkpoint Lifecycle State Management

<!-- context-meta
verification-commit: 5e94b2daba4bc8ee312c55334bfca39f18194fec
generated-at: 2026-06-23T16:43:54Z
confidence: high
-->

## Overview
Persists and mutates per-story stage status to support resumable gated and AFK orchestration.

## Entry Points
- **Type**: Job
- **Path/Topic**: `.arcus/bin/checkpoint.sh <init|read|complete|set-status|reopen|set-mode|set-branch> <STORY_ID> ...`
- **File**: `plugins/arcus/scripts/checkpoint.sh`

## Core Path
1. `plugins/arcus/scripts/checkpoint.sh` resolves action, story workspace, and checkpoint file path.
2. `plugins/arcus/scripts/checkpoint.sh init` writes schema-v2 JSON with the **ordered stage keys** `scaffold → context_pack → spec_finalizer → plan → test_plan → branch → task_1..N → code_review → context_sync → closure` and default statuses, plus the **planned** `branch_name` / `base_branch` fields (init records the planned branch **without creating a git branch** — branch creation is deferred to `branch.sh`).
3. `plugins/arcus/scripts/checkpoint.sh` mutation actions invoke `mutate_json()` to migrate legacy booleans and update status/mode fields; the **`set-branch`** action records a realized (collision-bumped) `branch_name` / `base_branch` back onto the checkpoint (called by `branch.sh`).
4. `plugins/arcus/scripts/checkpoint.sh` writes updated `.arcus/specs/<STORY_ID>/session-checkpoint.json` atomically via temp file move.

## Data Touchpoints
- **Entities**: `.arcus/specs/<STORY_ID>/session-checkpoint.json` (checkpoint source of truth)
- **Entities**: `stages.*` (ordered keys above), `mode`, `review_round`, `branch_name`, `base_branch` JSON fields
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: Node.js runtime for JSON read/mutate/write (`node -e`)
- **Channel**: Inline JavaScript execution from `checkpoint.sh`

## Scope
- `plugins/arcus/scripts/checkpoint.sh`
- `plugins/arcus/scripts/scaffold.sh` (init with planned branch fields)
- `plugins/arcus/scripts/branch.sh` (`set-branch` on a collision bump)
- `plugins/arcus/skills/arcus-controller/SKILL.md` (unified orchestrator — owns the checkpoint in both interactive and autonomous modes)
- `plugins/arcus/skills/implementation-runner/SKILL.md`
- `plugins/arcus/scripts/tests/checkpoint.test.sh`

## Tests
- `plugins/arcus/scripts/tests/checkpoint.test.sh`
