# ARCUS

> **ARCUS (Any Repository Can Use Spec-driven development)** — a Spec → Code → Pull Request agentic
> SDLC factory, delivered as an installable agent-skills **plugin** for GitHub Copilot, Claude Code,
> and VS Code.

ARCUS turns a written user story into a reviewed, test-backed pull request through human-gated
SDLC stages, with an opt-in fully-autonomous **Away From Keyboard (AFK)** mode. Its skills are
organized into a three-tier capability library — stateless **Capabilities**, thin **Coordinators**,
and stateful **Orchestrators** — plus helper scripts and a session bootstrap hook, packaged into a
single versioned plugin.

- **`repo-agentifier`** — scans the repo to build the `.context/` snapshot, then generates `AGENTS.md` + `CLAUDE.md` to make it agent-ready.
- **`arcus-controller`** — the single orchestrator driving both experiences over one canonical
  stage sequence:
  - **Interactive (default, user-driven)** — the Spec → Code → Pull Request flow in `interactive`
    mode, entered via `implement <STORY>` / `plan <STORY>`; the controller pauses at each handoff
    gate. The brainstorm phase delegates to the **`kick-off`** coordinator (context-pack-builder →
    spec-finalizer).
  - **Autonomous (AFK)** — the opt-in unattended mode in `autonomous` mode; activates on
    `afk` / `--afk` / `forge` / `run afk on <STORY>` and runs the whole pipeline end-to-end with no gates.

This repository is also the **plugin marketplace** (`arcus`): one repo serves Copilot CLI,
Claude Code, and VS Code from the same unified plugin format.

---

## Contents

