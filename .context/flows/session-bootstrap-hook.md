# Flow: Session Bootstrap Hook

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:03:49Z
confidence: high
-->

## Overview
Stages ARCUS helper scripts into the active workspace at session start so subsequent skills can execute deterministic script adapters.

## Entry Points
- **Type**: Listener
- **Path/Topic**: SessionStart hook command execution
- **File**: `plugins/arcus/hooks/hooks.json`

## Core Path
1. `plugins/arcus/hooks/hooks.json` -> `plugins/arcus/scripts/bootstrap.sh`
2. `plugins/arcus/scripts/bootstrap.sh` resolves `ARCUS_HOME` and checks workspace `.git` presence.
3. `plugins/arcus/scripts/bootstrap.sh` copies `plugins/arcus/scripts/*.sh` (excluding itself) into `.arcus/bin/` and marks them executable.
4. `plugins/arcus/scripts/bootstrap.sh` writes `.arcus/env` and appends `.arcus/` ignore entry to root `.gitignore` when missing.

## Data Touchpoints
- **Entities**: `.arcus/bin/*.sh` (workspace-staged helper scripts)
- **Entities**: `.arcus/env` (workspace environment file)
- **Entities**: `.gitignore` (workspace ignore configuration)
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: Local git workspace filesystem contract (`.git` presence check)
- **Channel**: Local shell/file operations in `bootstrap.sh`

## Scope
- `plugins/arcus/hooks/hooks.json`
- `plugins/arcus/scripts/bootstrap.sh`
- `plugins/arcus/scripts/*.sh`

## Tests
- Not detected for this flow — checked: `plugins/arcus/scripts/tests/`
