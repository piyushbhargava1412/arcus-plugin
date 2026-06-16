# Repository Map: [REPO NAME]

**Generated**: [DATE]
**Confidence**: [HIGH | MEDIUM | LOW]

<!-- context-meta
verification-commit: unknown
generated-at: [ISO-TIMESTAMP]
confidence: high | medium | low
-->

---

## Overview

<!-- 2-3 sentences: what this repo is, primary language/framework, deployment target.
     TECHNICAL ONLY — do NOT describe business domain or user roles here.
     Business context belongs in repo_scope.md → Overview. -->

## Directory Structure

<!-- Top-level directory tree (depth 2-3). Use actual paths. -->

```
[repo-name]/
├── ...
```

## Tech Stack

| Category             | Technology     | Version    | Evidence                        |
|----------------------|----------------|------------|---------------------------------|
| Language(s)          |                |            | `[file path]`                   |
| Framework(s)         |                |            | `[file path]`                   |
| Dependency Manager   |                |            | `[manifest file path]`          |
| Build Tool           |                |            | `[file path]`                   |
| Test Framework(s)    |                |            | `[file path]`                   |
| IaC / Infrastructure |                |            | `[file path]`                   |
| Database             |                |            | `[file path or config]`         |
| Messaging            |                |            | `[file path or config]`         |
| Container / Compose  |                |            | `[Dockerfile / docker-compose]` |

## Entry Points

<!-- Application entry points: main class, Lambda handler, CLI entry, etc. -->

| Entry Point          | Type                | File Path                       |
|----------------------|---------------------|---------------------------------|
|                      |                     |                                 |

## Key Components

<!-- Controllers, services, handlers, consumers, repositories — the structural backbone -->

| Component            | Type                | File Path                       | Purpose                         |
|----------------------|---------------------|---------------------------------|---------------------------------|
|                      |                     |                                 |                                 |

## Contracts & Schemas

<!-- Schema FILES only: OpenAPI specs, Avro/Protobuf schemas, GraphQL schemas, JSON schemas.
     List the file path and format — do NOT list individual API endpoints here.
     Logical API operations (methods, paths) belong in repo_scope.md → APIs. -->

| Contract             | Format              | File Path                       |
|----------------------|---------------------|---------------------------------|
|                      |                     |                                 |

<!-- If none found: "No contracts detected. Checked: [list of directories searched]" -->

## Configuration

<!-- Key config files: application.yml, .env, docker-compose, terraform, etc. -->

| Config File          | Purpose             | File Path                       |
|----------------------|---------------------|---------------------------------|
|                      |                     |                                 |

## Build & Run Commands

<!-- Discovered from build files, scripts, Makefile, package.json, etc. -->

| Action      | Command                          | Source                          |
|-------------|----------------------------------|---------------------------------|
| Build       |                                  | `[file path]`                   |
| Test        |                                  | `[file path]`                   |
| Run         |                                  | `[file path]`                   |
| Lint        |                                  | `[file path]`                   |

<!-- If not discoverable: "Not found — checked: [files searched]" -->

## Observability

<!-- Logging, metrics, tracing, health checks — if visible in code/config -->

| Signal       | Implementation       | Evidence                        |
|--------------|----------------------|---------------------------------|
| Logging      |                      | `[file path]`                   |
| Metrics      |                      | `[file path]`                   |
| Tracing      |                      | `[file path]`                   |
| Health Check |                      | `[file path]`                   |

<!-- If not found: "No observability hooks detected." -->

## Test Locations

<!-- All test roots, organized by test type -->

| Test Type            | Layer / Framework           | Root Path(s)                    |
|----------------------|-----------------------------|---------------------------------|
| Unit                 |                             |                                 |
| Integration          |                             |                                 |
| Functional           |                             |                                 |
| Acceptance / BDD     |                             |                                 |
| Performance / Load   |                             |                                 |
| Shell Script Tests   | bash/bats/custom            |                                 |

<!-- If none found for a type: mark as "Not detected — checked: [paths searched]" -->

## Scripts & Automation

<!-- Shell scripts, Makefiles, utility scripts — anything runnable outside the build tool -->

| Script / File        | Purpose                          | File Path                       |
|----------------------|----------------------------------|---------------------------------|
|                      |                                  |                                 |

<!-- If none: "No scripts detected. Checked: scripts/, bin/, Makefile" -->

## CI/CD Workflows

<!-- GitHub Actions, CircleCI, GitLab CI, Jenkins, etc. -->

| Workflow / File      | Trigger                     | Key Stages (build / test / deploy) | File Path                  |
|----------------------|-----------------------------|------------------------------------|----------------------------|
|                      |                             |                                    |                            |

<!-- List test stages explicitly (unit-test, integration-test, functional-test, acceptance-test, performance-test) -->
<!-- If none: "No CI/CD configuration detected." -->

## Documentation

<!-- READMEs, docs/, ADRs, changelogs, contributing guides -->

| Document             | Purpose                          | File Path                       |
|----------------------|----------------------------------|---------------------------------|
| README               |                                  | `README.md`                     |
|                      |                                  |                                 |

<!-- ADRs: list index file or directory path; link individual records only if ≤ 5 exist -->

<!-- Logical grouping of code by module or package -->

| Module / Package     | Purpose                          | Key Files                       |
|----------------------|----------------------------------|---------------------------------|
|                      |                                  |                                 |

---

## Scan Coverage

<!-- Simple checklist of what was detected vs not found during scanning.
     Do NOT include confidence ratings or analysis here.
     Full confidence analysis + human confirmation lives ONLY in repo_scope.md → Confidence & Unknowns. -->

| Aspect                          | Status                     | Notes |
|---------------------------------|----------------------------|-------|
| Source code (Java/Kotlin)       | ✅ Detected / ❌ Not found |       |
| Source code (JS/TS)             | ✅ Detected / ❌ Not found |       |
| Source code (Python)            | ✅ Detected / ❌ Not found |       |
| Source code (Go)                | ✅ Detected / ❌ Not found |       |
| Other languages                 | ✅ Detected / ❌ Not found |       |
| IaC (Terraform / CDK / CF)      | ✅ Detected / ❌ Not found |       |
| Dependency manager(s)           | ✅ Detected / ❌ Not found |       |
| Unit tests                      | ✅ Detected / ❌ Not found |       |
| Integration tests               | ✅ Detected / ❌ Not found |       |
| Functional tests                | ✅ Detected / ❌ Not found |       |
| Acceptance / BDD tests          | ✅ Detected / ❌ Not found |       |
| Performance / load tests        | ✅ Detected / ❌ Not found |       |
| Shell script tests              | ✅ Detected / ❌ Not found |       |
| Scripts (sh / bash / Makefile)  | ✅ Detected / ❌ Not found |       |
| CI/CD workflows                 | ✅ Detected / ❌ Not found |       |
| GitHub Actions                  | ✅ Detected / ❌ Not found |       |
| Documentation (README / docs/)  | ✅ Detected / ❌ Not found |       |
| ADRs                            | ✅ Detected / ❌ Not found |       |
| Container config (Docker)       | ✅ Detected / ❌ Not found |       |

> **See also**: [repo_scope.md](repo_scope.md) for business ownership, interface boundaries, and full confidence analysis.
