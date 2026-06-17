# Changelog

All notable changes to the **ARCUS** plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-06-17

### Changed

- **Rebranded the plugin from `agent-forge` to ARCUS (Any Repository Can Use Spec-driven
  development).** The marketplace is named `arcus` and the plugin is published as `arcus-plugin`; the orchestrator
  meta-skill `afk-skill-router` is renamed `arcus-controller`. The per-repo workspace moved from
  `.aforge/` to `.arcus/` (with `ARCUS_HOME` / `.arcus/env`), the ignore file from `.aforge-ignore`
  to `.arcus-ignore`, and the story branch prefix from `agent-forge/<id>` to `arcus/<id>`. Install
  with `/plugin install arcus-plugin@arcus`. The **AFK (Away From Keyboard)** autonomous mode, its
  triggers (`--afk`, `run afk on …`), and the `[AFK]` milestone markers are unchanged. Existing
  `.aforge/` workspaces and `agent-forge/*` branches do not auto-migrate; in-flight stories restart
  cleanly under the new paths.
- **`arcus-controller` (version `3.0.0`) is now a human-gated, state-driven orchestrator.** The
  pipeline (Init → Brainstorm → Test Plan → Implementation → Code Review → Closure) runs one stage
  at a time and pauses at a handoff gate between stages; reply `yes` to proceed or `no` to pause and
  resume later (across sessions). Each stage is independently invocable
  (`brainstorm`/`generate tests`/`implement`/`review`/`fix`/`close <STORY>`). The original
  fully-autonomous behaviour is preserved as an opt-in **`--afk` mode** that auto-confirms all gates.
- **Stage 1 Brainstorm** now runs the `spec-finalizer` dialogue in the main thread: it asks the user
  the highest-impact open questions one at a time (gated mode) instead of only escalating blockers.
  `spec-finalizer` (version `2.2.0`) gained explicit **dialogue** vs **one-shot** modes.
- `session-checkpoint.json` upgraded to **schema v2**: each stage carries a status enum
  (`pending`/`in_progress`/`awaiting_handoff`/`complete`/`needs_rework`) plus `mode` and
  `review_round`. `checkpoint.sh` adds `set-status`, `reopen`, and `set-mode` actions and migrates
  legacy boolean checkpoints automatically.
- Per-task `spec-compliance-reviewer` and `code-quality-reviewer` gained a **holistic mode** and a
  unified `critical`/`warning`/`suggestion` severity taxonomy.

### Added

- **New Code Review stage** between Implementation and Closure. A `code-reviewer` coordinator reviews
  the full branch diff, fanning out to new `security-reviewer` and `performance-reviewer` specialists
  and reusing the spec-compliance and code-quality reviewers holistically. It deduplicates, filters
  noise, judges severity, and writes `review.md` with an `approved` / `changes_requested` verdict.
  On `changes_requested`, findings loop back into Implementation as fix-tasks (bounded to 3 rounds).
- TDD enforcement in the implementer prompt now requires explicit RED → GREEN → REFACTOR evidence.
- `checkpoint.sh` test harness at `scripts/tests/checkpoint.test.sh`.

## [0.2.0] - 2026-06-16

### Changed

- Renamed the `context-builder-orchestrator` meta-skill to **`repo-agentifier`**
  (version `2.0.0`). It now makes a repository agent-ready in one shot.

### Added

- **Stage 3 (Agentify)** in `repo-agentifier`: after building the `.context/`
  snapshot it generates an `AGENTS.md` navigation index at the repository root and
  a `CLAUDE.md` that imports it (`@AGENTS.md`), with an overwrite guardrail.
- `repository-context-builder` (version `1.1.0`) now scans a broader set of
  artifacts — interface contracts & specs (OpenAPI/AsyncAPI/proto/GraphQL),
  deployment manifests (k8s/Helm/Kustomize/Serverless), plus a catch-all for any
  other relevant non-ignored file. Ignore handling now honors nested `.gitignore`
  files and an optional `.contextignore` / `.aforge-ignore`.
- **Dual-mode Architect stage** in `afk-skill-router` (version `2.1.0`): autonomous
  by default, but Stage 1 can now pause to ask the user. `spec-finalizer`
  (version `2.1.0`) emits a `NEEDS_INPUT` escalation block distinguishing
  `zero-option` blockers (always escalated) from `low-confidence` items (escalated
  only in interactive mode, opt-in via "interactive"/"ask me"). User answers persist
  to `clarifications.md` and are reused on resume.

## [0.1.0] - 2025-06-09

### Added

- Initial release of the **agent-forge** plugin, distributed through the
  `krill-afk` marketplace (`.claude-plugin/marketplace.json`).
- Plugin manifest at `plugins/agent-forge/.claude-plugin/plugin.json` (semver
  `version` is the release authority).
- Two orchestrator meta-skills:
  - `afk-skill-router` — the Away-From-Keyboard Spec → Code → Pull Request pipeline.
  - `repo-agentifier` — one-time repository context generation.
- Supporting sub-skills: `spec-finalizer`, `flow-and-scope-discovery`,
  `test-pattern-discovery`, `repository-context-builder`, `context-pack-builder`,
  `implementation-planner`, `test-spec-compiler`, `subagent-task-dispatcher`, `spec-compliance-reviewer`, 
  `code-quality-reviewer`, `pull-request-builder`, `branch-initializer`,
  `copilot-conversation-search`, and the `model-strategy` reference skill.
- `SessionStart` bootstrap hook (`hooks/hooks.json` → `scripts/bootstrap.sh`) that
  stages helper scripts into the target workspace at `.aforge/bin/` and exports
  `AFORGE_HOME` via `.aforge/env`.
- Cross-tool install support for GitHub Copilot CLI, Claude Code, and VS Code; plus
  IntelliJ/JetBrains usage via the Claude Code/CLI terminal path.

### Changed

- Refactored all skills to be plugin-cache safe: intra-skill resources use relative
  `./assets/...` and `./references/...` links, skill-to-skill references use the
  `agent-forge:<skill>` name form, and executed helper scripts resolve through
  `.aforge/bin/` (falling back to `AFORGE_HOME`).

[Unreleased]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.2.0...v0.4.0
[0.2.0]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/piyushbhargava1412/arcus-plugin/releases/tag/v0.1.0
