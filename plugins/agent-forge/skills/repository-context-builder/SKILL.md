---
name: repository-context-builder
description: Build or refresh baseline repository context by analyzing structure and generating repo_scope and repo_map artifacts. Use when user says "build shared repository context", "update the context", or "refresh the context" or "sync the repo context".
metadata:
   version: "1.0.0"
   team: krill
   type:
      - agents
   inputs:
      - repository_root
   outputs:
      - repo_scope in .context/repo_scope.md
      - repo_map in .context/repo_map.md
---

# Repository Context Builder

## Overview

Build or refresh baseline repository context by analyzing repository structure and generating artifacts in `.context/`. This defines repository boundaries and navigation for downstream flow discovery and feature context building.

## Instructions

### Step 1: Initialization & Root Resolution
1. Resolve the `repository_root`. If it cannot be resolved, report `MISSING_ROOT` and stop.
2. Ensure the `.context/` directory exists within the root.

### Step 2: Discovery & Analysis
1. **Apply Ignore Rules**:
   - Honor `.gitignore` if present.
   - Exclude build output, generated sources, vendor, cache, and IDE folders (e.g., `build/`, `target/`, `node_modules/`, `.gradle/`, `dist/`, `__pycache__/`, `.idea/`).

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

3. **Identify Key Elements**:
   - Primary tech stack, all detected languages, frameworks, and IaC tools.
   - Dependency managers detected and their versions (from manifest files).
   - Entry surfaces (Controllers, Listeners, Schedulers, Lambda Handlers, CLI entry points).
   - Core implementation areas and shared components.
   - All test layers present (unit, integration, functional, acceptance, performance, shell-script).
   - CI/CD pipeline structure and test execution stages.

### Step 3: Metadata Harvesting
1. **Git Commit**: Run `git -C <repository_root> rev-parse HEAD`. Use `unknown` if git or commits are unavailable.
2. **Timestamp**: Capture current ISO timestamp.
3. **Confidence**: Assign `high`, `medium`, or `low` based on evidence clarity.

### Step 4: Asset Generation
Generate or update the following artifacts following the specifications in `./references/output-spec.md`:
- `.context/repo_scope.md`: Focus on purpose and boundaries.
- `.context/repo_map.md`: Focus on navigation and package layout.

**Persistence Rules**:
- Do not write outside the `.context/` folder.
- If files exist, update them by replacing outdated content while preserving the structure.

## Examples

**Initial Onboarding**
- **User says**: "Generate the context for this repository"
- **Action**: Run the full detection suite and create `.context/repo_scope.md` and `.context/repo_map.md`.

**Context Refresh**
- **User says**: "Refresh the context" or "Sync the context with the latest changes"
- **Action**: Re-scan the structure and update existing files with the latest commit hash and package details.

## Troubleshooting

- **Error: `MISSING_ROOT`**: Occurs if the repository root cannot be determined. Ensure you are executing from within a valid git repository or provide the path.
- **Error: `INSUFFICIENT_EVIDENCE`**: Not enough structure found to build a meaningful map. Check if the project is empty or heavily ignored.
- **Error: `GIT_UNAVAILABLE`**: Git is not installed or the directory is not a git repo. The `verification-commit` will be set to `unknown`.

## Validation Gates

- [ ] Repository root resolved.
- [ ] Ignore rules applied (no build/vendor folders scanned).
- [ ] Both `repo_scope.md` and `repo_map.md` are created or updated.
- [ ] `context-meta` block is present in both files with a valid commit or `unknown`.
- [ ] All source code languages detected (Java, TS, Python, Go, IaC, etc.).
- [ ] All dependency managers detected and listed in `repo_map.md`.
- [ ] `.github/` workflows and actions scanned; pipeline stages captured.
- [ ] Scripts (`*.sh`, `Makefile`, etc.) surfaces catalogued.
- [ ] All test layers identified (unit, integration, functional, acceptance, performance, shell-script).
- [ ] Documentation (`README*`, `docs/`, ADRs) surfaced in `repo_map.md`.
- [ ] No speculative flows or business logic inferred.
