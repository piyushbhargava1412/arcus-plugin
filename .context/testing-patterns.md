# Testing Patterns

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:03:49Z
confidence: medium
-->

---

## Test Layers Detected

| Layer                | Detected | Root Path(s)                           | Framework / Tool                    |
|----------------------|----------|----------------------------------------|-------------------------------------|
| Unit                 | ❌       | Not detected                           | Not detected                        |
| Integration          | ❌       | Not detected                           | Not detected                        |
| Functional           | ❌       | Not detected                           | Not detected                        |
| Acceptance / BDD     | ❌       | Not detected                           | Not detected                        |
| Performance / Load   | ❌       | Not detected                           | Not detected                        |
| Shell Script Tests   | ✅       | `plugins/arcus/scripts/tests/`         | Custom shell assertions (bash)      |

---

## Unit & Integration Tests

### Test Frameworks
- **Runner**: Not detected — checked: `**/*.test.{js,ts}`, `**/*.spec.{js,ts}`, `src/test/java/`, `src/test/kotlin/`, `test_*.py`, `*_test.py`
- **Mocking**: Not detected — no evidence of framework-level mocking libraries in test files.
- **Assertions**: Not detected for framework-based unit/integration suites.

### Naming Conventions
- **Class / File**: Not detected for framework-based unit/integration tests.
- **Methods**: Not detected for framework-based unit/integration tests.

### Mocking / Stubbing Style
Not detected — checked: `src/test/java/`, `src/test/kotlin/`, `**/*.test.{js,ts}`, `**/*.spec.{js,ts}`, `test_*.py`, `*_test.py`

### Assertion Style
Not detected — checked: framework test roots above.

### Test Data / Fixture Patterns
Not detected — no framework fixture roots found.

### Framework-Specific Integration Patterns
- **Database**: Not detected.
- **Slices**: Not detected.
- **Harness**: Not detected.
- **External Services**: Not detected.

---

## Acceptance / BDD Tests

Not detected — checked: `features/`, `test/acceptance/`, `**/*.feature`, `karate*/`, `cucumber*/`, `behave*/`

- **Framework**: Not detected
- **Feature file location**: Not detected
- **Step definitions location**: Not detected
- **Runner / entry point**: Not detected
- **Tags / profiles used**: Not detected
- **Test data strategy**: Not detected

---

## Functional Tests

Not detected — checked: `test/functional/`, `tests/functional/`, `functional-tests/`, `src/functionalTest/`, `e2e*/`

- **Framework / approach**: Not detected
- **Test root**: Not detected
- **Scope**: Not detected
- **Environment / setup**: Not detected

---

## Performance / Load Tests

Not detected — checked: `perf/`, `performance/`, `load-test*/`, `gatling/src/test/`, `k6/`, `jmeter/`, `locustfile.py`

- **Tool**: Not detected
- **Test root**: Not detected
- **Scenario structure**: Not detected
- **Thresholds / assertions**: Not detected
- **Execution command**: Not detected

---

## Shell Script Tests

- **Framework**: Custom shell conventions (no BATS detected)
- **File locations**: `plugins/arcus/scripts/tests/checkpoint.test.sh`
- **Naming convention**: `*.test.sh` under `plugins/arcus/scripts/tests/`
- **Assertion style**: Custom `assert_eq` function + exit-code checks + pass/fail counters (`PASS`, `FAIL`)
- **Setup / teardown**: Isolated temporary sandbox via `mktemp -d` and `trap 'rm -rf "$TMP"' EXIT`
- **What they test**: End-to-end command behavior for checkpoint lifecycle actions (`init`, `complete`, `set-status`, `set-mode`, `reopen`) and legacy schema migration
- **Environment / prerequisites**: Requires `bash` and `node`; test runs in temporary directory and invokes `checkpoint.sh`

### Shell Script Canonical Examples
- `plugins/arcus/scripts/tests/checkpoint.test.sh` — canonical custom bash test harness for deterministic script behavior and JSON state assertions

---

## Execution Patterns

Describe how to run each test type. Verified against `site/package.json` and `.github/workflows/docs.yml`.

| Test Type            | Command(s)                                                      | Notes / Prerequisites                                                |
|----------------------|-----------------------------------------------------------------|-----------------------------------------------------------------------|
| Unit Tests           | Not detected — checked: `**/*.test.{js,ts}`, `**/*.spec.{js,ts}` | No framework unit suites detected in repository files.              |
| Integration Tests    | Not detected — checked: `src/integrationTest/`, `tests/integration/` | No integration suite roots detected.                              |
| Functional Tests     | Not detected — checked: `test/functional/`, `tests/functional/`   | No functional suite roots detected.                                 |
| Acceptance / BDD     | Not detected — checked: `features/`, `**/*.feature`               | No BDD/acceptance artifacts detected.                               |
| Performance / Load   | Not detected — checked: `perf/`, `performance/`, `k6/`, `jmeter/` | No performance/load artifacts detected.                             |
| Shell Script Tests   | `bash plugins/arcus/scripts/tests/checkpoint.test.sh`             | Requires `bash` and `node`; runs standalone without external framework. |
| Full Suite           | `pnpm install --frozen-lockfile && pnpm run docs:build` (in `site/`) | CI build validation from `.github/workflows/docs.yml`; not a test suite. |

---

## Canonical Example Files

| Layer                | File Path                                         | Why it's canonical                                                   |
|----------------------|---------------------------------------------------|----------------------------------------------------------------------|
| Shell Script         | `plugins/arcus/scripts/tests/checkpoint.test.sh` | Only detected test layer; demonstrates setup, assertions, and teardown conventions. |
