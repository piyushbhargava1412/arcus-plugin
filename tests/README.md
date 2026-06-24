# ARCUS Test Suite

Comprehensive test coverage for the ARCUS plugin, ensuring skill integrity, workflow correctness, and behavioral safety across the Spec → Code → Pull Request pipeline.

---

## 1. Overview: Four-Layer Test Strategy

ARCUS testing follows a **four-layer pyramid** that balances coverage, cost, and feedback speed:

| Layer | What it validates | Cost (tokens) | When it runs | Status |
|-------|------------------|---------------|--------------|--------|
| **Layer 1: Static checks** | Skill manifests, frontmatter, line budgets, category invariants, cross-references, hooks integrity, artifact schemas | **0 tokens** (pure Node ESM checks) | Every commit (pre-push hook), CI, manual `pnpm test` | ✅ **Implemented** (L1-1 through L1-11) |
| **Layer 2: Contract evals** | Capability I/O contracts (given declared inputs → expected output structure, no checkpoint/branch ops), coordinator sequencing over mocked capabilities | Low (evals run on synthetic fixtures; real LLM invocations stubbed where possible) | CI (gated on Layer 1 green), manual `pnpm test:evals` | 🚧 **Scaffolded** (see `ARCUS-TESTING-DEFERRED.md`) |
| **Layer 3: End-to-end story tests** | Full story runs (scaffold → PR) over controlled test repos, asserting checkpoint progression, artifact validity, git state, and PR structure | Medium-High (real multi-stage LLM orchestration) | Nightly CI, pre-release manual trigger | 🚧 **Scaffolded** (see `ARCUS-TESTING-DEFERRED.md`) |
| **Layer 4: Trigger harness** | Natural-language intent recognition (does "implement STORY" invoke arcus-controller? does "afk STORY" set autonomous mode?), hook execution verification | Low (intent classification + mock dispatch) | CI (after Layer 1+2 green), manual `pnpm test:triggers` | 🚧 **Scaffolded** (see `ARCUS-TESTING-DEFERRED.md`) |

**Design principle:** Layer 1 is **zero-dependency, zero-token, pure Node ESM** — it mirrors the discipline of `plugins/arcus/scripts/tests/checkpoint.test.sh` (Bash-native, no npm packages) to ensure tests never become a maintenance bottleneck or introduce supply-chain risk.

Layers 2-4 are **deferred** until the Layer-1 foundation is stable and the LLM-eval harness is production-ready. See [ARCUS-TESTING-DEFERRED.md](../ARCUS-TESTING-DEFERRED.md) for the full roadmap.

---

## 2. Running the Tests

All commands assume you're at the repository root (`arcus-plugin/`).

### Quick start: run all Layer-1 tests

```bash
pnpm test
```

Equivalent to: `node tests/check.mjs` (runs unit + integration as child processes, exits non-zero if either fails).

### Run unit tests only

```bash
pnpm test:unit
```

Runs `node tests/unit.mjs`: asserts that every L1 check **correctly rejects** its planted-bad fixture and **correctly accepts** good input. This is the **DoD #1 guarantee** — the check actually fails on a violation.

### Run integration tests only

```bash
pnpm test:integration
```

Runs `node tests/integration.mjs`: applies all L1 checks to the **live tree** (all skills, real manifests, real hooks.json, live .arcus/ artifacts if present). L1-6 is advisory (warning-only), and L1-11 skips cleanly if `.arcus/` is absent (gitignored).

### Run eval suite (Layer 2) — scaffolded, dry-run only

```bash
pnpm test:evals
```

**Status:** Scaffolded (harness not yet implemented). This will eventually run contract evals over capabilities and coordinators.

### Run trigger tests (Layer 4) — scaffolded, dry-run only

```bash
pnpm test:triggers
```

**Status:** Scaffolded (harness not yet implemented). This will eventually assert natural-language intent → skill dispatch correctness.

### Re-baseline eval pass-rates (after model/judge upgrade)

```bash
pnpm test:evals --rebaseline
```

