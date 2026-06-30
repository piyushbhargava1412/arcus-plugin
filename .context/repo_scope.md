# Repository Scope: arcus-plugin

<!-- context-meta
verification-commit: e47a3dc1ba49777670e659843a23d6a7e968f9d1
generated-at: 2026-06-28T05:21:50Z
confidence: high
-->

## Purpose
ARCUS is a plugin marketplace repository that packages and documents an agentic Spec -> Code -> Pull Request SDLC workflow for Copilot CLI, Claude Code, VS Code, and OpenCode.
It provides orchestrator skills, supporting skills, and deterministic helper scripts rather than an application runtime service.

## Core Responsibilities
- Package the `arcus-plugin` marketplace artifact and plugin manifest.
- Define orchestration behavior in skill specifications (`SKILL.md`), organized as a three-tier capability library (Capabilities / Coordinators / Orchestrators via `layer:` frontmatter). The **single** `arcus-controller` orchestrator drives both experiences over one identical ordered set of stage keys: **interactive** (gated, user-driven) and **autonomous** (AFK); the `kick-off` coordinator runs the brainstorm phase and the `implementation-runner` skill is the shared Implementation loop.
- Provide deterministic shell helpers for workspace scaffolding (`scaffold.sh`, **deferred branch** — no git branch at scaffold), branch realization (`branch.sh` + shared `lib/branch_name.sh`), checkpoint state (`checkpoint.sh`, incl. `set-branch`), commits, PR creation, and story ID extraction.
- Split planning artifacts by owner: `spec-finalizer` writes a self-contained `grounded-spec.md` (grounded story decisions); `implementation-planner` writes a self-contained `plan.md` (design deliberation plus the atomic task list, folding in the former `blueprint.md`).
- Publish and maintain end-user documentation through a VitePress site under `site/`.

## Major Implementation Areas
| Area | Scope | Evidence |
|---|---|---|
| Marketplace + plugin metadata | Marketplace catalog and plugin manifest metadata/versioning | `.claude-plugin/marketplace.json`, `plugins/arcus/.claude-plugin/plugin.json` |
| Skill catalog | Three-tier library: Orchestrators (unified `arcus-controller`, shared `implementation-runner` loop), Coordinators (`kick-off`, `code-reviewer`, `repo-agentifier`), and Capabilities across two surfaces — 16 flat agent files + 13 skill dirs (incl. `subagent-task-dispatcher` and `code-simplifier` in agents/) | `plugins/arcus/agents/*.md`, `plugins/arcus/skills/*/SKILL.md` |
| Hook + script runtime | Session bootstrap hook and deterministic bash utilities (incl. `scaffold.sh`, `branch.sh`, and the shared `lib/branch_name.sh`) | `plugins/arcus/hooks/hooks.json`, `plugins/arcus/scripts/*.sh`, `plugins/arcus/scripts/lib/branch_name.sh` |
| Test coverage | Shell-based checkpoint test harness; Node-ESM zero-dependency Layer-1 static suite (skill manifests, frontmatter, line budgets, cross-references, hooks integrity, artifact schemas) | `plugins/arcus/scripts/tests/checkpoint.test.sh`, `tests/` |
| Documentation site | VitePress docs content and config | `site/.vitepress/config.ts`, `site/guide/*.md`, `site/concepts/*.md` |

## Key Entry Surfaces
| Surface | Type | Path |
|---|---|---|
| `arcus-controller` | Orchestrator skill entry (unified pipeline driver — interactive `implement`/`plan <STORY>`, autonomous `forge`/`afk <STORY>`) | `plugins/arcus/skills/arcus-controller/SKILL.md` |
| `kick-off` | Coordinator skill entry (brainstorm only — context-pack → spec-finalizer; `brainstorm`/`kick off`/`architect <STORY>`) | `plugins/arcus/skills/kick-off/SKILL.md` |
| `implementation-runner` | Orchestrator skill entry (shared Implementation loop: deferred branch + task loop) | `plugins/arcus/skills/implementation-runner/SKILL.md` |
| `repo-agentifier` | Coordinator skill entry (context + agentification) | `plugins/arcus/skills/repo-agentifier/SKILL.md` |
| `SessionStart` hook | Plugin lifecycle entry | `plugins/arcus/hooks/hooks.json` -> `plugins/arcus/scripts/bootstrap.sh` |
| Docs build/deploy workflow | CI entry for documentation artifact | `.github/workflows/docs.yml` |
| Docs local dev/build commands | Developer execution entry | `site/package.json` |

## Tech Stack Signals
| Category | Signals | Evidence |
|---|---|---|
| Languages | Markdown, Bash, TypeScript, JSON, Python, JavaScript (Node ESM) | `README.md`, `plugins/arcus/scripts/*.sh`, `site/.vitepress/config.ts`, `plugins/arcus/.claude-plugin/plugin.json`, `plugins/arcus/agent-resources/context-pack-builder/scripts/match_flows.py`, `tests/**/*.mjs` |
| Frameworks / tooling | VitePress, vitepress-plugin-mermaid, GitHub Actions | `site/package.json`, `site/.vitepress/config.ts`, `.github/workflows/docs.yml`, `.github/workflows/tests.yml` |
| Dependency manager(s) | pnpm (`pnpm@10.32.1`) | `site/package.json`, `site/pnpm-lock.yaml`, `package.json` (repo root + docs site) |

## Boundaries / Exclusions
- `.arcus/` workspace artifacts are excluded by root ignore rules and treated as generated runtime workspace (`.gitignore`, `README.md`).
- Local/editor and cache/build artifacts are excluded (`.idea/`, `.vscode/`, `.superpowers`, `site/node_modules`, `site/.vitepress/dist`, `site/.vitepress/cache`).
- No deployed service runtime, database schema, API server implementation, or infrastructure-as-code manifests were detected in non-ignored files.

## Source/Test/Config/Scripts Roots
| Category | Roots / Files |
|---|---|
| Source / specs | `plugins/arcus/agents/`, `plugins/arcus/skills/`, `plugins/arcus/hooks/`, `plugins/arcus/.claude-plugin/`, `.claude-plugin/` |
| Scripts | `plugins/arcus/scripts/` |
| Tests | `plugins/arcus/scripts/tests/`, `tests/` |
| Docs | `site/`, `README.md`, `CHANGELOG.md` |
| CI/CD | `.github/workflows/` |
| Config | `.gitignore`, `site/.gitignore`, `site/.vitepress/config.ts`, `package.json` (repo root) |

## CI/CD & Automation
| Workflow | Trigger | Key Test Gates | Deploy Target |
|---|---|---|---|
| `docs` (`.github/workflows/docs.yml`) | push to `main` on `site/**` or workflow file; PR on same paths; manual dispatch | build gate: `pnpm install --frozen-lockfile && pnpm run docs:build` (no explicit unit/integration/functional/acceptance/performance test jobs detected) | GitHub Pages via `actions/deploy-pages` |
| `tests` (`.github/workflows/tests.yml`) | push, pull_request, manual dispatch | test gate: `pnpm test` (Layer-1 static suite: unit + integration checks) | none (CI validation only) |

## Evidence Gaps / Not Found
- No event producers or consumers detected in scanned non-ignored files.
- No OpenAPI/AsyncAPI/GraphQL/Proto/Avro contract files detected (JSON schemas present in `tests/schemas/` and `plugins/arcus/schemas/` for internal artifact validation).
- No Dockerfile, compose files, Terraform/Helm/Kustomize/serverless manifests detected.
