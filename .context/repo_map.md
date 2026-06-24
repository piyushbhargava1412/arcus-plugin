# Repository Map: arcus-plugin

<!-- context-meta
verification-commit: 6072385578e5017440dbed197e9bd0fa133f9b51
generated-at: 2026-06-24T20:12:00Z
confidence: high
-->

## Top-Level Structure
```text
arcus-plugin/
├── .claude-plugin/
│   └── marketplace.json
├── .github/
│   └── workflows/
│       ├── docs.yml
│       └── tests.yml
├── plugins/
│   └── arcus/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json
│       ├── schemas/                     # shipped substrate (output-convention.md)
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
│           ├── arcus-controller/        # unified orchestrator (interactive + autonomous)
│           ├── kick-off/                # brainstorm coordinator (context-pack → spec-finalizer)
│           ├── implementation-runner/   # canonical Implementation loop
│           ├── repo-agentifier/
│           ├── repository-context-builder/
│           ├── write-evals/             # Layer-2 eval-spec authoring capability
│           └── ... (supporting skills)
├── site/
│   ├── .vitepress/config.ts
│   ├── concepts/
│   ├── guide/
│   ├── index.md
│   ├── package.json
│   └── pnpm-lock.yaml
├── tests/
│   ├── check.mjs                        # Layer-1 master runner
│   ├── unit.mjs                         # Layer-1 unit tests
│   ├── integration.mjs                  # Layer-1 integration tests
│   ├── lib/                             # zero-dependency test utilities
│   ├── schemas/                         # artifact schema validators
│   ├── fixtures/                        # planted-bad test fixtures
│   └── e2e/                             # Layer 2-4 scaffolding (deferred)
├── package.json                         # repo-root test scripts (Node-ESM suite)
├── pnpm-lock.yaml
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
| Language(s) | JavaScript (Node ESM) | n/a | `tests/*.mjs`, `tests/lib/*.mjs`, `tests/e2e/**/*.mjs` |
| Framework(s) | VitePress | `^1.6.3` | `site/package.json` |
| Framework(s) | vitepress-plugin-mermaid, mermaid | `^2.0.17`, `^11.15.0` | `site/package.json`, `site/.vitepress/config.ts` |
| Dependency Manager | pnpm | `10.32.1` | `site/package.json`, `site/pnpm-lock.yaml`, `package.json` (repo root + docs site) |
| Build Tool | VitePress CLI via pnpm scripts | n/a | `site/package.json` |
| Test Framework(s) | Custom bash assertions (script-level) | n/a | `plugins/arcus/scripts/tests/checkpoint.test.sh` |
| Test Framework(s) | Node-ESM zero-dependency Layer-1 static suite | n/a | `tests/check.mjs`, `tests/unit.mjs`, `tests/integration.mjs`, `tests/lib/` |
| IaC / Infrastructure | Not detected | n/a | repository scan (non-ignored files) |
| Container / Compose | Not detected | n/a | repository scan (non-ignored files) |

## Key Packages / Modules
| Module | Purpose | Key Paths |
|---|---|---|
| Marketplace metadata | Declares marketplace and plugin source | `.claude-plugin/marketplace.json` |
| Plugin manifest + hook wiring | Declares plugin metadata and session hook behavior | `plugins/arcus/.claude-plugin/plugin.json`, `plugins/arcus/hooks/hooks.json` |
| Orchestrator skills | Unified pipeline orchestrator (interactive + autonomous), Implementation loop driver, per-task dispatcher | `plugins/arcus/skills/arcus-controller/` (interactive + autonomous), `plugins/arcus/skills/implementation-runner/` (shared loop), `plugins/arcus/skills/subagent-task-dispatcher/` |
| Coordinator skills | Stateless multi-capability sequencers (brainstorm, review fan-out, simplify gate, agentification) | `plugins/arcus/skills/kick-off/`, `plugins/arcus/skills/code-reviewer/`, `plugins/arcus/skills/code-simplifier/`, `plugins/arcus/skills/repo-agentifier/` |
| Capability + supporting skill modules | Atomic, stateless skills: spec finalization, planning, review, context/test discovery, PR closure, review-consolidator, simplify-and-verify, eval-spec authoring (27 total skills) | `plugins/arcus/skills/*/` |
| Helper script runtime | Deterministic git/state helper scripts | `plugins/arcus/scripts/` |
| Layer-1 test suite | Zero-dependency Node-ESM static checks (skill manifests, frontmatter, line budgets, cross-references, hooks integrity, artifact schemas) | `tests/` |
| Docs site | User documentation and concepts site | `site/` |

## Entry Surface Locations
| Entry Surface | Type | Path |
|---|---|---|
| `SessionStart` -> `bootstrap.sh` | Hook command entry | `plugins/arcus/hooks/hooks.json` |
| `arcus-controller` | Skill activation entry (unified pipeline: interactive `implement`/`plan <STORY>`; autonomous `forge`/`afk <STORY>`) | `plugins/arcus/skills/arcus-controller/SKILL.md` |
| `kick-off` | Skill activation entry (brainstorm coordinator: `brainstorm`/`kick off`/`architect <STORY>`) | `plugins/arcus/skills/kick-off/SKILL.md` |
| `implementation-runner` | Skill activation entry (Implementation loop: `implement`/`code <STORY>`) | `plugins/arcus/skills/implementation-runner/SKILL.md` |
| `context-drift-sync` | Skill activation entry (Context Sync stage; standalone: `sync context for <STORY>`/`sync context`) | `plugins/arcus/skills/context-drift-sync/SKILL.md` |
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
| Unit | Node-ESM zero-dependency Layer-1 static checks | `tests/unit.mjs`, `tests/lib/` |
| Integration | Node-ESM zero-dependency Layer-1 live-tree checks | `tests/integration.mjs` |
| Functional | Deferred (Layer 2-4 scaffolded) | `tests/e2e/` (contract evals, story tests, trigger harness) |
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
| `pnpm test` | Run Layer-1 static test suite (unit + integration) | `package.json` -> `tests/check.mjs` |
| `pnpm test:unit` | Run Layer-1 unit tests (planted-bad fixtures) | `package.json` -> `tests/unit.mjs` |
| `pnpm test:integration` | Run Layer-1 integration tests (live tree) | `package.json` -> `tests/integration.mjs` |

## CI/CD Workflows
| Workflow | Trigger | Key Stages (build / test / deploy) | Path |
|---|---|---|---|
| `docs` | push to `main` on `site/**` and workflow file; pull_request on same paths; manual dispatch | build: checkout + pnpm/setup-node + `pnpm install --frozen-lockfile` + `pnpm run docs:build`; deploy: GitHub Pages deploy on `main` non-PR; explicit test stages not defined | `.github/workflows/docs.yml` |
| `tests` | push, pull_request, manual dispatch | test: checkout + pnpm/setup-node + `pnpm test` (runs Layer-1 static suite: unit + integration); no deploy | `.github/workflows/tests.yml` |

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
| Source code (JS/TS) | Detected | TypeScript in docs config; Node ESM in tests/ |
| Source code (Python) | Detected | `match_flows.py` present |
| Source code (Go) | Not found | no `.go` files detected |
| Other languages | Detected | bash, markdown, json |
| IaC (Terraform / CDK / CF) | Not found | no IaC manifests detected |
| Dependency manager(s) | Detected | pnpm manifests in `site/` and repo root |
| Unit tests | Detected | Node-ESM Layer-1 static suite (`tests/unit.mjs`) |
| Integration tests | Detected | Node-ESM Layer-1 live-tree checks (`tests/integration.mjs`) |
| Functional tests | Scaffolded | Layer 2-4 deferred (`tests/e2e/`) |
| Acceptance / BDD tests | Not found | none detected |
| Performance / load tests | Not found | none detected |
| Shell script tests | Detected | checkpoint shell harness present |
| Scripts (sh / bash / Makefile) | Detected | helper scripts under `plugins/arcus/scripts/` |
| CI/CD workflows | Detected | docs + tests workflows present |
| GitHub Actions | Detected | `.github/workflows/docs.yml`, `.github/workflows/tests.yml` |
| Documentation (README / docs/) | Detected | root and `site/` markdown docs |
| ADRs | Not found | no ADR directories/pattern files detected |
| Container config (Docker) | Not found | no Dockerfile/compose detected |

## Notable Patterns
- Skill-first architecture: behavior is primarily encoded in `SKILL.md` contracts and templates under `assets/` and `references/`.
- Three-tier capability library (declared via `layer:` frontmatter): stateless **Capabilities**, thin **Coordinators**, and stateful **Orchestrators**. The **single** `arcus-controller` orchestrator drives both experiences — **interactive** (gated, user-driven) and **autonomous** (AFK) — over one identical ordered set of checkpoint stage keys (`scaffold → context_pack → spec_finalizer → plan → test_plan → branch → task_1..N → code_review → context_sync → closure`); only invocation style and gating differ. The `implementation-runner` skill is the shared Implementation loop.
- Deferred branch creation: `scaffold.sh` records only the *planned* branch; `branch.sh` creates the git branch at Implementation start (naming defined once in `lib/branch_name.sh`, persisted via `checkpoint.sh set-branch`).
- Planning artifacts split by owner: `spec-finalizer` writes a self-contained `grounded-spec.md`; `implementation-planner` writes a self-contained `plan.md` (design deliberation plus the atomic task list). Each skill owns exactly one file; the former separate `blueprint.md` is folded into `plan.md`.
- Skills are dispatched imperatively (by name); `context: fork` is not in use (deferred follow-up).
- Deterministic script adapters: git/state/PR operations are centralized in bash helpers and invoked by skills/hooks.
- Docs and plugin packaging are separated: runtime plugin assets live under `plugins/arcus/`, while user-facing docs are built from `site/` and deployed via GitHub Pages.
