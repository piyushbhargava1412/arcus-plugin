# Repository Scope: arcus-plugin

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:01:42Z
confidence: high
-->

## Purpose
ARCUS is a plugin marketplace repository that packages and documents an agentic Spec -> Code -> Pull Request SDLC workflow for Copilot CLI, Claude Code, and VS Code.
It provides orchestrator skills, supporting skills, and deterministic helper scripts rather than an application runtime service.

## Core Responsibilities
- Package the `arcus-plugin` marketplace artifact and plugin manifest.
- Define orchestration behavior in skill specifications (`SKILL.md`) for the SDLC pipeline and repository agentification. The pipeline runs as two experiences over one ordered set of stage keys: a **gated** self-handoff chain (entry `solution-architect`; no router, no shared pipeline file) and an **AFK-only** `arcus-controller`; the `implementation-runner` skill is the shared Implementation loop.
- Provide deterministic shell helpers for workspace scaffolding (`scaffold.sh`, **deferred branch** — no git branch at scaffold), branch realization (`branch.sh` + shared `lib/branch_name.sh`), checkpoint state (`checkpoint.sh`, incl. `set-branch`), commits, PR creation, and story ID extraction.
- Consolidate planning deliberation into a single `plan.md` artifact (replacing the former separate assumptions and clarifications files); keep the machine-parsed task list in `blueprint.md`.
- Publish and maintain end-user documentation through a VitePress site under `site/`.

## Major Implementation Areas
| Area | Scope | Evidence |
|---|---|---|
| Marketplace + plugin metadata | Marketplace catalog and plugin manifest metadata/versioning | `.claude-plugin/marketplace.json`, `plugins/arcus/.claude-plugin/plugin.json` |
| Skill catalog | Orchestrators (gated `solution-architect` entry + self-handoff chain, AFK-only `arcus-controller`, shared `implementation-runner` loop) and specialist skills in markdown specs | `plugins/arcus/skills/*/SKILL.md` |
| Hook + script runtime | Session bootstrap hook and deterministic bash utilities (incl. `scaffold.sh`, `branch.sh`, and the shared `lib/branch_name.sh`) | `plugins/arcus/hooks/hooks.json`, `plugins/arcus/scripts/*.sh`, `plugins/arcus/scripts/lib/branch_name.sh` |
| Script test coverage | Shell-based checkpoint test harness | `plugins/arcus/scripts/tests/checkpoint.test.sh` |
| Documentation site | VitePress docs content and config | `site/.vitepress/config.ts`, `site/guide/*.md`, `site/concepts/*.md` |

## Key Entry Surfaces
| Surface | Type | Path |
|---|---|---|
| `solution-architect` | Orchestrator skill entry (gated pipeline entry; drives Scaffold + Brainstorm) | `plugins/arcus/skills/solution-architect/SKILL.md` |
| `arcus-controller` | Orchestrator skill entry (AFK-only autonomous pipeline driver) | `plugins/arcus/skills/arcus-controller/SKILL.md` |
| `implementation-runner` | Orchestrator skill entry (shared Implementation loop: deferred branch + task loop) | `plugins/arcus/skills/implementation-runner/SKILL.md` |
| `repo-agentifier` | Orchestrator skill entry (context + agentification) | `plugins/arcus/skills/repo-agentifier/SKILL.md` |
| `SessionStart` hook | Plugin lifecycle entry | `plugins/arcus/hooks/hooks.json` -> `plugins/arcus/scripts/bootstrap.sh` |
| Docs build/deploy workflow | CI entry for documentation artifact | `.github/workflows/docs.yml` |
| Docs local dev/build commands | Developer execution entry | `site/package.json` |

## Tech Stack Signals
| Category | Signals | Evidence |
|---|---|---|
| Languages | Markdown, Bash, TypeScript, JSON, Python | `README.md`, `plugins/arcus/scripts/*.sh`, `site/.vitepress/config.ts`, `plugins/arcus/.claude-plugin/plugin.json`, `plugins/arcus/skills/context-pack-builder/scripts/match_flows.py` |
| Frameworks / tooling | VitePress, vitepress-plugin-mermaid, GitHub Actions | `site/package.json`, `site/.vitepress/config.ts`, `.github/workflows/docs.yml` |
| Dependency manager(s) | pnpm (`pnpm@10.32.1`) | `site/package.json`, `site/pnpm-lock.yaml` |

## Boundaries / Exclusions
- `.arcus/` workspace artifacts are excluded by root ignore rules and treated as generated runtime workspace (`.gitignore`, `README.md`).
- Local/editor and cache/build artifacts are excluded (`.idea/`, `.vscode/`, `.superpowers`, `site/node_modules`, `site/.vitepress/dist`, `site/.vitepress/cache`).
- No deployed service runtime, database schema, API server implementation, or infrastructure-as-code manifests were detected in non-ignored files.

## Source/Test/Config/Scripts Roots
| Category | Roots / Files |
|---|---|
| Source / specs | `plugins/arcus/skills/`, `plugins/arcus/hooks/`, `plugins/arcus/.claude-plugin/`, `.claude-plugin/` |
| Scripts | `plugins/arcus/scripts/` |
| Tests | `plugins/arcus/scripts/tests/` |
| Docs | `site/`, `README.md`, `CHANGELOG.md` |
| CI/CD | `.github/workflows/` |
| Config | `.gitignore`, `site/.gitignore`, `site/.vitepress/config.ts` |

## CI/CD & Automation
| Workflow | Trigger | Key Test Gates | Deploy Target |
|---|---|---|---|
| `docs` (`.github/workflows/docs.yml`) | push to `main` on `site/**` or workflow file; PR on same paths; manual dispatch | build gate: `pnpm install --frozen-lockfile && pnpm run docs:build` (no explicit unit/integration/functional/acceptance/performance test jobs detected) | GitHub Pages via `actions/deploy-pages` |

## Evidence Gaps / Not Found
- No event producers or consumers detected in scanned non-ignored files.
- No OpenAPI/AsyncAPI/GraphQL/Proto/Avro/JSON-schema contract files detected.
- No Dockerfile, compose files, Terraform/Helm/Kustomize/serverless manifests detected.
- No non-shell automated test framework files detected; only shell-script tests were found.
