# Testing Patterns

<!-- context-meta
verification-commit: bcd35c43b6fe8286af5f8d45ab30c433ea67d727
generated-at: 2026-06-25T07:35:00Z
confidence: high
-->

---

## Test Layers Detected

| Layer                | Detected | Root Path(s)                           | Framework / Tool                    |
|----------------------|----------|----------------------------------------|-------------------------------------|
| Unit                 | ✅       | `tests/unit/unit.mjs`                  | Node-ESM zero-dependency Layer-1 static checks (planted-bad fixtures) |
| Integration          | ✅       | `tests/integration/integration.mjs`   | Node-ESM zero-dependency Layer-1 live-tree checks |
| Functional           | Scaffolded | `tests/e2e/`                         | Layer 2-4 deferred (contract evals, story tests, trigger harness) |
| Acceptance / BDD     | ❌       | Not detected                           | Not detected                        |
| Performance / Load   | ❌       | Not detected                           | Not detected                        |
| Shell Script Tests   | ✅       | `plugins/arcus/scripts/tests/`         | Custom shell assertions (bash)      |

---

## Unit & Integration Tests

### Test Frameworks
- **Runner**: Node-ESM zero-dependency Layer-1 static suite — `tests/run-tests.mjs` (master runner), `tests/unit/unit.mjs`, `tests/integration/integration.mjs`
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
- **Planted-bad fixtures**: `tests/fixtures/` — intentionally-broken skill manifests, frontmatter, checkpoint JSON, plan markdown, hooks JSON, and agent frontmatter files (used by unit tests to verify checks correctly reject violations)
- **Live-tree integration**: integration tests read the actual `plugins/arcus/skills/`, `plugins/arcus/hooks/hooks.json`, `.arcus/` (if present) and assert they pass all L1 checks

### Framework-Specific Integration Patterns
- **Layer-1 static checks**: 13 checks (L1-1 through L1-13, with L1-11 split into sub-checks a/b) covering skill manifests, frontmatter, line budgets, category invariants, cross-references, hooks integrity, artifact schemas, eval-spec ownership, and agent-surface frontmatter (L1-13)
- **Zero-dependency design**: mirrors `plugins/arcus/scripts/tests/checkpoint.test.sh` discipline — pure Node ESM, no npm packages, no supply-chain risk
- **Harness**: `tests/lib/checks.mjs` (check implementations), `tests/lib/skills.mjs` (skill/manifest/agent parsing utilities — `walkSkills`, `walkAgents`, `walkAll` for the union of both surfaces), `tests/lib/assert.mjs` (assertion primitives)

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
| Unit Tests           | `pnpm test:unit` (or `node tests/unit/unit.mjs`)               | Layer-1 static checks against planted-bad fixtures; zero dependencies; exit non-zero on failure. |
| Integration Tests    | `pnpm test:integration` (or `node tests/integration/integration.mjs`) | Layer-1 static checks against live tree (`plugins/arcus/skills/`, `plugins/arcus/hooks/hooks.json`, `.arcus/` if present); zero dependencies. |
| Full Layer-1 Suite   | `pnpm test` (or `node tests/run-tests.mjs`)                    | Master runner: runs unit, integration, triggers, and eval lint as child processes, aggregates exit codes; runs in CI via `.github/workflows/tests.yml`. |
| Eval spec lint       | `pnpm test:evals:lint`                                          | Layer-2: lint all 18 capability eval specs (PR-2/PR-4), zero tokens; CI-safe. |
| Capability evals     | `pnpm test:evals`                                               | Layer-2: grades specs via the live `claude` CLI (needs `claude` on PATH; dollar-budgeted, costs money) — run manually. See `tests/e2e/evals/` and `ARCUS-TESTING-DEFERRED.md`. |
| Trigger corpus       | `pnpm test:triggers`                                            | Layer-4: deterministic trigger-activation matcher (zero tokens, no LLM); gates activation ≥80% / FP ≤10%. Runs in CI. |
| Acceptance / BDD     | Not detected — checked: `features/`, `**/*.feature`               | No BDD/acceptance artifacts detected.                               |
| Performance / Load   | Not detected — checked: `perf/`, `performance/`, `k6/`, `jmeter/` | No performance/load artifacts detected.                             |
| Shell Script Tests   | `bash plugins/arcus/scripts/tests/checkpoint.test.sh`             | Requires `bash` and `node`; runs standalone without external framework. |
| Docs Build (CI gate) | `pnpm install --frozen-lockfile && pnpm run docs:build` (in `site/`) | CI build validation from `.github/workflows/docs.yml`; not a test suite. |

---

## Canonical Example Files

| Layer                | File Path                                         | Why it's canonical                                                   |
|----------------------|---------------------------------------------------|----------------------------------------------------------------------|
| Unit (Layer-1)       | `tests/unit/unit.mjs`                             | Demonstrates Layer-1 unit test pattern: planted-bad fixtures + custom assertions; zero-dependency Node ESM. |
| Integration (Layer-1)| `tests/integration/integration.mjs`              | Demonstrates Layer-1 integration pattern: live-tree checks against actual skills/hooks/artifacts. |
| Test Library         | `tests/lib/checks.mjs`                            | All L1-1 through L1-13 check implementations (incl. L1-13 `checkAgentFrontmatter`); reused by unit + integration. |
| Test Utilities       | `tests/lib/assert.mjs`, `tests/lib/skills.mjs`   | Custom assertion primitives (red/green diff, PASS/FAIL counters) + skill/manifest parsing helpers. |
| Shell Script         | `plugins/arcus/scripts/tests/checkpoint.test.sh` | Custom bash test harness for checkpoint script lifecycle validation; demonstrates setup, assertions, and teardown conventions. |