**Status:** Scaffolded (harness lands in Task 8 of PR). On a judge or model bump, this diffs the new pass-rate against the last baseline, prompts for review, and commits a new baseline if approved. See [§7.3 of PR spec](#) for the full re-baseline protocol.

---

## 3. The L1 Checks (Layer 1: Static Integrity)

Each check is a **pure function**: `checkX(input) => { ok: boolean, errors: string[] }`. They take already-parsed/already-read input and perform zero disk I/O themselves (the integration runner injects file predicates).

| Check ID | What it validates | Mode | Fixture (planted-bad) |
|----------|------------------|------|----------------------|
| **L1-1** | Manifest validity: `plugin.json` and `marketplace.json` structure, name consistency, source path resolution | Hard fail | `tests/fixtures/bad-manifest.json` |
| **L1-2** | Frontmatter validity (per skill): required fields (`name`, `description`, `layer`), kebab-case naming, reserved word ban (`claude`, `anthropic`), description length ≤1024 chars | Hard fail | `tests/fixtures/bad-frontmatter/SKILL.md` (reserved word) |
| **L1-3** | Line budget: every `SKILL.md` ≤500 lines (including frontmatter) | Hard fail | `tests/fixtures/over-budget.md` (>500 lines) |
| **L1-4** | Advisory reviewers are read-only (category invariant): `disable-model-invocation: true`, `user-invocable: false`, `disallowed-tools: [Edit, Write, MultiEdit]` | Hard fail | `tests/fixtures/write-enabled-reviewer/SKILL.md` |
| **L1-5** | Capabilities hold no orchestration state (category invariant): must NOT reference `checkpoint.sh set-status`, `branch.sh`, `git checkout -b`, or "next stage" routing | Hard fail | `tests/fixtures/capability-with-state/SKILL.md` |
| **L1-6** | Orchestrators/coordinators no inlined domain logic (heuristic): flags ≥15 consecutive prose lines without dispatch patterns (`arcus:`, `delegate`, `invoke`) | **Advisory (warning-only, never fails)** | `tests/fixtures/prose-heavy-coordinator/SKILL.md` |
| **L1-7** | Cross-skill references resolve: every `arcus:<skill-name>` mention must resolve to a real skill directory (excludes placeholders like `arcus:<...>`) | Hard fail | `tests/fixtures/dangling-ref/SKILL.md` |
| **L1-8** | Bundled-resource paths resolve: every `references/...` or `assets/...` path **with a file extension** must exist relative to the skill's directory | Hard fail | `tests/fixtures/dead-resource/SKILL.md` |
| **L1-9** | Hooks integrity: `hooks.json` structure validity, every referenced command script exists | Hard fail | `tests/fixtures/bad-hooks.json` |
| **L1-10** | Single model-resolution point: skills (except `model-strategy`) must NOT hardcode versioned model IDs (e.g., `claude-opus-4`, `claude-3-5-sonnet`). Bare tier words (`opus`, `sonnet`, `haiku`) are **allowed** (legitimate complexity-tier references to `arcus:model-strategy`) | Hard fail | `tests/fixtures/inline-model/SKILL.md` |
| **L1-11** | Artifact-schema validation: `session-checkpoint.json` validates against `tests/schemas/session-checkpoint.schema.json` (dependency-free JSON Schema draft-07 subset), and planning artifacts (`plan.md`, `grounded-spec.md`) contain all required sections per `tests/schemas/artifacts.json` | Hard fail | `tests/fixtures/bad-checkpoint.json`, `tests/fixtures/bad-plan.md` |

**Note:** L1-6 is the **only advisory check** — it emits warnings but never sets `ok: false`. All others are **gate-hard-fail**.

---

## 4. The Planted-Violation Guarantee (DoD #1)

Every L1 check (except L1-6, which is advisory and asserts warnings) has **TWO permanent automated assertions**:

1. **Good input → `ok: true`**: The check accepts valid input (e.g., the real `spec-finalizer` skill, real `hooks.json`).
2. **Planted-bad input → `ok: false`**: The check **rejects** a deliberately-bad fixture from `tests/fixtures/`.

This is the **DoD #1 guarantee**: "the check actually fails on a violation" is not a manual review step — it's a permanent automated assertion in `tests/unit.mjs`.

### Fixture → Check Mapping

| Fixture | Check(s) | Violation planted |
|---------|----------|------------------|
| `bad-manifest.json` | L1-1 | Name mismatch between `plugin.json` and `marketplace.json` |
| `bad-frontmatter/SKILL.md` | L1-2 | Name contains reserved word (`Claude`) |
| `over-budget.md` | L1-3 | File >500 lines |
| `write-enabled-reviewer/SKILL.md` | L1-4 | Advisory reviewer missing `disallowed-tools: [Edit, Write, MultiEdit]` |
| `capability-with-state/SKILL.md` | L1-5 | Capability references `checkpoint.sh set-status` |
| `prose-heavy-coordinator/SKILL.md` | L1-6 | Coordinator has ≥15 consecutive prose lines without dispatch patterns (advisory warning) |
| `dangling-ref/SKILL.md` | L1-7 | References `arcus:does-not-exist-skill` and `arcus:another-missing-skill` |
| `dead-resource/SKILL.md` | L1-8 | References `references/missing-file.md` and `assets/another-missing.json` (non-existent) |
| `bad-hooks.json` | L1-9 | References `scripts/does-not-exist.sh` |
| `inline-model/SKILL.md` | L1-10 | Hardcodes `claude-opus-4` and `claude-haiku-3` |
| `bad-checkpoint.json` | L1-11 | Invalid checkpoint schema (missing required field `story_id`) |
| `bad-plan.md` | L1-11 | Missing required section `## Tasks` |

**Maintenance rule:** When adding a new L1 check, you MUST:

1. Add the pure check function to `tests/lib/checks.mjs` (signature: `checkX(input) => { ok: boolean, errors: string[] }`).
2. Add a fixture to `tests/fixtures/` with a planted violation.
3. Add BOTH a good-input assertion and a planted-bad assertion to `tests/unit.mjs`.
4. Wire the check into the live-tree scan in `tests/integration.mjs`.
5. Update the coverage map section in `tests/unit.mjs` to include the new check ID.
6. Update this README's L1 checks table and fixture mapping.

---

## 5. Adding a New L1 Check

Brief step-by-step (see planted-violation guarantee above for full DoD):

1. **Implement the check** in `tests/lib/checks.mjs`:
   ```javascript
   function checkMyNewRule({ name, body, ...otherInputs }) {
     const errors = [];
     // ... validation logic ...
     return { ok: errors.length === 0, errors };
   }
   export { checkMyNewRule };
   ```

2. **Create a planted-bad fixture** under `tests/fixtures/my-bad-fixture/` (or `tests/fixtures/my-bad-fixture.json` for manifests/hooks).

3. **Add unit tests** to `tests/unit.mjs`:
   ```javascript
   section('L1-X: My new rule');
   {
     // Test: good input passes
     const goodResult = checkMyNewRule({ /* valid input */ });
     assert(goodResult.ok === true, 'checkMyNewRule passes on valid input');

     // Test: planted-bad input fails
     const badResult = checkMyNewRule({ /* bad fixture */ });
     assert(badResult.ok === false, 'checkMyNewRule fails on my-bad-fixture');
     assert(badResult.errors.length > 0, 'checkMyNewRule returns error messages');
   }
   ```

4. **Wire into integration** (`tests/integration.mjs`):
   ```javascript
   section('L1-X: My new rule');
   {
     const skills = walkSkills();
     let failures = 0;
     for (const skill of skills) {
       const result = checkMyNewRule({ name: skill.name, body: skill.body });
       if (!result.ok) {
         failures++;
         console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
       }
     }
     assert(failures === 0, `L1-X: all ${skills.length} skills pass my new rule (${failures} failures)`);
   }
   ```

5. **Update the coverage map** in `tests/unit.mjs` to include `'L1-X'` in the `coveredChecks` array.

6. **Update this README** (the L1 checks table and fixture mapping).

---

## 6. Regression-Corpus Runbook (PR-8)

When a skill **misbehaves in real use** (e.g., `spec-finalizer` produces an invalid spec, `code-reviewer` misses a bug, `implementation-planner` generates non-atomic tasks), follow this RED-FIRST discipline:

1. **Capture the repro case** as a new eval under `tests/e2e/evals/specs/_regressions/<STORY_ID>-<skill-name>-<short-description>/`:
   ```
   tests/e2e/evals/specs/_regressions/
     ARC-1234-spec-finalizer-missed-edge-case/
       input.md          # The story text that triggered the misbehavior
       expected.json     # The desired output structure
       context_pack.json # Minimal context (if applicable)
       metadata.json     # { "story_id": "ARC-1234", "skill": "spec-finalizer", ... }
   ```

2. **Run the eval RED** — it MUST fail for the right reason (i.e., the skill produces the buggy output) before you fix the skill. This proves the eval is valid and prevents false positives.

3. **Fix the skill** (edit the SKILL.md prompt, adjust capability contracts, refactor coordinator logic, etc.).

4. **Run the eval GREEN** — verify the fix resolves the regression.

5. **Commit both** the new regression eval and the skill fix in the same PR. The eval is now **permanent** and **append-only** — it runs on every CI build to prevent the regression from recurring.

**Important:**
- The `_regressions/` directory is **append-only** — never delete or modify existing regression cases.
- Regression evals are **separate from** the golden-path evals in `tests/e2e/evals/specs/<story-archetypes>/` (which test happy-path behavior).
- The harness for this lands in **Task 8** (see `ARCUS-TESTING-DEFERRED.md` for implementation details).

---

## 7. Model-Upgrade Re-Baseline (PR / §7.3)

On a **judge model bump** (e.g., upgrading the eval harness from Sonnet 4.0 to Sonnet 4.6) or a **target model upgrade** (e.g., skills now default to Opus 5 instead of Opus 4), pass-rates may shift due to model behavior changes (not skill regressions).

**Re-baseline protocol:**

1. **Run the eval suite with `--rebaseline`:**
   ```bash
   pnpm test:evals --rebaseline
   ```

2. The harness will:
   - Run all evals under `tests/e2e/evals/specs/`.
   - Compare the new pass-rate to the last committed baseline (`tests/e2e/evals/baselines/<model>-<judge>-<date>.json`).
   - Diff the changes (which evals flipped pass→fail or fail→pass, and by how much).
   - Prompt you to review the diff.

3. **Review the diff carefully:**
   - If the new model **improves** pass-rates (e.g., fewer false negatives, better adherence to contracts) → approve the new baseline.
   - If the new model **degrades** pass-rates → investigate whether it's a legitimate model regression or an eval calibration issue. Do NOT auto-approve a degradation.

4. **Commit the new baseline** (if approved):
   ```bash
   git add tests/e2e/evals/baselines/
   git commit -m "chore(evals): rebaseline for <model> upgrade"
   ```

**Important:**
- Baselines are **committed to the repo** (not gitignored) — they're part of the test suite's contract.
- Re-baseline is **manual-approval-only** — the harness never auto-commits a new baseline.
- This is orthogonal to the regression-corpus (§6) — regressions are permanent and never re-baselined; golden-path evals may shift with model upgrades.

**Status:** The re-baseline harness lands in **Task 8** (see `ARCUS-TESTING-DEFERRED.md` for implementation).

---

## 8. Test Architecture Notes

### Why zero-dependency for Layer 1?

Layer-1 tests (L1-1 through L1-11) are **pure Node ESM with zero npm packages** for three reasons:

1. **Zero supply-chain risk** — no transitive dependencies, no `npm audit` alerts, no version conflicts with the main plugin's dependencies.
2. **Instant cold-start** — no `npm install` latency, no `node_modules/` bloat. Tests run in <100ms even on a fresh clone.
3. **Discipline alignment** — mirrors `plugins/arcus/scripts/tests/checkpoint.test.sh` (Bash-native, no external tools). Static checks should be **boring and fast**, never a maintenance bottleneck.

Layer 2+ tests (evals, e2e, triggers) will use npm packages (e.g., a lightweight YAML parser, a markdown parser for eval fixtures) — but Layer 1 is the **bedrock** and stays pure.

### Why is L1-6 advisory-only?

L1-6 (no inlined domain logic in orchestrators/coordinators) uses a **heuristic** (≥15 consecutive prose lines without dispatch patterns) that:

- Has false positives (e.g., a legitimate "how to use this coordinator" prose section).
- Evolves over time (we may refine the threshold or pattern matching as we learn what "inlined domain logic" looks like in practice).

Advisory warnings give us **signal without gate-blocking** — they prompt a human review during development, but don't fail CI if the dev consciously chooses to accept the warning.

All other L1 checks are **gate-hard-fail** because they're deterministic and unambiguous (e.g., "name contains reserved word `claude`" has no false positives).

### Why skip L1-11 cleanly if `.arcus/` is absent?

`.arcus/` is **gitignored** (it contains session-specific checkpoint state, planning artifacts, and git branch metadata). On CI or a fresh clone, `.arcus/` won't exist unless a developer explicitly ran `arcus-controller` locally.

L1-11 (artifact-schema validation) MUST validate the **live checkpoint and artifacts when they exist** (to catch schema drift during active development), but MUST NOT **fail CI when they're absent** (that would make CI flaky or force us to commit `.arcus/`, violating the gitignore contract).

The "skip cleanly" behavior (`assert(true, 'skipped...')` when `.arcus/` is absent) keeps CI green while still validating artifacts when they're present.

---

## 9. Contributing

When adding new L1 checks, evals, or test harness features:

1. **Follow the planted-violation guarantee** (§4) — every check MUST have both good and bad fixtures.
2. **Keep Layer 1 zero-dependency** — no npm packages in `tests/lib/`, `tests/unit.mjs`, `tests/integration.mjs`, or `tests/check.mjs`.
3. **Update this README** — document the new check in the L1 checks table, add the fixture to the mapping, update the coverage map section reference.
4. **Run the full suite** before committing:
   ```bash
   pnpm test  # Must exit 0
   ```

For Layer 2+ harness work (evals, e2e, triggers), see [ARCUS-TESTING-DEFERRED.md](../ARCUS-TESTING-DEFERRED.md) for the full roadmap and architecture.

---

## 10. FAQ

**Q: Why not use a testing framework like Jest or Vitest?**

A: Layer-1 tests are **pure Node ESM with zero dependencies** (see §8). Adding a test framework would violate that discipline and introduce 50+ transitive dependencies. The custom `assert.mjs` module (40 lines) gives us everything we need: assertions, counters, section labels, and a clean exit-code contract.

**Q: Why are fixtures in `tests/fixtures/` instead of inline in the test files?**

A: Fixtures are **reusable across unit and integration tests** (e.g., `bad-manifest.json` is asserted in both `unit.mjs` for the check logic and `integration.mjs` for the live-tree scan). Inlining them would duplicate the fixture data and make updates error-prone.

**Q: Can I run a single L1 check in isolation?**

A: Yes — `tests/lib/checks.mjs` exports pure functions. You can import and call them directly from Node REPL or a scratch script:
```javascript
import { checkManifests } from './tests/lib/checks.mjs';
const result = checkManifests({ pluginJson: {...}, marketplaceJson: {...}, sourceResolves: true });
console.log(result);
```

**Q: Why does `tests/check.mjs` spawn child processes instead of importing `unit.mjs` and `integration.mjs` directly?**

A: **Isolation** — the module-level default counter in `assert.mjs` is shared across all imports. If we imported both test files into `check.mjs`, their counters would collide. Spawning them as separate processes gives each suite a clean counter and clean exit code (0 = green, non-zero = red).

**Q: What happens if I add a new skill but forget to add L1 tests for it?**

A: **Integration tests catch it automatically** — `tests/integration.mjs` walks the live tree (`walkSkills()`) and applies all L1 checks to every skill. If the new skill violates any check, integration fails. You don't need to manually wire the new skill into tests (unless it's a new check that didn't exist before).

---

For Layer 2-4 architecture (contract evals, e2e tests, trigger harness), see **[ARCUS-TESTING-DEFERRED.md](../ARCUS-TESTING-DEFERRED.md)**.
