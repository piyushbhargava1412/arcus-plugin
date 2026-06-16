# Changelog

All notable changes to the **agent-forge** plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/piyushbhargava1412/agent-forge-plugin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/piyushbhargava1412/agent-forge-plugin/releases/tag/v0.1.0
