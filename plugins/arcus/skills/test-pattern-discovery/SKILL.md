---
name: test-pattern-discovery
description: Analyze existing tests and persist shared repository testing conventions. Use when user says "how do we write tests?", "discover and persist testing patterns", or "baseline the testing style".
layer: capability
standalone: true
---

# Test Pattern Discovery

## Overview

Identify how tests are authored in the repository and persist shared conventions to `.context/testing-patterns.md`. This will ensure downstream implementation agents follow the established testing style (mocking, assertions, naming).

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `repo_structure` | markdown | Repository structure map identifying test locations for each layer | orchestrator passes repo_map / standalone user supplies it |
| `repo_boundaries` | markdown | Repository scope and testing guardrails | orchestrator passes repo_scope / standalone user supplies it |
| `test_roots` | paths | Test directories for unit, integration, functional, acceptance, performance, and shell tests | orchestrator passes it / inferred from repo_structure |

### Outputs
- **`testing_conventions`** (markdown) — Test frameworks, mocking patterns, assertion styles, test data patterns, and execution commands per test layer (unit, integration, functional, acceptance, performance, shell script).
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/test-pattern-discovery/<story-id-or-timestamp>.md`. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/test-pattern-discovery/<story-id-or-timestamp>.md`; orchestrators override with an explicit path (typically `.context/testing-patterns.md`).
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.

## Instructions

### Step 1: Prep & Metadata
1. Verify that `.context/repo_scope.md` and `.context/repo_map.md` exist.
2. Read `verification-commit` from `repo_scope.md` to use as `CURRENT_COMMIT`.
3. Capture the current ISO timestamp as `GENERATED_AT`.

### Step 2: Identification & Inspection
1. **Locate All Test Roots**: Use `repo_map` to find directories for every test layer. Also scan directly for:
   - **Unit tests**: `src/test/java/`, `src/test/kotlin/`, `**/*.test.{js,ts}`, `**/*.spec.{js,ts}`, `test_*.py`, `*_test.py`
   - **Integration tests**: `src/integrationTest/`, `**/integration/**`, `tests/integration/`
   - **Functional tests**: `test/functional/`, `tests/functional/`, `functional-tests/`, `src/functionalTest/`
   - **Acceptance / BDD tests**: `features/`, `**/*.feature`, `test/acceptance/`, `karate*/`, `cucumber*/`, `behave*/`
   - **Performance / load tests**: `perf/`, `performance/`, `load-test*/`, `gatling/src/test/`, `k6/`, `jmeter/` (`*.jmx`), `locustfile.py`
   - **Shell script tests**: `*.bats` files anywhere; `*.sh` files under `test*/`, `acceptance*/`, `functional*/`, `e2e*/`, `perf*/`, `performance*/`, `scripts/test*/`, or any shell script whose name or content signals test execution (`run_tests.sh`, `acceptance_test.sh`, `test_*.sh`, `smoke_test.sh`)

2. **Scan Sample Sets**: Read representative files from **each detected layer** — service, controller, repository, functional, acceptance, performance, and shell script levels.

3. **Analyze Style per Layer**:
   - **JVM tests**: Identify frameworks (JUnit 5 / TestNG), mocking (Mockito, MockK, WireMock), assertions (AssertJ, Hamcrest), Spring slices (`@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`), base classes, test data patterns (Builders, Fixtures, Object Mothers, SQL scripts, TestContainers).
   - **JS/TS tests**: Identify runner (Jest, Vitest, Mocha), assertion library, mocking approach (jest.mock, sinon), setup/teardown hooks.
   - **Python tests**: Identify runner (pytest, unittest), fixtures, mocking (unittest.mock, pytest-mock), parametrize patterns.
   - **Acceptance / BDD**: Identify framework (Cucumber, Karate, Behave), step definition location, runner command.
   - **Performance tests**: Identify tool (Gatling, k6, JMeter, Locust), scenario structure, threshold/assertion patterns.
   - **Shell script tests**: Identify framework if any (BATS — Bash Automated Testing System), or custom convention; note how setup/teardown and assertions are done (`assert`, `assertEquals`, `diff`, exit-code checks); identify what they test (smoke, acceptance, functional, performance).

4. **Identify Execution Commands**: Populate the **Execution Patterns** table with the command for each
   test type **and the full suite** (the code-review deterministic gate reads the Full Suite row from
   here). Sources:
   - Build tool tasks (e.g., `./gradlew test`, `./gradlew integrationTest`, `mvn verify`)
   - Package manager scripts (e.g., `npm test`, `npm run test:e2e`, `pnpm test:acceptance`)
   - Direct runner invocations (e.g., `pytest tests/`, `python -m pytest`)
   - Shell script invocations (e.g., `bash scripts/run_acceptance_tests.sh`, `./test/functional/run.sh`)
   - CI/CD stages from `.github/workflows/` that run test commands — extract the exact `run:` commands
     (prefer these; CI is authoritative for what gates a PR)

### Step 3: Persistence
1. Use the `./assets/testing-patterns.template.md` to generate the baseline.
2. Persist the output exactly to `.context/testing-patterns.md`.
3. Canonical Files: Select a few specific files that future agents should use as gold-standard examples.

**Core Rules**:
- **Evidence-Only**: Do not suggest testing libraries that aren't already in the classpath.
- **Maintain Consistency**: If the repo uses a specific style (e.g., BDD given/when/then), prioritize documenting it.
- **Consult Specs**: See `./references/testing-spec.md` for detailed extraction logic.

## Examples

**Initial Baseline**
- **User says**: "Baseline our testing conventions."
- **Action**: Scan all test layers (unit, integration, functional, acceptance, performance, shell scripts), detect JUnit 5 + Mockito + TestContainers for JVM, Jest for TS, BATS/custom shell tests, and build the full pattern map.

**Style Refresh**
- **User says**: "We've started using AssertJ for new tests, update the patterns."
- **Action**: Scan recent test files, identify the switch in assertion style, update `.context/testing-patterns.md`.

**Shell test discovery**
- **User says**: "We have some acceptance tests as bash scripts, make sure they are captured."
- **Action**: Scan for `*.sh` / `*.bats` files under test and acceptance directories, extract execution commands, document shell test conventions in the Shell Script Tests section.

## Troubleshooting

- **Error: `MISSING_TESTS`**: No test files found in any layer. Note the absence in the file so downstream agents know they must start from scratch but still follow language/framework best practices.
- **Error: `INSUFFICIENT_PATTERN_EVIDENCE`**: Samples are too inconsistent. Focus on common denominators and mark confidence as `medium`.
- **Error: `SHELL_TESTS_ONLY`**: Repository has only shell script tests and no framework-based tests. Populate only the Shell Script Tests and Execution Patterns sections; mark JVM/JS/Python sections as "Not detected".

## Validation Gates

- [ ] `testing-patterns.md` created in `.context/`.
- [ ] Every section of the template is populated or explicitly marked as "Not detected — checked: [paths]".
- [ ] Shell Script Tests section populated if any `*.sh` or `*.bats` test files were found.
- [ ] Canonical example files point to real, existing paths — covering at least one file per detected layer.
- [ ] Execution commands verified against build files and/or CI/CD workflow `run:` steps.
- [ ] `context-meta` block is present and accurate.
