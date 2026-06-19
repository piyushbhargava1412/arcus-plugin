# How it works

ARCUS uses a combination of plugin hooks, helper scripts, and portable skill references to deliver a consistent experience across GitHub Copilot, Claude Code, and VS Code.

## Bootstrap Process

On the first agent session after installing the plugin, a **SessionStart hook** automatically runs `scripts/bootstrap.sh`. This script:

1. Stages deterministic helper scripts into the workspace at `.arcus/bin/`:
   - Workspace scaffold (`scaffold.sh`) — creates the spec folder, copies the story, and inits the checkpoint with the *planned* branch (no git branch yet)
   - Branch realization (`branch.sh`) — creates the git branch later, at the start of Implementation
   - Commit automation
   - Pull request creation
   - Checkpoint read/write operations (including the `set-branch` action)
   - Story ID extraction utilities
   - The shared branch-naming library `lib/branch_name.sh` (defines the `arcus/<id>-N` convention once)

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

## Two Experiences: Gated Chain vs AFK Controller

ARCUS runs the same pipeline two ways, with two different orchestration shapes:

- **Gated (default, user-driven)** is a **chain of self-handing-off skills** — there is **no router**
  and **no shared pipeline file**. You enter at `arcus:solution-architect`
  (`architect <STORY>` / `plan <STORY>` / `brainstorm <STORY>`). Each stage skill embeds a **Handoff Protocol** that
  names only its immediate successor: a same-session `"yes"` loads the next stage, and a cold resume
  uses the successor's explicit phrase plus the checkpoint to pick up where you left off. The
  spec-finalizer and implementation-planner dialogues run **in the main thread** so they can interview
  you directly.
- **AFK (autonomous)** is the `arcus:arcus-controller` meta-skill. It activates **only** on AFK
  phrases (`afk`, `--afk`, `forge`, `run afk on <STORY>`), dispatches each stage as a one-shot
  subagent, and holds the **single canonical ordered stage list** in its own body.

Both reuse the same `arcus:implementation-runner` loop driver for the Implementation stage, the same
helper scripts, and the same checkpoint stage keys
(`scaffold → context_pack → spec_finalizer → blueprint → test_plan → branch → task_1..N → code_review → closure`).

> Skills are still dispatched imperatively (one skill reads and follows the next by name). Isolated
> execution via `context: fork` is a deferred follow-up and is **not** in use today.

## Workspace Structure

Each story execution creates a working area under `.arcus/specs/[STORY-ID]/` in your repository:

- `session-checkpoint.json` — Resumable per-stage execution state (ordered stage keys + the planned/realized branch fields)
- `story.md` — Canonical copy of the input story
- `context-pack.md` — Compact, token-efficient context bundle
- `plan.md` — Consolidated planning deliberation (grounded decisions, dialogue answers, design choices)
- `blueprint.md` — Machine-parsed implementation plan and task list
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
