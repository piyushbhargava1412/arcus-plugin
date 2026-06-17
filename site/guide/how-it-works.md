# How it works

ARCUS uses a combination of plugin hooks, helper scripts, and portable skill references to deliver a consistent experience across GitHub Copilot, Claude Code, and VS Code.

## Bootstrap Process

On the first agent session after installing the plugin, a **SessionStart hook** automatically runs `scripts/bootstrap.sh`. This script:

1. Stages deterministic helper scripts into the workspace at `.arcus/bin/`:
   - Branch management (creation, switching)
   - Commit automation
   - Pull request creation
   - Checkpoint read/write operations
   - Story ID extraction utilities

2. Records the `ARCUS_HOME` environment variable in `.arcus/env` for script discovery

These helper scripts provide consistent, tested operations that ARCUS skills invoke throughout the pipeline. Skills call scripts from `.arcus/bin/`, ensuring they use the bootstrapped versions specific to your session.

## Plugin Portability

When you install ARCUS, the plugin is copied into a cache directory managed by your tool (Copilot CLI, Claude Code, or VS Code). Because the installation path varies by tool and user, ARCUS is designed for location-independence:

### Resource References

Skills reference their bundled resources using **relative paths**:
- `./assets/...` — Prompt templates and documentation
- `./references/...` — Example artifacts and patterns

This ensures skills can locate their dependencies regardless of where the plugin cache lives.

### Skill Cross-References

Skills reference other ARCUS skills **by name**, not by path:
- `arcus:<skill>` — e.g., `arcus:context-pack-builder`, `arcus:implementation-planner`

The agent runtime resolves these names to the appropriate skill within the plugin, maintaining portability across installation locations.

## Workspace Structure

Each story execution creates a working area under `.arcus/specs/[STORY-ID]/` in your repository:

- `session-checkpoint.json` — Resumable per-stage execution state
- `story.md` — Canonical copy of the input story
- `context-pack.md` — Compact, token-efficient context bundle
- `clarifications.md` — Answers captured during Brainstorm
- `assumptions.md` — Explicit assumptions used to resolve ambiguity
- `blueprint.md` — Implementation plan and task list
- `test-plan.md` — Generated verification matrix
- `review.md` — Holistic code-review report
- `PR_DESCRIPTION.md` — Final pull request body

The `.arcus/` directory is automatically added to `.gitignore` — treat it as ephemeral working data that's safe to inspect, commit selectively, or discard.

## Session Continuity

ARCUS maintains execution state through `session-checkpoint.json`, which records:
- Current pipeline stage
- Completed stages
- Stage-specific metadata

This checkpoint allows you to:
- Pause at any gate and resume later
- Recover from interrupted sessions
- Check status with "where am I?"
- Skip to specific stages when resuming

The checkpoint is persisted to disk after each stage completes, ensuring no work is lost between agent sessions.
