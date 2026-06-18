# Quickstart

Get up and running with ARCUS in three phases: install the plugin, prepare your repository, and run your first story.

## Install

Add the ARCUS plugin marketplace and install the plugin:

```sh
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

These commands work the same in GitHub Copilot CLI and Claude Code. For VS Code, add the marketplace to your `settings.json` (`chat.plugins.marketplaces`) and run **Chat: Install Plugin** from the Command Palette.

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

Point ARCUS at a user story file to start planning the SDLC pipeline:

```
plan path/to/story.md
```

Or use the longer entry phrase:

```
solution-architect path/to/story.md
```

**Default behavior:** ARCUS runs the **gated** experience — a chain of self-handing-off skills that
pauses at each handoff gate for your review. The entry point is `arcus:solution-architect`. At each
gate you respond "yes" to load the next stage, or "no" to pause; on a cold resume you type the next
stage's explicit phrase (e.g. `generate test plan for <STORY>`, `implement <STORY>`,
`review <STORY>`, `close <STORY>`).

The pipeline runs as **five phases** over nine ordered stages:

1. **Brainstorm** — Scaffolds the workspace and records the *planned* branch `arcus/[STORY-ID]-N` (no git branch yet), then builds context and resolves ambiguities → `plan.md` + `blueprint.md` (stages `scaffold`, `context_pack`, `spec_finalizer`, `blueprint`)
2. **Test Plan** — Designs test matrix → `test-plan.md` (stage `test_plan`)
3. **Implementation** — Creates the git branch, then implements tasks → committed code (stages `branch`, `task_1..N`)
4. **Code Review** — Two-tier holistic quality check → `review.md` + verdict (stage `code_review`)
5. **Closure** — Creates pull request (stage `closure`)

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

For more details on choosing between the two experiences, see [Mode Concepts](/concepts/modes). For a detailed breakdown of each pipeline stage, see [Pipeline Concepts](/concepts/pipeline).

## Quick Start Checklist

- [ ] Install ARCUS plugin
- [ ] Run `generate context` to build `.context/` snapshot
- [ ] Write your first story in `story.md`
- [ ] Run `plan story.md` to start the gated pipeline at the solution architect
- [ ] Review artifacts at each gate and respond "yes" to proceed
- [ ] Verify the opened pull request

**Pro Tips:**
- Your first story should use gated mode to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Review artifacts at each gate before proceeding
- You can pause anytime and resume later (gated mode only)
- Check status anytime with: "where am I?"
