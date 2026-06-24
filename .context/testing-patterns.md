# Testing Patterns

<!-- context-meta
verification-commit: 6072385578e5017440dbed197e9bd0fa133f9b51
generated-at: 2026-06-24T06:51:22Z
confidence: high
-->

---

## Test Layers Detected

| Layer                | Detected | Root Path(s)                           | Framework / Tool                    |
|----------------------|----------|----------------------------------------|-------------------------------------|
| Unit                 | ✅       | `tests/unit.mjs`                       | Node-ESM zero-dependency Layer-1 static checks (planted-bad fixtures) |
| Integration          | ✅       | `tests/integration.mjs`                | Node-ESM zero-dependency Layer-1 live-tree checks |
| Functional           | Scaffolded | `tests/e2e/`                         | Layer 2-4 deferred (contract evals, story tests, trigger harness) |
| Acceptance / BDD     | ❌       | Not detected                           | Not detected                        |
| Performance / Load   | ❌       | Not detected                           | Not detected                        |
| Shell Script Tests   | ✅       | `plugins/arcus/scripts/tests/`         | Custom shell assertions (bash)      |

---

## Unit & Integration Tests

### Test Frameworks
- **Runner**: Node-ESM zero-dependency Layer-1 static suite — `tests/check.mjs` (master runner), `tests/unit.mjs`, `tests/integration.mjs`
- **Mocking**: Not used — Layer-1 is pure static checks (file reads, JSON parsing, regex matching, cross-references)
- **Assertions**: Custom hand-rolled `assert` module (`tests/lib/assert.mjs`) — `assertEqual`, `assertTrue`, `assertFalse`, `assertNotNull`, `assertMatches`, with PASS/FAIL counters and red/green diff output

### Naming Conventions
- **File**: `unit.mjs`, `integration.mjs`, `check.mjs` (master runner); no `.test.` or `.spec.` suffix
- **Test cases**: Plain JS objects with `{ name, fn }` structure; no class-based test harness

### Mocking / Stubbing Style
Not used — Layer-1 checks are pure static validation (no LLM invocations, no external services, no I/O beyond file reads)

### Assertion Style
- Custom `assert` module (`tests/lib/assert.mjs`) with red/green diff output on failure
- PASS/FAIL counters; tests exit non-zero if any assertion fails
- Example: `assertEqual(actual, expected, message)`, `assertTrue(condition, message)`

### Test Data / Fixture Patterns
- **Planted-bad fixtures**: `tests/fixtures/` — intentionally-broken skill manifests, frontmatter, checkpoint JSON, plan markdown, hooks JSON (used by unit tests to verify checks correctly reject violations)
- **Live-tree integration**: integration tests read the actual `plugins/arcus/skills/`, `plugins/arcus/hooks/hooks.json`, `.arcus/` (if present) and assert they pass all L1 checks

### Framework-Specific Integration Patterns
- **Layer-1 static checks**: 11 checks (L1-1 through L1-11) covering skill manifests, frontmatter, line budgets, category invariants, cross-references, hooks integrity, artifact schemas
- **Zero-dependency design**: mirrors `plugins/arcus/scripts/tests/checkpoint.test.sh` discipline — pure Node ESM, no npm packages, no supply-chain risk
- **Harness**: `tests/lib/checks.mjs` (check implementations), `tests/lib/skills.mjs` (skill/manifest parsing utilities), `tests/lib/assert.mjs` (assertion primitives)

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

Describe how to run each test type. Verified against `package.json` (repo root), `site/package.json`, `.github/workflows/docs.yml`, and `.github/workflows/tests.yml`.

| Test Type            | Command(s)                                                      | Notes / Prerequisites                                                |
|----------------------|-----------------------------------------------------------------|-----------------------------------------------------------------------|
| Unit Tests           | `pnpm test:unit` (or `node tests/unit.mjs`)                     | Layer-1 static checks against planted-bad fixtures; zero dependencies; exit non-zero on failure. |
| Integration Tests    | `pnpm test:integration` (or `node tests/integration.mjs`)       | Layer-1 static checks against live tree (`plugins/arcus/skills/`, `plugins/arcus/hooks/hooks.json`, `.arcus/` if present); zero dependencies. |
| Full Layer-1 Suite   | `pnpm test` (or `node tests/check.mjs`)                         | Master runner: runs unit + integration as child processes, aggregates exit codes; runs in CI via `.github/workflows/tests.yml`. |
| Functional Tests     | `pnpm test:evals`, `pnpm test:triggers` (scaffolded, deferred)  | Layer 2-4 harness: contract evals, story tests, trigger recognition; see `tests/e2e/` and `ARCUS-TESTING-DEFERRED.md`. |
| Acceptance / BDD     | Not detected — checked: `features/`, `**/*.feature`               | No BDD/acceptance artifacts detected.                               |
| Performance / Load   | Not detected — checked: `perf/`, `performance/`, `k6/`, `jmeter/` | No performance/load artifacts detected.                             |
| Shell Script Tests   | `bash plugins/arcus/scripts/tests/checkpoint.test.sh`             | Requires `bash` and `node`; runs standalone without external framework. |
| Docs Build (CI gate) | `pnpm install --frozen-lockfile && pnpm run docs:build` (in `site/`) | CI build validation from `.github/workflows/docs.yml`; not a test suite. |

---

## Canonical Example Files

| Layer                | File Path                                         | Why it's canonical                                                   |
|----------------------|---------------------------------------------------|----------------------------------------------------------------------|
| Unit (Layer-1)       | `tests/unit.mjs`                                  | Demonstrates Layer-1 unit test pattern: planted-bad fixtures + custom assertions; zero-dependency Node ESM. |
| Integration (Layer-1)| `tests/integration.mjs`                           | Demonstrates Layer-1 integration pattern: live-tree checks against actual skills/hooks/artifacts. |
| Test Library         | `tests/lib/checks.mjs`                            | All L1-1 through L1-11 check implementations; reused by unit + integration. |
| Test Utilities       | `tests/lib/assert.mjs`, `tests/lib/skills.mjs`   | Custom assertion primitives (red/green diff, PASS/FAIL counters) + skill/manifest parsing helpers. |
| Shell Script         | `plugins/arcus/scripts/tests/checkpoint.test.sh` | Custom bash test harness for checkpoint script lifecycle validation; demonstrates setup, assertions, and teardown conventions. |