- [Install](#install)
  - [GitHub Copilot CLI](#github-copilot-cli)
  - [Claude Code](#claude-code)
  - [VS Code](#vs-code)
  - [IntelliJ / JetBrains](#intellij--jetbrains)
- [Updating](#updating)
- [Uninstalling](#uninstalling)
- [Local development](#local-development)
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
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

Installed plugins live under `~/.copilot/installed-plugins/arcus/arcus-plugin/`.

### Claude Code

```sh
claude
# inside the session:
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

### VS Code

Add the marketplace to your settings (`settings.json`):

```jsonc
{
  "chat.plugins.marketplaces": ["piyushbhargava1412/arcus-plugin"]
}
```

Then open the Command Palette → **Chat: Install Plugin** and choose `arcus-plugin`.
Alternatively, run **Chat: Install Plugin From Source** and paste the repository URL
`https://github.com/piyushbhargava1412/arcus-plugin`. VS Code also auto-discovers
plugins already installed through the Copilot CLI.

### IntelliJ / JetBrains

JetBrains IDEs do not load agent skills natively, but you can use ARCUS from within the
IDE:

- Open the IDE's integrated terminal and run **Claude Code** or **Copilot CLI** there — both
  read the same `~/.claude` / `~/.copilot` installed plugins, so install once (above) and it is
  available in every JetBrains project.
- Or use the **Claude Code JetBrains plugin**, which shares the same plugin installation.

---

## Updating

Installed plugins are a **copied snapshot** in each tool's cache — they do not live-track
this repo. Pulling the latest is a two-step, user-initiated action: refresh the marketplace
catalog, then update the plugin. Changes take effect in the **next session** (the
`SessionStart` hook re-stages `.arcus/bin/` fresh each time).

### Claude Code

```sh
# inside a session:
/plugin marketplace update arcus     # refresh the catalog from GitHub
/plugin update arcus-plugin          # re-copy the latest into the cache

# or non-interactively:
claude plugin marketplace update arcus
```

### GitHub Copilot CLI

```sh
# inside a session:
/plugin marketplace update arcus
/plugin update arcus-plugin
```

### VS Code

VS Code shares the Claude/Copilot plugin cache, so updating through either CLI (or the
plugin manager UI) refreshes it everywhere.

> **Version bumping is what triggers an update.** A tool compares the cached version against
> the source's `version` in [plugins/arcus/.claude-plugin/plugin.json](plugins/arcus/.claude-plugin/plugin.json). If that field is unchanged, the
> update is treated as a no-op and the cached copy is kept. On every release: bump
> `version`, add a `CHANGELOG.md` entry, commit, and tag. (Do not also set `version` in the
> marketplace entry — `plugin.json` wins silently and a stale duplicate can mask it.)

---

## Uninstalling

### Claude Code / Copilot CLI

The fastest way is the direct command:

```sh
/plugin uninstall arcus-plugin@arcus
```

Or via the UI: run `/plugin`, go to the **Installed** tab, and press **Enter** on
`arcus-plugin` to open its detail view — enable / disable / **uninstall** live there. (The
list view itself only shows disable, so you have to open the plugin to fully remove it.) Run
`/reload-plugins` afterward to apply the change without restarting.

To remove the whole marketplace (this also uninstalls every plugin installed from it):

```sh
/plugin marketplace remove arcus
```

CLI equivalents work outside a session too:

```sh
claude plugin uninstall arcus-plugin@arcus
claude plugin marketplace remove arcus
```

### Workspace cleanup

The plugin stages a per-repo `.arcus/` workspace (helper scripts, specs, checkpoints) in each
repository you ran it in. It is git-ignored and safe to delete:

```sh
rm -rf .arcus
```

---

## Local development

When iterating on skills, the copy-to-cache model is slow (every change needs a publish +
re-pull). For local dev, load the plugin **directly from your working tree** instead — no
marketplace, no install, no cache copy:

```sh
claude --plugin-dir ./plugins/arcus
```

- Edits to `SKILL.md` files and scripts are picked up with `/reload-plugins` — no restart.
- If a plugin loaded via `--plugin-dir` shares a name with an installed one, the **local copy
  takes precedence** for that session, so you can test changes without uninstalling first.
- `claude plugin validate ./plugins/arcus` checks the manifest, skills, and
  `hooks/hooks.json` before you publish.

Only bump the version and push when you're ready to cut a release that installed users will pull.

---

## Usage

### 1. Build repository context (once per repo)

Before running stories, generate the shared context snapshot. In any installed tool, just ask:

```text
generate context
```

This invokes `repo-agentifier`, which produces the `.context/` snapshot
(`repo_scope.md`, `repo_map.md`, `flows/*.md`, `testing-patterns.md`) plus an `AGENTS.md`
navigation index and a `CLAUDE.md` that imports it. Refresh it after major
repository restructuring.

### 2. Run the pipeline (per story)

By default the pipeline is **human-gated** and runs as a **self-handing-off chain of stage skills**
(no router, no shared pipeline file). Start planning at the solution architect; each stage runs one
at a time and pauses at a handoff between stages so you can review and reply `yes` to proceed (or `no`
to pause and resume later). Each stage is also independently invocable.

```sh
copilot                                   # or: claude
> plan path/to/story.md                   # interactive entry: arcus-controller; stops at each handoff for your "yes"
```

The interactive pipeline runs as **six phases** over ten ordered stages (`scaffold` is the opening
stage of Brainstorm, not a phase of its own):

1. **Brainstorm** (human-in-the-loop) — `scaffold.sh` creates the spec folder + `story.md` + checkpoint with the *planned* branch (**no git branch yet**); then the `kick-off` coordinator (context pack + recommendation-first spec-finalizer dialogue → `grounded-spec.md`) and the implementation-planner dialogue → `plan.md`. Stages `scaffold`, `context_pack`, `spec_finalizer`, `plan`. *Gate.*
2. **Test Plan** (automated) — `test-plan.md`. Runs on your `yes`, then pauses before implementation. Stage `test_plan`.
3. **Implementation** (automated, TDD per task) — the `branch` step creates the git branch first (deferred-branch design), then per-task committed code. Stages `branch`, `task_1..N`. *Gate.*
4. **Code Review** (automated) — two-tier holistic review of the branch diff → `review.md` + verdict. *Decision gate:* approve, or loop findings back into Implementation as fix-tasks. Stage `code_review`.
5. **Context Sync** (automated) — on approval, reconciles only the shared `.context/` artifacts the diff materially drifted (facts-only, diff-driven; rationale in the sync commit body), then auto-continues to Closure. Stage `context_sync`.
6. **Closure** (manual trigger) — opens the pull request. Stage `closure`.

Interactive entry / per-stage / continuation phrases: `plan <STORY>` or `implement <STORY>`
(entry), `generate test plan for <STORY>`, `code <STORY>`, `review <STORY>`,
`fix <STORY>`, `sync context for <STORY>`, `close <STORY>`, and `yes` / `no` at any gate. The Implementation loop is the shared
`implementation-runner` skill, reused by both the interactive and autonomous controller modes.

#### Fully unattended (AFK) mode

The Away-From-Keyboard behaviour is the opt-in `arcus-controller` meta-skill: say `forge …` /
`run afk on …` or add `--afk`. The controller runs every stage back-to-back as one-shot subagents,
auto-confirms all handoff gates, and emits milestone-only output. (Its body holds the single
canonical ordered stage list.)

```sh
copilot -p "implement path/to/story.md --afk" --yolo
claude --dangerously-skip-permissions "forge path/to/story.md"
```

> PR creation uses `gh pr create`. Ensure `gh` is installed and authenticated
> (`gh auth login`, or `GITHUB_TOKEN` / `GH_TOKEN` set) if you want automatic PRs.

---

## What gets produced

Each story gets a working area under `.arcus/specs/[STORY-ID]/` in the target repo:

| Artifact                | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `session-checkpoint.json` | Resumable per-stage execution state (ordered stage keys + status enum; planned/realized branch fields) |
| `story.md`              | Canonical copy of the input story                    |
| `context-pack.md`       | Compact, token-efficient context bundle              |
| `grounded-spec.md`      | Grounded spec — resolved ambiguities, decisions, and dialogue answers (owned by spec-finalizer) |
| `plan.md`               | Implementation plan — design deliberation and the atomic task list (owned by implementation-planner) |
| `test-plan.md`          | Generated verification matrix and test cases         |
| `review.md`             | Holistic code-review report + verdict                |
| `PR_DESCRIPTION.md`     | Final PR body                                        |

Treat `.arcus/` as ephemeral working data — safe to inspect, commit, or discard.

---

## How it works

On the first agent session after install, a **`SessionStart` hook** runs
`scripts/bootstrap.sh`, which stages the deterministic helper scripts (`scaffold.sh`, `branch.sh`,
`commit.sh`, `pr.sh`, `checkpoint.sh`, `extract_story_id.sh`, and the shared
`lib/branch_name.sh` naming library) into the workspace at `.arcus/bin/` and records `ARCUS_HOME`
in `.arcus/env`. Skills then call these scripts from `.arcus/bin/`. Note the **deferred-branch**
split: `scaffold.sh` only records the *planned* branch in the checkpoint, while `branch.sh` creates
the git branch later at the start of Implementation.

Because plugins are copied into a cache directory on install, all skills reference their own
bundled resources with **relative paths** (`./assets/...`, `./references/...`) and reference
other skills **by name** (`arcus:<skill>`), so they remain portable regardless of the
install location.

---

## Versioning & releases

- The plugin version lives in `plugins/arcus/.claude-plugin/plugin.json` (`version`)
  and follows [Semantic Versioning](https://semver.org/).
- Changes are recorded in [CHANGELOG.md](CHANGELOG.md)
  ([Keep a Changelog](https://keepachangelog.com/) format).

Release flow:

1. Bump `version` in `plugin.json` and update `CHANGELOG.md`.
2. Tag the commit: `git tag v0.1.0 && git push --tags`.
3. Consumers run `/plugin marketplace update arcus` to pull the new version.

---

## Repository layout

```text
.claude-plugin/marketplace.json          # Marketplace catalog (arcus)
plugins/arcus/
  .claude-plugin/plugin.json             # Plugin manifest (version authority)
  hooks/hooks.json                       # SessionStart bootstrap hook
  scripts/                               # Helper scripts + bootstrap.sh
  skills/                                # All orchestrator + sub-skills
CHANGELOG.md
LICENSE
```

---

## License

[MIT](LICENSE) © Krill


