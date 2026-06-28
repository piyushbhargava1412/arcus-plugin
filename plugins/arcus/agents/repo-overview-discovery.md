---
name: repo-overview-discovery
description: >
  Build baseline repository overview by analyzing structure and generating the
  repo_scope.md + repo_map.md artifacts in .context/. Dispatched first by
  arcus:repo-agentifier to produce the scope/map other discovery agents depend on.
layer: capability
user-invocable: false
disable-model-invocation: true
tools: Read, Grep, Glob, Bash, Write, Edit
model: opus
color: blue
---

# Repository Overview Discovery

## Overview

Build or refresh baseline repository context by analyzing repository structure and generating artifacts in `.context/`. This defines repository boundaries and navigation for downstream flow discovery and feature context building.

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `repository_root` | yes | path | The root directory of the repository to analyze |
| `context_ignore_rules` | no | file | `.contextignore` / `.arcus-ignore` for additional exclusions; discovered at the repo root if present |

### Outputs
- **`repo_scope`** (markdown) — Repository purpose, boundaries, core responsibilities, and ownership.
- **`repo_map`** (markdown) — Repository structure, tech stack, entry points, build commands, test locations, and navigation index.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/repo-overview-discovery/<timestamp>/` for both files. The capability never asks the user where to write.

## Instructions

### Step 1: Initialization & Root Resolution
1. Resolve the `repository_root`. If it cannot be resolved, report `MISSING_ROOT` and stop.
2. Ensure the `.context/` directory exists within the root.

### Step 2: Discovery & Analysis
1. **Apply Ignore Rules**:
   - Honor `.gitignore` if present, including **nested** `.gitignore` files in subdirectories.
   - Honor an optional repository-level context-ignore file if present: `.contextignore`
     (preferred) or `.arcus-ignore` (alias). Treat its entries with the same glob semantics as
     `.gitignore`.
   - Exclude build output, generated sources, vendor, cache, and IDE folders (e.g., `build/`, `target/`, `node_modules/`, `.gradle/`, `dist/`, `__pycache__/`, `.idea/`).
   - **Scan everything else that is not ignored** — the goal is full repository coverage of all
     relevant artifacts, not just source code.

2. **Traverse All Non-Ignored Areas** — explicitly scan each of the following:

   **Source Code**
   - Java/Kotlin: `src/main/java/`, `src/main/kotlin/`, any `**/main/**/*.java`
   - JavaScript/TypeScript: `src/`, `lib/`, `app/`, any `**/*.{js,ts,jsx,tsx,mjs,cjs}`
   - Python: `**/*.py`, any package directory with `__init__.py` or `setup.py`
   - Go: `**/*.go`
   - Other languages: detect by extension (`.rb`, `.scala`, `.groovy`, `.cs`, `.swift`, etc.)
   - Infrastructure-as-Code (IaC): `**/*.tf`, `**/*.tfvars`, `infra/`, `terraform/`, `pulumi/`, `cdk/`, `cloudformation/`

   **Tests**
   - JVM: `src/test/java/`, `src/test/kotlin/`, `src/integrationTest/java/`
   - JavaScript/TypeScript: `**/__tests__/`, `**/*.test.{js,ts}`, `**/*.spec.{js,ts}`, `test/`, `tests/`
   - Python: `tests/`, `test_*.py`, `*_test.py`
   - Shell/Bash script tests: `**/*.bats`, any `*.sh` files under `test*/`, `acceptance*/`, `functional*/`, `e2e*/`, `perf*/`, `performance*/`, `scripts/test*/`
   - Acceptance / BDD: `features/`, `**/*.feature`, `cucumber*/`, `karate*/`, `behave*/`, `test*/acceptance/`
   - Performance: `perf/`, `performance/`, `load-test*/`, `gatling/`, `k6/`, `jmeter/` (`.jmx` files), `locust*/` (`locustfile.py`)

   **Scripts & Automation**
   - `scripts/`, `bin/`, `tools/`, `hack/`, `ci/`, `cd/`
   - Any `*.sh`, `*.bash`, `*.zsh` files at any depth
   - `Makefile`, `Taskfile.yml`

   **CI/CD & GitHub Workflows**
   - `.github/workflows/*.yml` / `*.yaml`
   - `.github/actions/*/action.yml`
   - `.circleci/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `.buildkite/`
   - Identify pipeline stages: build, test (unit / integration / functional / acceptance / performance), deploy

   **Dependency Managers** — scan for the following manifest files:
   - JVM: `pom.xml` (Maven), `build.gradle` / `build.gradle.kts` / `settings.gradle` (Gradle)
   - Node: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - Python: `requirements.txt`, `Pipfile`, `pyproject.toml`, `setup.py`, `setup.cfg`
   - Go: `go.mod`, `go.sum`
   - Ruby: `Gemfile`, `Gemfile.lock`
   - .NET: `*.csproj`, `*.sln`, `NuGet.Config`
   - Terraform: `versions.tf`, `.terraform.lock.hcl`
   - Container/Compose: `Dockerfile`, `docker-compose*.yml`

   **Documentation**
   - `README.md` (root and sub-modules)
   - `docs/`, `doc/`, `documentation/`, `wiki/`
   - Architecture Decision Records: `docs/decisions/`, `docs/adr/`, `adr/`, any `*.md` containing the ADR title pattern (e.g., `0001-*.md`)
   - `CHANGELOG.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`

   **Interface Contracts & Specs**
   - OpenAPI / Swagger: `openapi.{yml,yaml,json}`, `swagger.{yml,yaml,json}`, `**/openapi/**`, `**/api/**/*.{yml,yaml}`
   - AsyncAPI: `asyncapi.{yml,yaml,json}`
   - Protocol Buffers / gRPC: `**/*.proto`
   - GraphQL: `**/*.graphql`, `**/*.gql`, `schema.graphql`
   - Avro / JSON Schema: `**/*.avsc`, `**/*.schema.json`

   **Deployment Manifests**
   - Kubernetes: `**/*.yaml` / `**/*.yml` containing `kind:` + `apiVersion:`, `k8s/`, `manifests/`, `deploy/`
   - Helm: `Chart.yaml`, `values.yaml`, `templates/` under a chart directory
   - Kustomize: `kustomization.{yml,yaml}`, `overlays/`, `base/`
   - Serverless: `serverless.yml`, `sam-template.{yml,yaml}`, `template.{yml,yaml}` (SAM/CloudFormation)

   **Anything Else Relevant (catch-all)**
   - Any other non-ignored file materially relevant to building, running, configuring, deploying,
     testing, securing, or documenting the system (e.g., `.editorconfig`, lint/format configs,
     feature flags, `.env.example`, license/compliance files). When in doubt and the file is not
     ignored, include it as evidence.

