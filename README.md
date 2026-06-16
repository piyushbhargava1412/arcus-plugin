# Agent Forge

> **Agent Forge Kit (AFK)** — a Spec → Code → Pull Request agentic SDLC factory, delivered as
> an installable agent-skills **plugin** for GitHub Copilot, Claude Code, and VS Code.

Agent Forge turns a written user story into a reviewed, test-backed pull request, largely
**Away From Keyboard (AFK)**. It bundles two orchestrator meta-skills and their supporting
sub-skills, helper scripts, and a session bootstrap hook into a single versioned plugin.

- **`context-builder-orchestrator`** — generates a one-time repository context snapshot.
- **`afk-skill-router`** — orchestrates the full Spec → Code → Pull Request pipeline.

This repository is also the **plugin marketplace** (`krill-afk`): one repo serves Copilot CLI,
Claude Code, and VS Code from the same unified plugin format.

---

## Contents

- [Install](#install)
  - [GitHub Copilot CLI](#github-copilot-cli)
  - [Claude Code](#claude-code)
  - [VS Code](#vs-code)
  - [IntelliJ / JetBrains](#intellij--jetbrains)
  - [Legacy vendored install (air-gapped)](#legacy-vendored-install-air-gapped)
- [Usage](#usage)
- [What gets produced](#what-gets-produced)
- [How it works](#how-it-works)
- [Versioning & releases](#versioning--releases)
- [Repository layout](#repository-layout)

---

## Install

All three primary tools share the same plugin format. Pick your tool below.

| Tool                 | Supports plugin install | Mechanism                                     |
| -------------------- | :---------------------: | --------------------------------------------- |
| GitHub Copilot CLI   |           ✅            | `/plugin marketplace add` + `/plugin install` |
| Claude Code          |           ✅            | `/plugin marketplace add` + `/plugin install` |
| VS Code              |           ✅            | `chat.plugins.marketplaces` setting or *Install Plugin From Source* |
| IntelliJ / JetBrains |           ➰            | Via Claude Code / Copilot CLI in the IDE terminal |

### GitHub Copilot CLI

```sh
copilot
# inside the session:
/plugin marketplace add piyushbhargava1412/agent-forge-plugin
/plugin install agent-forge@krill-afk
```

Installed plugins live under `~/.copilot/installed-plugins/krill-afk/agent-forge/`.

### Claude Code

```sh
claude
# inside the session:
/plugin marketplace add piyushbhargava1412/agent-forge-plugin
/plugin install agent-forge@krill-afk
```

### VS Code

Add the marketplace to your settings (`settings.json`):

```jsonc
{
  "chat.plugins.marketplaces": ["piyushbhargava1412/agent-forge-plugin"]
}
```

Then open the Command Palette → **Chat: Install Plugin** and choose `agent-forge`.
Alternatively, run **Chat: Install Plugin From Source** and paste the repository URL
`https://github.com/piyushbhargava1412/agent-forge-plugin`. VS Code also auto-discovers
plugins already installed through the Copilot CLI.

### IntelliJ / JetBrains

JetBrains IDEs do not load agent skills natively, but you can use Agent Forge from within the
IDE:

- Open the IDE's integrated terminal and run **Claude Code** or **Copilot CLI** there — both
  read the same `~/.claude` / `~/.copilot` installed plugins, so install once (above) and it is
  available in every JetBrains project.
- Or use the **Claude Code JetBrains plugin**, which shares the same plugin installation.

### Legacy vendored install (air-gapped)

When you cannot use a marketplace (offline / vendored workflow), copy the skills and helper
scripts directly into a target repository:

```sh
./scripts/install.sh /path/to/target-repo
```

This stages skills into `.github/skills/`, helper scripts into `.github/scripts/`, links
`.claude/skills → .github/skills`, and creates the `.aforge/` workspace.

---

## Usage

### 1. Build repository context (once per repo)

Before running stories, generate the shared context snapshot. In any installed tool, just ask:

```text
generate context
```

This invokes `context-builder-orchestrator`, which produces the `.context/` snapshot
(`repo_scope.md`, `repo_map.md`, `flows/*.md`, `testing-patterns.md`). Refresh it after major
repository restructuring.

### 2. Run the AFK pipeline (per story)

Point the router at a story file:

```sh
# Interactive
copilot                                   # or: claude
> implement path/to/story.md

# Fully unattended
copilot -p "implement path/to/story.md" --yolo
claude --dangerously-skip-permissions "implement path/to/story.md"
```

`afk-skill-router` then runs the full pipeline (Init → Architect → TestGen → Code → Closure)
autonomously and opens a pull request on completion.

> PR creation uses `gh pr create`. Ensure `gh` is installed and authenticated
> (`gh auth login`, or `GITHUB_TOKEN` / `GH_TOKEN` set) if you want automatic PRs.

---

## What gets produced

Each story gets a working area under `.aforge/specs/[STORY-ID]/` in the target repo:

| Artifact                | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `session-checkpoint.md` | Resumable execution checkpoints                      |
| `story.md`              | Canonical copy of the input story                    |
| `context-pack.md`       | Compact, token-efficient context bundle              |
| `assumptions.md`        | Explicit assumptions used to resolve ambiguity       |
| `blueprint.md`          | Implementation plan and task list                    |
| `test-plan.md`          | Generated verification matrix and test cases         |
| `PR_DESCRIPTION.md`     | Final PR body                                        |

Treat `.aforge/` as ephemeral working data — safe to inspect, commit, or discard.

---

## How it works

On the first agent session after install, a **`SessionStart` hook** runs
`scripts/bootstrap.sh`, which stages the deterministic helper scripts (branch, commit, PR,
checkpoint, story-id extraction) into the workspace at `.aforge/bin/` and records `AFORGE_HOME`
in `.aforge/env`. Skills then call these scripts from `.aforge/bin/`.

Because plugins are copied into a cache directory on install, all skills reference their own
bundled resources with **relative paths** (`./assets/...`, `./references/...`) and reference
other skills **by name** (`agent-forge:<skill>`), so they remain portable regardless of the
install location.

---

## Versioning & releases

- The plugin version lives in `plugins/agent-forge/.claude-plugin/plugin.json` (`version`)
  and follows [Semantic Versioning](https://semver.org/).
- Changes are recorded in [CHANGELOG.md](CHANGELOG.md)
  ([Keep a Changelog](https://keepachangelog.com/) format).

Release flow:

1. Bump `version` in `plugin.json` and update `CHANGELOG.md`.
2. Tag the commit: `git tag v0.1.0 && git push --tags`.
3. Consumers run `/plugin marketplace update krill-afk` to pull the new version.

---

## Repository layout

```text
.claude-plugin/marketplace.json          # Marketplace catalog (krill-afk)
plugins/agent-forge/
  .claude-plugin/plugin.json             # Plugin manifest (version authority)
  hooks/hooks.json                       # SessionStart bootstrap hook
  scripts/                               # Helper scripts + bootstrap.sh
  skills/                                # All orchestrator + sub-skills
scripts/install.sh                       # Legacy vendored installer (fallback)
CHANGELOG.md
LICENSE
```

---

## License

[MIT](LICENSE) © Krill


