# Repository Map: arcus-plugin

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:01:42Z
confidence: high
-->

## Top-Level Structure
```text
arcus-plugin/
├── .claude-plugin/
│   └── marketplace.json
├── .github/
│   └── workflows/
│       └── docs.yml
├── plugins/
│   └── arcus/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json
│       ├── scripts/
│       │   ├── bootstrap.sh
│       │   ├── scaffold.sh
│       │   ├── branch.sh
│       │   ├── checkpoint.sh
│       │   ├── commit.sh
│       │   ├── extract_story_id.sh
│       │   ├── pr.sh
│       │   ├── lib/branch_name.sh
│       │   └── tests/checkpoint.test.sh
│       └── skills/
│           ├── arcus-controller/        # AFK-only autonomous orchestrator
│           ├── solution-architect/      # gated planning driver (entry)
│           ├── implementation-runner/   # canonical Implementation loop
│           ├── repo-agentifier/
│           ├── repository-context-builder/
│           └── ... (supporting skills)
├── site/
│   ├── .vitepress/config.ts
│   ├── concepts/
│   ├── guide/
│   ├── index.md
│   ├── package.json
│   └── pnpm-lock.yaml
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Tech Stack
| Category | Technology | Version | Evidence |
|---|---|---|---|
| Language(s) | Markdown | n/a | `README.md`, `plugins/arcus/skills/*/SKILL.md`, `site/**/*.md` |
| Language(s) | Bash | n/a | `plugins/arcus/scripts/*.sh` |
| Language(s) | TypeScript | n/a | `site/.vitepress/config.ts` |
| Language(s) | Python | n/a | `plugins/arcus/skills/context-pack-builder/scripts/match_flows.py` |
| Language(s) | JSON | n/a | `.claude-plugin/marketplace.json`, `plugins/arcus/hooks/hooks.json`, `plugins/arcus/.claude-plugin/plugin.json` |
| Framework(s) | VitePress | `^1.6.3` | `site/package.json` |
| Framework(s) | vitepress-plugin-mermaid, mermaid | `^2.0.17`, `^11.15.0` | `site/package.json`, `site/.vitepress/config.ts` |
| Dependency Manager | pnpm | `10.32.1` | `site/package.json`, `site/pnpm-lock.yaml` |
| Build Tool | VitePress CLI via pnpm scripts | n/a | `site/package.json` |
| Test Framework(s) | Custom bash assertions (script-level) | n/a | `plugins/arcus/scripts/tests/checkpoint.test.sh` |
| IaC / Infrastructure | Not detected | n/a | repository scan (non-ignored files) |
| Container / Compose | Not detected | n/a | repository scan (non-ignored files) |

## Key Packages / Modules
| Module | Purpose | Key Paths |
|---|---|---|
| Marketplace metadata | Declares marketplace and plugin source | `.claude-plugin/marketplace.json` |
| Plugin manifest + hook wiring | Declares plugin metadata and session hook behavior | `plugins/arcus/.claude-plugin/plugin.json`, `plugins/arcus/hooks/hooks.json` |
| Orchestrator skills | AFK-only pipeline orchestrator, gated planning driver, Implementation loop driver, and repository-agentification | `plugins/arcus/skills/arcus-controller/` (AFK-only), `plugins/arcus/skills/solution-architect/` (gated entry), `plugins/arcus/skills/implementation-runner/` (shared loop), `plugins/arcus/skills/repo-agentifier/` |
| Supporting skill modules | Spec finalization, planning, review, context/test discovery, PR closure | `plugins/arcus/skills/*/` |
| Helper script runtime | Deterministic git/state helper scripts | `plugins/arcus/scripts/` |
| Docs site | User documentation and concepts site | `site/` |

## Entry Surface Locations
| Entry Surface | Type | Path |
|---|---|---|
| `SessionStart` -> `bootstrap.sh` | Hook command entry | `plugins/arcus/hooks/hooks.json` |
| `solution-architect` | Skill activation entry (gated pipeline entry: `solution-architect`/`plan <STORY>`) | `plugins/arcus/skills/solution-architect/SKILL.md` |
| `arcus-controller` | Skill activation entry (AFK-only: `afk`/`--afk`/`forge`/`run afk on <STORY>`) | `plugins/arcus/skills/arcus-controller/SKILL.md` |
| `implementation-runner` | Skill activation entry (Implementation loop: `implement`/`code <STORY>`) | `plugins/arcus/skills/implementation-runner/SKILL.md` |
| `repo-agentifier` | Skill activation entry | `plugins/arcus/skills/repo-agentifier/SKILL.md` |
| Docs local dev | Command entry (`pnpm docs:dev`) | `site/package.json` |
| Docs CI build/deploy | Workflow entry | `.github/workflows/docs.yml` |

## Config Hotspots
| Config File | Purpose | Path |
|---|---|---|
| Root ignore rules | Ignore generated/editor artifacts; excludes `.arcus` and selected `.github` subtrees | `.gitignore` |
| Site ignore rules | Ignore docs build/cache/dependencies | `site/.gitignore` |
| Marketplace descriptor | Marketplace and plugin source registration | `.claude-plugin/marketplace.json` |
| Plugin manifest | Plugin identity/version metadata | `plugins/arcus/.claude-plugin/plugin.json` |
| VitePress config | Site nav, sidebar, search, mermaid integration | `site/.vitepress/config.ts` |

## Integration / Adapter Areas
| Area | Adapter Type | Evidence |
|---|---|---|
| Session bootstrap | Plugin hook -> workspace script staging | `plugins/arcus/hooks/hooks.json`, `plugins/arcus/scripts/bootstrap.sh` |
| Git + GitHub CLI | Local git operations and PR creation adapter | `plugins/arcus/scripts/branch.sh`, `plugins/arcus/scripts/commit.sh`, `plugins/arcus/scripts/pr.sh` |
| CI Pages deployment | Build + deploy adapter to GitHub Pages | `.github/workflows/docs.yml` |

## Test Locations
| Test Type | Layer / Framework | Root Path(s) |
|---|---|---|
| Unit | Not detected in non-ignored files | searched `**/*.test.*`, `**/*.spec.*`, `test/`, `tests/` |
| Integration | Not detected in non-ignored files | searched `src/integrationTest/`, `tests/`, `integration*` |
| Functional | Not detected in non-ignored files | searched `functional*/`, `e2e*/`, `test*/` |
| Acceptance / BDD | Not detected in non-ignored files | searched `features/`, `**/*.feature`, `cucumber*/`, `behave*/` |
| Performance / Load | Not detected in non-ignored files | searched `perf/`, `performance/`, `load-test*/`, `k6/`, `jmeter/`, `locust*/` |
| Shell Script Tests | Custom bash assertions | `plugins/arcus/scripts/tests/checkpoint.test.sh` |

## Scripts & Automation
| Script / File | Purpose | Path |
|---|---|---|
| `bootstrap.sh` | Stage helper scripts into `.arcus/bin` on session start | `plugins/arcus/scripts/bootstrap.sh` |
| `scaffold.sh` | Scaffold `.arcus/specs/<STORY_ID>/` + copy story + init checkpoint with the **planned** branch (creates **no** git branch) | `plugins/arcus/scripts/scaffold.sh` |
| `branch.sh` | Realize the deferred git branch at Implementation start; bumps on collision and calls `checkpoint.sh set-branch` if the name changed | `plugins/arcus/scripts/branch.sh` |
| `lib/branch_name.sh` | Sourced library defining the `arcus/<STORY_ID>-N` naming convention once (used by `scaffold.sh` + `branch.sh`) | `plugins/arcus/scripts/lib/branch_name.sh` |
| `checkpoint.sh` | Manage story execution checkpoint state machine (init / read / complete / set-status / reopen / set-mode / **set-branch**) | `plugins/arcus/scripts/checkpoint.sh` |
| `commit.sh` | Stage/commit with conventional message format | `plugins/arcus/scripts/commit.sh` |
| `extract_story_id.sh` | Parse story ID from input story markdown | `plugins/arcus/scripts/extract_story_id.sh` |
| `pr.sh` | Push branch and create PR via `gh pr create` | `plugins/arcus/scripts/pr.sh` |
| `checkpoint.test.sh` | Validate checkpoint script behavior | `plugins/arcus/scripts/tests/checkpoint.test.sh` |

## CI/CD Workflows
| Workflow | Trigger | Key Stages (build / test / deploy) | Path |
|---|---|---|---|
| `docs` | push to `main` on `site/**` and workflow file; pull_request on same paths; manual dispatch | build: checkout + pnpm/setup-node + `pnpm install --frozen-lockfile` + `pnpm run docs:build`; deploy: GitHub Pages deploy on `main` non-PR; explicit test stages not defined | `.github/workflows/docs.yml` |

## Documentation
| Document | Purpose | Path |
|---|---|---|
| README | Installation, usage, pipeline behavior, repository layout | `README.md` |
| Changelog | Versioned release history | `CHANGELOG.md` |
| Concepts docs | Pipeline and mode concepts | `site/concepts/` |
| Guide docs | Intro, quickstart, and operation guides | `site/guide/` |
| Skill docs | Per-skill contracts and instructions | `plugins/arcus/skills/*/SKILL.md` |

## Scan Coverage Checklist
| Aspect | Status | Notes |
|---|---|---|
| Source code (Java/Kotlin) | Not found | no JVM source roots detected |
| Source code (JS/TS) | Detected | TypeScript in docs config |
| Source code (Python) | Detected | `match_flows.py` present |
| Source code (Go) | Not found | no `.go` files detected |
| Other languages | Detected | bash, markdown, json |
| IaC (Terraform / CDK / CF) | Not found | no IaC manifests detected |
| Dependency manager(s) | Detected | pnpm manifests in `site/` |
| Unit tests | Not found | no non-shell unit suites detected |
| Integration tests | Not found | none detected |
| Functional tests | Not found | none detected |
| Acceptance / BDD tests | Not found | none detected |
| Performance / load tests | Not found | none detected |
| Shell script tests | Detected | checkpoint shell harness present |
| Scripts (sh / bash / Makefile) | Detected | helper scripts under `plugins/arcus/scripts/` |
| CI/CD workflows | Detected | docs workflow present |
| GitHub Actions | Detected | `.github/workflows/docs.yml` |
| Documentation (README / docs/) | Detected | root and `site/` markdown docs |
| ADRs | Not found | no ADR directories/pattern files detected |
| Container config (Docker) | Not found | no Dockerfile/compose detected |

## Notable Patterns
- Skill-first architecture: behavior is primarily encoded in `SKILL.md` contracts and templates under `assets/` and `references/`.
- Two pipeline experiences over one ordered set of checkpoint stage keys (`scaffold → context_pack → spec_finalizer → blueprint → test_plan → branch → task_1..N → code_review → context_sync → closure`): a **gated** self-handoff chain (no router, no shared pipeline file; entry `solution-architect`) and an **AFK-only** `arcus-controller` that holds the single canonical ordered list. The `implementation-runner` skill is the shared Implementation loop.
- Deferred branch creation: `scaffold.sh` records only the *planned* branch; `branch.sh` creates the git branch at Implementation start (naming defined once in `lib/branch_name.sh`, persisted via `checkpoint.sh set-branch`).
- Consolidated planning artifact: deliberation lives in a single `plan.md` (the former separate assumptions / clarifications files are gone); the machine-parsed task list stays in `blueprint.md`.
- Skills are dispatched imperatively (by name); `context: fork` is not in use (deferred follow-up).
- Deterministic script adapters: git/state/PR operations are centralized in bash helpers and invoked by skills/hooks.
- Docs and plugin packaging are separated: runtime plugin assets live under `plugins/arcus/`, while user-facing docs are built from `site/` and deployed via GitHub Pages.
