# Repository Context Output Specification

## repo_scope.md (`.context/repo_scope.md`)

This file defines the high-level boundaries and purpose of the repository.

### Structure

Must include:
- `context-meta` block with `verification-commit`, `generated-at`, `confidence`
- Purpose (1–2 lines)
- Core Responsibilities (bullets)
- Major Implementation Areas
- Key Entry Surfaces
- Tech Stack Signals (languages, frameworks, dependency managers)
- Boundaries / Exclusions (if evident)
- Source/Test/Config/scripts Roots
- CI/CD & Automation: pipeline files found, test gates by stage (unit / integration / functional / acceptance / performance)

## repo_map.md (`.context/repo_map.md`)

This file provides a structural map for navigation and discovery.

### Structure

Must include:
- `context-meta` block with `verification-commit`, `generated-at`, `confidence`
- Top-Level Structure
- Tech Stack (all detected languages, frameworks, dependency managers, IaC, container tooling)
- Key Packages / Modules
- Entry Surface Locations
- Config Hotspots
- Build & Run Commands: table of action → exact command → evidence source, covering build, run, lint,
  lint-autofix, format-check, format-write, typecheck, and static analysis. (Test commands live in
  `testing-patterns.md` → Execution Patterns.) Prefer the command CI actually runs; mark undiscoverable
  actions `Not found`. Consumed by the code-review deterministic gate.
- Integration / Adapter Areas
- Test Locations: table listing root path by test type — unit, integration, functional, acceptance/BDD, performance/load, shell-script tests
- Scripts & Automation: `*.sh`, `*.bash`, `Makefile`, `Taskfile`, utility scripts
- CI/CD Workflows: table of workflow files with trigger and test stages
- Documentation: README locations, `docs/`, ADR directory, changelogs
- Scan Coverage checklist
- Notable Patterns (if evident)

## Metadata Block

Every artifact must start with this block immediately after the main header:

```markdown
<!-- context-meta
verification-commit: <CURRENT_COMMIT>
generated-at: <GENERATED_AT>
confidence: <high | medium | low>
-->
```