3. **Identify Key Elements**:
   - Primary tech stack, all detected languages, frameworks, and IaC tools.
   - Dependency managers detected and their versions (from manifest files).
   - Entry surfaces (Controllers, Listeners, Schedulers, Lambda Handlers, CLI entry points).
   - Core implementation areas and shared components.
   - All test layers present (unit, integration, functional, acceptance, performance, shell-script).
   - CI/CD pipeline structure and test execution stages.

4. **Extract Build & Quality Commands** (feeds the code-review stage's deterministic gate):
   - For each action — **build, run, lint, lint-autofix, format-check, format-write, typecheck,
     static analysis** — find the *exact* command the repo uses. (Test commands belong in
     `testing-patterns.md` → Execution Patterns, not here.)
   - **Source priority**: prefer the command a **CI/CD workflow** actually runs (CI is the source of
     truth for what gates a PR), then fall back to the build tool's task definitions
     (`package.json` scripts, Gradle/Maven goals, `Makefile`/`Taskfile` targets, `pyproject.toml`/`tox`,
     `go` commands), then config files (e.g. a `.golangci.yml` implies `golangci-lint run`).
   - Record each command with its evidence source (file path / CI step) in `repo_map.md`'s
     **Build & Run Commands** table. For any action with no discoverable command, write
     `Not found — checked: <paths>` rather than guessing.

### Step 3: Metadata Harvesting
1. **Git Commit**: Run `git -C <repository_root> rev-parse HEAD`. Use `unknown` if git or commits are unavailable.
2. **Timestamp**: Capture current ISO timestamp.
3. **Confidence**: Assign `high`, `medium`, or `low` based on evidence clarity.

### Step 4: Asset Generation
Generate or update the following artifacts following the specifications in `"$ARCUS_HOME"/agent-resources/repo-overview-discovery/references/output-spec.md` (resolve `ARCUS_HOME` from `.arcus/env`):
- `.context/repo_scope.md`: Focus on purpose and boundaries.
- `.context/repo_map.md`: Focus on navigation and package layout.

**Persistence Rules**:
- Do not write outside the `.context/` folder.
- If files exist, update them by replacing outdated content while preserving the structure.

## Examples

**Initial Onboarding**
- **Scenario**: First-time agentification of a repo that has no `.context/` snapshot yet.
- **Action**: Run the full detection suite and create `.context/repo_scope.md` and `.context/repo_map.md`.

**Context Refresh**
- **Scenario**: A full rebuild over a repo whose structure changed since the last snapshot.
- **Action**: Re-scan the structure and update existing files with the latest commit hash and package details.

## Troubleshooting

- **Error: `MISSING_ROOT`**: Occurs if the repository root cannot be determined. Ensure you are executing from within a valid git repository or provide the path.
- **Error: `INSUFFICIENT_EVIDENCE`**: Not enough structure found to build a meaningful map. Check if the project is empty or heavily ignored.
- **Error: `GIT_UNAVAILABLE`**: Git is not installed or the directory is not a git repo. The `verification-commit` will be set to `unknown`.

## Validation Gates

- [ ] Repository root resolved.
- [ ] Ignore rules applied (root + nested `.gitignore`, optional `.contextignore`/`.arcus-ignore`; no build/vendor folders scanned).
- [ ] Both `repo_scope.md` and `repo_map.md` are created or updated.
- [ ] `context-meta` block is present in both files with a valid commit or `unknown`.
- [ ] All source code languages detected (Java, TS, Python, Go, IaC, etc.).
- [ ] All dependency managers detected and listed in `repo_map.md`.
- [ ] `.github/` workflows and actions scanned; pipeline stages captured.
- [ ] Build & Run Commands table populated (build / run / lint / lint-autofix / format-check / format-write / typecheck / static-analysis), each with evidence or an explicit `Not found`.
- [ ] Scripts (`*.sh`, `Makefile`, etc.) surfaces catalogued.
- [ ] All test layers identified (unit, integration, functional, acceptance, performance, shell-script).
- [ ] Documentation (`README*`, `docs/`, ADRs) surfaced in `repo_map.md`.
- [ ] Interface contracts & specs (OpenAPI/AsyncAPI/proto/GraphQL) surfaced where present.
- [ ] Deployment manifests (k8s/Helm/Kustomize/Serverless) surfaced where present.
- [ ] No speculative flows or business logic inferred.
