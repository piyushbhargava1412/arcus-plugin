# Quickstart

Get up and running with ARCUS in three phases: install the plugin, prepare your repository, and run your first story.

## Install

Add the ARCUS plugin marketplace and install the plugin:

```sh
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

These commands work the same in GitHub Copilot CLI and Claude Code. For VS Code, add the marketplace to your `settings.json` (`chat.plugins.marketplaces`) and run **Chat: Install Plugin** from the Command Palette. For OpenCode, use the one-command global installer — see the [README](https://github.com/piyushbhargava1412/arcus-plugin#opencode) for details.

## 1. Build Repository Context (Once Per Repo)

Before running stories, generate the shared context snapshot. In your agent session, ask:

```
generate context
```

Or use alternative triggers:

```
agentify this repo
wire me up
```

This invokes the `repo-agentifier` skill, which:

- Analyzes repository structure → `repo_scope.md` and `repo_map.md`
- Discovers business flows → `flows/*.md` files
- Captures test patterns → `testing-patterns.md`
- Captures design & coding patterns → `design-and-coding-patterns.md`
- Generates `AGENTS.md` navigation index
- Creates `CLAUDE.md` to import the context

**Expected output:** A populated `.context/` directory with all artifacts.

**Duration:** 5-15 minutes depending on repository size.

**When to re-run:** After major codebase restructuring or tech stack changes.

## 2. Run the Pipeline (Per Story)

Point ARCUS at a user story file to start the SDLC pipeline:

```
arcus path/to/story.md
```

You can also use `plan path/to/story.md` to explicitly enter the default `gated` mode.

**Default behavior:** ARCUS uses the **lean** profile and stops after `plan` in gated mode. The
`arcus:arcus-controller` runs a compact plan → build → deterministic gate → one holistic review
pipeline. Use `--thorough` (or `"profile": "thorough"` in `.arcus/config.json`) for the full 5.x
pipeline. On a cold resume, `resume <STORY>` continues from the checkpoint. For profiles and the
three modes (gated, intelligent, afk), see [Three Modes, One Pipeline](/concepts/modes).

The default lean pipeline uses these ordered stages:

1. **Scaffold → Plan** — one planner writes `plan.md` with decisions, open questions, tasks, and inline tests
2. **Implementation** — creates the branch and implements `task_1..N` (TDD in-thread for small plans)
3. **Code Review** — `gate.mjs run` runs repository checks and one `change-reviewer` produces `review.md`
4. **Context Sync** — runs only when `gate.mjs drift` detects structural drift
5. **Closure** — writes the PR description in-thread and opens the pull request

### Choosing Your Mode

ARCUS offers three modes, all driven by the same `arcus:arcus-controller` orchestrator:

The profile is orthogonal to the mode. `lean` is the default; `thorough` is the full pipeline, opt-in
with `--thorough` or config.

**Gated (Default)** — Best for:
- First time using ARCUS in this repository
- Stories with ambiguities or unknowns
- High-risk or complex changes
- Learning how ARCUS works
- Need to pause and resume across sessions

Runs with optional phase-boundary gates (configurable via `.arcus/config.json`). Trigger: `arcus path/to/story.md` or `plan path/to/story.md`.

**Intelligent** — Best for:
- Cloud/CI runs (ARCUS cloud explicitly uses `--intelligent`)
- Local runs that want Brainstorm questions without phase-boundary pauses
- Want question-gating but no pipeline pausing between phases

Surfaces only Brainstorm open questions; no phase-boundary gates. Trigger: `arcus path/to/story.md --intelligent`.

**AFK (Autonomous)** — Best for:
- High-confidence, well-defined stories
- Familiar codebase and domain
- Simple features or bug fixes
- Uninterrupted 30-90 minute sessions

Never stops — open questions are recorded but never surfaced. Trigger: `forge path/to/story.md`, `afk path/to/story.md`, `run afk on path/to/story.md`, or `arcus path/to/story.md --afk`.

For a detailed comparison of all three modes, see [Three Modes, One Pipeline](/concepts/modes). For a detailed breakdown of each pipeline stage, see [Pipeline Concepts](/concepts/pipeline). To configure which model each agent dispatch uses, see [Model Policy](/guide/model-policy).

## Quick Start Checklist

- [ ] Install ARCUS plugin
- [ ] Run `generate context` to build `.context/` snapshot
- [ ] Write your first story in `story.md`
- [ ] Run `arcus story.md` to start the lean pipeline in gated mode (default)
- [ ] Answer the open questions if ARCUS raises any
- [ ] Verify the opened pull request

**Pro Tips:**
- Your first story should use gated mode to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Answer the open questions carefully — the last chance to steer before code is written
- You can pause anytime and resume later (both gated and intelligent modes support this)
- Check status anytime with: "where am I?"
