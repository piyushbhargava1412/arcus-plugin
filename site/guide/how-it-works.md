# How it works

ARCUS uses a combination of plugin hooks, helper scripts, and portable skill references to deliver a consistent experience across GitHub Copilot, Claude Code, VS Code, and OpenCode.

## Bootstrap Process

Every ARCUS entry point runs `scripts/locate.sh` as its first step, which finds the newest installed copy of the plugin and runs `scripts/bootstrap.sh`. (Claude Code *also* fires the bundled `SessionStart` hook automatically. ARCUS's hooks are not observed firing on Copilot CLI — the cause is still unexplained, and **not** a schema difference: Copilot CLI does auto-discover a plugin's `hooks/hooks.json` and does normalize Claude's PascalCase event names. ARCUS simply never depends on the hook firing anywhere.) This:

1. Stages deterministic helper scripts into the workspace at `.arcus/bin/`:
   - Workspace scaffold (`scaffold.sh`) — creates the spec folder, copies the story, and inits the checkpoint with the *planned* branch (no git branch yet)
   - Branch realization (`branch.sh`) — creates the git branch later, at the start of Implementation
   - Commit automation
   - Pull request creation
   - Checkpoint read/write operations (including the `set-branch` action)
   - Story ID extraction utilities
   - The shared branch-naming library `lib/branch_name.sh` (defines the `arcus/<id>-N` convention once)
   - The shared git-workspace library `lib/git_context.sh` (worktree detection and default-branch resolution)

2. Records the `ARCUS_HOME` environment variable in `.arcus/env` for script discovery

These helper scripts provide consistent, tested operations that ARCUS skills invoke throughout the pipeline. Skills call scripts from `.arcus/bin/` — re-staged at the start of every run, so an upgraded plugin takes effect immediately instead of a months-old copy lingering.

### Worktrees, and why bootstrap fails loudly

The bootstrap asks git whether it is in a repository (`git rev-parse --git-dir`) rather than looking for a `.git` **directory**. In a git worktree `.git` is a *file* containing a `gitdir:` pointer, so a directory test is false there — and a bootstrap that skips staging on that basis leaves every later helper-script call failing with `No such file or directory`, with nothing pointing back at the cause.

For the same reason, `locate.sh` verifies the **post-condition** instead of trusting an exit code: after running the bootstrap it checks that `.arcus/bin/checkpoint.sh` and `.arcus/env` actually exist, and exits non-zero with an explanation if they do not. Reporting a healthy `ARCUS_HOME` over an unstaged workspace is a strictly worse failure than stopping.

## Worktree Sessions

When the workspace is a **linked git worktree** already checked out on a dedicated branch — the shape most agent-session hosts create — that branch *is* the story branch. `scaffold.sh` detects this and **adopts** it: it records the current branch as `branch_name`, resolves `base_branch` to the repository default (`origin/HEAD`, falling back to `main`/`master`), and marks the `branch` stage complete so Implementation skips branch creation entirely.

This matters because the host has usually bound its PR tracking to that branch. Cutting a fresh `arcus/[STORY-ID]-N` off it would leave the story on a branch the session knows nothing about.

Detection is deliberately narrow — a *linked worktree* on a *non-default* branch. A normal checkout that merely happens to sit on a feature branch is not adopted, and keeps ARCUS's usual behaviour of basing the story on wherever you currently are, so deliberate stacking still works. Two flags override the decision:

| Flag | Effect |
|---|---|
| `--use-current-branch` (or `ARCUS_USE_CURRENT_BRANCH=1`) | Adopt the current branch anywhere, worktree or not |
| `--new-branch` (or `ARCUS_USE_CURRENT_BRANCH=0`) | Always plan a fresh `arcus/[STORY-ID]-N`, even inside a worktree |
| `--base <branch>` | Set the base explicitly, overriding either path |

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
  `plan <STORY>`. spec-finalizer and implementation-planner run as one-shot subagents and never
  interview you; each records its least-confident decisions in an `## Open Questions` block that the
  orchestrator shows you **all at once**. That is the only place the pipeline stops — answer them and
  it runs to the pull request. A cold resume picks up from the checkpoint with `resume <STORY>`.
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

## Related

- [Running Across Hosts](/concepts/cross-host) — what each host actually enforces, ignores, or
  silently drops, and how an ARCUS agent is addressed on each
