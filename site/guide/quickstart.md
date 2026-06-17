# Quickstart

Get up and running with ARCUS in three phases: install the plugin, prepare your repository, and run your first story.

## Install

Add the ARCUS plugin marketplace and install the plugin:

```sh
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

This works identically in GitHub Copilot CLI and Claude Code. For VS Code, add the marketplace to your `settings.json` or use the Command Palette to install from source.

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
- Generates `AGENTS.md` navigation index
- Creates `CLAUDE.md` to import the context

**Expected output:** A populated `.context/` directory with all artifacts.

**Duration:** 5-15 minutes depending on repository size.

**When to re-run:** After major codebase restructuring or tech stack changes.

## 2. Run the Pipeline (Per Story)

Point ARCUS at a user story file to run the full SDLC pipeline:

```
implement path/to/story.md
```

Or use alternative triggers:

```
build path/to/story.md
forge path/to/story.md
```

**Default behavior:** ARCUS runs in **gated mode**, pausing at each handoff gate for your review. You respond "yes" to proceed to the next stage or "no" to pause and resume later.

The pipeline stages are:

1. **Init** — Creates branch `arcus/[STORY-ID]`, scaffolds workspace
2. **Brainstorm** — Resolves ambiguities → `assumptions.md` + `blueprint.md`
3. **Test Plan** — Designs test matrix → `test-plan.md`
4. **Code** — Implements tasks → committed code
5. **Review** — Holistic quality check → `review.md` + verdict
6. **Closure** — Creates pull request

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

To use AFK mode, add the `--afk` flag:

```
implement path/to/story.md --afk
run afk on path/to/story.md
```

For more details on choosing between modes, see [Mode Concepts](/concepts/modes). For a detailed breakdown of each pipeline stage, see [Pipeline Concepts](/concepts/pipeline).

## Quick Start Checklist

- [ ] Install ARCUS plugin
- [ ] Run `generate context` to build `.context/` snapshot
- [ ] Write your first story in `story.md`
- [ ] Run `implement story.md` in gated mode
- [ ] Review artifacts at each gate and respond "yes" to proceed
- [ ] Verify the opened pull request

**Pro Tips:**
- Your first story should use gated mode to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Review artifacts at each gate before proceeding
- You can pause anytime and resume later (gated mode only)
- Check status anytime with: "where am I?"
