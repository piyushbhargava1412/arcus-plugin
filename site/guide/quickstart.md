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

Point ARCUS at a user story file to start planning the SDLC pipeline:

```
plan path/to/story.md
```

Or jump straight to implementation (still interactive/gated):

```
implement path/to/story.md
```

**Default behavior:** ARCUS runs in **interactive** mode (gated) — the `arcus:arcus-controller`
orchestrator drives the pipeline and stops **once** — when a Brainstorm stage has open questions.
Answer them in your own words and it runs all the way to the pull request; if it has none, it never
stops. On a cold resume, `resume <STORY>` continues from the checkpoint. To brainstorm only (context pack +
finalized spec, no implementation), use `brainstorm <STORY>` / `kick off <STORY>` (the `kick-off`
coordinator).

The pipeline runs as **six phases** over ten ordered stages:

1. **Brainstorm** — Scaffolds the workspace and records the *planned* branch `arcus/[STORY-ID]-N` (no git branch yet — or, in a git worktree, adopts the session branch already checked out), then builds context and resolves ambiguities → `grounded-spec.md` + `plan.md` (stages `scaffold`, `context_pack`, `spec_finalizer`, `plan`)
2. **Test Plan** — Designs test matrix → `test-plan.md` (stage `test_plan`)
3. **Implementation** — Creates the git branch (skipped if one was adopted), then implements tasks → committed code (stages `branch`, `task_1..N`)
4. **Code Review** — Two-tier holistic quality check → `review.md` + verdict (stage `code_review`)
5. **Context Sync** — On approval, reconciles only the `.context/` artifacts the diff materially drifted (no new artifact; rationale in the sync commit), then auto-continues (stage `context_sync`)
6. **Closure** — Creates pull request (stage `closure`)

### Choosing Your Mode

**Gated Mode (Default)** — Best for:
- First time using ARCUS in this repository
- Stories with ambiguities or unknowns
- High-risk or complex changes
- Learning how ARCUS works
- Need to pause and resume across sessions

**AFK Mode (Fully Autonomous)** — Best for:
- High-confidence, well-defined stories
- Familiar codebase and domain
- Simple features or bug fixes
- Uninterrupted 30-90 minute sessions

To use AFK mode, use an AFK trigger or the `--afk` flag (these activate the `arcus:arcus-controller`):

```
run afk on path/to/story.md
forge path/to/story.md
implement path/to/story.md --afk
```

For more details on choosing between the two modes, see [Mode Concepts](/concepts/modes). For a detailed breakdown of each pipeline stage, see [Pipeline Concepts](/concepts/pipeline).

## Quick Start Checklist

- [ ] Install ARCUS plugin
- [ ] Run `generate context` to build `.context/` snapshot
- [ ] Write your first story in `story.md`
- [ ] Run `plan story.md` to start the interactive (gated) pipeline
- [ ] Answer the open questions if ARCUS raises any
- [ ] Verify the opened pull request

**Pro Tips:**
- Your first story should use gated mode to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Answer the open questions carefully — the last chance to steer before code is written
- You can pause anytime and resume later (gated mode only)
- Check status anytime with: "where am I?"
