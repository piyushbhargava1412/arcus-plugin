# How it works

ARCUS uses a combination of plugin hooks, helper scripts, and portable skill references to deliver a consistent experience across GitHub Copilot, Claude Code, VS Code, and OpenCode.

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

When you install ARCUS, the plugin is copied into a cache directory managed by your tool (Copilot CLI, Claude Code, VS Code, or OpenCode). Because the installation path varies by tool and user, ARCUS is designed for location-independence:

### Resource References

Skills reference their bundled resources using **relative paths**:
- `./assets/...` — Prompt templates and documentation
- `./references/...` — Example artifacts and patterns

This ensures skills can locate their dependencies regardless of where the plugin cache lives.

### Skill Cross-References

Skills reference other ARCUS skills **by name**, not by path:
- `arcus:<skill>` — e.g., `arcus:context-pack-builder`, `arcus:implementation-planner`

The agent runtime resolves these names to the appropriate skill within the plugin, maintaining portability across installation locations.

## Two Modes: Interactive vs Autonomous

ARCUS is a **three-tier capability library** — atomic capabilities, thin coordinators, and one
stateful `arcus:arcus-controller` orchestrator that owns the pipeline (checkpoint, branch, stage
gates). See [The Capability Library](/concepts/capability-library) for the full breakdown. That one
orchestrator runs the same pipeline in two modes:

- **Interactive (default, user-driven)** — the gated mode. You enter with `implement <STORY>` or
  `plan <STORY>`; the orchestrator pauses at each handoff gate. A same-session `"yes"` advances to the
  next stage, and a cold resume uses the stage's explicit phrase plus the checkpoint to pick up where
  you left off. The spec-finalizer and implementation-planner dialogues run **in the main thread** so
  they can interview you directly. (For brainstorm-only — context pack + finalized spec — the
  `kick-off` coordinator runs via `brainstorm <STORY>` / `kick off <STORY>` / `architect <STORY>`.)
- **Autonomous (AFK)** — the hands-off mode of the same orchestrator. It activates on AFK
  phrases (`afk`, `--afk`, `forge`, `run afk on <STORY>`), dispatches each stage as a one-shot
  subagent, and auto-confirms every gate.

Both modes reuse the same `arcus:implementation-runner` loop driver for the Implementation stage, the
same helper scripts, and the same checkpoint stage keys
(`scaffold → context_pack → spec_finalizer → plan → test_plan → branch → task_1..N → code_review → context_sync → closure`).

> Skills are still dispatched imperatively (one skill reads and follows the next by name). Isolated
> execution via `context: fork` is a deferred follow-up and is **not** in use today.

## Workspace Structure

Each story execution creates a working area under `.arcus/specs/[STORY-ID]/` in your repository:

- `session-checkpoint.json` — Resumable per-stage execution state (ordered stage keys + the planned/realized branch fields)
- `story.md` — Canonical copy of the input story
- `context-pack.md` — Compact, token-efficient context bundle
- `grounded-spec.md` — Grounded story decisions (written by spec-finalizer)
- `plan.md` — Design deliberation plus the atomic task list (written by implementation-planner)
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
