# ARCUS Test Suite

Comprehensive test coverage for the ARCUS plugin, ensuring skill integrity, workflow correctness, and behavioral safety across the Spec → Code → Pull Request pipeline.

---

## 1. Overview: Test Strategy

ARCUS testing balances coverage, cost, and feedback speed. Two layers are
**deterministic and zero-token** and run on every push; one layer (the capability
evals) is **graded by a live, dollar-budgeted `claude` CLI** and is run manually.

| Layer | What it validates | Cost | When it runs | Status |
|-------|------------------|------|--------------|--------|
| **Layer 1: Static checks** | Skill manifests, frontmatter, line budgets, category invariants, cross-references, hooks integrity, artifact schemas, every-capability-owns-an-eval-spec | **0 tokens** (pure Node ESM checks) | Every commit (pre-push hook), CI, manual `pnpm test` | ✅ **Implemented** (L1-1 through L1-12) |
| **Layer 2: Capability eval specs** | Capability I/O contracts: per-capability eval specs (18 specs / 43 cases), one per capability. Graded by the **live `claude` CLI**, bounded by a per-eval dollar budget. Lint is a separate zero-token pass. | **0 tokens** for lint (`test:evals:lint`); **costs money** when run live (`test:evals`), bounded by `--max-budget-usd` | Lint: every push / CI. Live grading: **manual** (needs an authenticated `claude` CLI on PATH) | ✅ **Authored & lint-clean**; live grading run on demand |
| **Layer 3: Seam + end-to-end story tests** | — | — | — | ❌ **Not implemented** (descoped for simplicity) |
| **Layer 4: Trigger harness** | Natural-language intent recognition — does the right skill fire for a query, and do dispatched-only skills correctly NOT fire? Corpus graded against `SKILL.md` trigger phrasing | **0 tokens** (deterministic trigger match — no LLM, no network) | `pnpm test:triggers`, every push / CI | ✅ **Implemented** (deterministic gates) |

**Design principle:** Layers 1 and 4 are **zero-dependency, zero-token, pure Node ESM** — they
mirror the discipline of `plugins/arcus/scripts/tests/checkpoint.test.sh` (Bash-native, no npm
packages) so tests never become a maintenance bottleneck or introduce supply-chain risk. Their
exported pure functions are unit-tested in `tests/unit/unit.mjs`.

The **Layer-2 eval grading** shells out to the already-authenticated `claude` CLI:
its only precondition is the `claude` binary on PATH. There is **no API-key env var and no
offline/dry-run mode** — cost is bounded by a dollar budget passed to the CLI. Because it costs
money and needs an authenticated CLI, it is **run manually, not in the per-push gate**. The
per-push gate is Layer 1 (`pnpm test`) plus the deterministic trigger corpus
(`pnpm test:triggers`); `pnpm test:evals:lint` (zero-token spec lint) can also run in CI.

---

## 2. Running the Tests

All commands assume you're at the repository root (`arcus-plugin/`).

### Quick start: run all Layer-1 tests

```bash
pnpm test
```

Equivalent to: `node tests/run-tests.mjs` (runs the zero-token tiers — unit, integration, triggers, and eval-spec lint — as child processes, exits non-zero if any tier fails).

### Run unit tests only

```bash
pnpm test:unit
```

Runs `node tests/unit/unit.mjs`: asserts that every L1 check **correctly rejects** its planted-bad fixture and **correctly accepts** good input. This is the **DoD #1 guarantee** — the check actually fails on a violation.

### Run integration tests only

```bash
pnpm test:integration
```

Runs `node tests/integration/integration.mjs`: applies all L1 checks to the **live tree** (all skills, real manifests, real hooks.json, live .arcus/ artifacts if present). L1-6 is advisory (warning-only), and L1-11 skips cleanly if `.arcus/` is absent (gitignored).

### Lint the capability eval specs (Layer 2 — zero tokens)

```bash
pnpm test:evals:lint   # node tests/e2e/evals/run-evals.mjs --lint-only
```

Lints every spec (PR-2 no-naked-substrings-off-allowlist; PR-4 every expectation carries a
tier; file-assertion shape) and exits — **zero model calls**. Safe to run on every push / in CI.

### Run the capability evals live (Layer 2 — costs money)

```bash
pnpm test:evals        # node tests/e2e/evals/run-evals.mjs
```

This grades all 18 capability specs by shelling out to the **live `claude` CLI**.
**Preconditions and cost:**

- The only precondition is an **authenticated `claude` CLI on PATH** (no API-key env var,
  no offline mode). If `claude` is not found, the runner exits non-zero.
- Each eval is bounded by a **dollar budget** passed to the CLI via `--max-budget-usd`
  (env `ARCUS_EVAL_MAX_BUDGET_USD`, default `$0.50`). The LLM judge runs under its own budget
  (env `ARCUS_EVAL_JUDGE_BUDGET_USD`, default `$0.10`). A spec may also declare
  `cost_budget: { "max_usd": N }`.
- Each case runs `ARCUS_EVAL_TRIALS` times (default 3); `critical` expectations gate hard,
  `quality` expectations are averaged against `ARCUS_EVAL_SCORE_THRESHOLD` (default 70).

Because it **needs an authenticated CLI and costs money**, run it **manually** — it is not
part of the per-push gate.

#### Step-by-step: how to run the evals

1. **Confirm the `claude` CLI is installed and authenticated** (this is the only precondition —
   there is no API key to set; the harness reuses whatever your CLI is logged into):

   ```bash
   claude --version       # prints a version => CLI is on PATH
   ```

   If it's missing, install Claude Code and sign in first; the runner exits non-zero without it.

2. **Lint first (free).** Always validate the specs before spending anything:

   ```bash
   pnpm test:evals:lint
   ```

3. **Run one cheap case to confirm wiring** before a full run. Use the env filters to scope to a
   single skill (and optionally a single case id) and drop to one trial:

   ```bash
   ARCUS_EVAL_TRIALS=1 ARCUS_EVAL_SKILL=simplify-and-verify pnpm test:evals
   # or a single case:
   ARCUS_EVAL_TRIALS=1 ARCUS_EVAL_SKILL=spec-finalizer ARCUS_EVAL_ID=<case-id> pnpm test:evals
   ```

4. **Run the full suite** (all 18 specs, 3 trials each — costs several dollars):

   ```bash
   pnpm test:evals
   ```

**What it does per case:** seeds the spec's `fixture.files` into a fresh **`git init` temp project**,
runs that project as the working directory via
`claude -p … --plugin-dir plugins/arcus --setting-sources project --output-format stream-json --verbose`,
reduces the event stream to a **transcript** (assistant prose + tool calls + final result), then
grades each trial **two ways**:

- **Behavioural grade** by `kind`: `judged` → an LLM-judge call over the transcript;
  `deterministic`/`routing` → substring assertions over the assistant + result text.
- **File-system assertions** against the project the skill operated on (see below).

A trial passes only when **both** the behavioural grade and the file-system assertions pass. The
runner then classifies the pass-rate, checks the dollar budget, and writes **forensic artifacts**
(raw event log, result text, project copy per trial) under `ARCUS_EVAL_OUT_DIR`. Exit code is
non-zero if any case fails.

**File-system assertions** (optional, allowed for any skill) live under `assertions` in a case:

| Field | Type | Asserts |
|-------|------|---------|
| `required_files` | `string[]` | each path exists in the project after the run |
| `required_file_substrings` | `{ path: string[] }` | each listed substring is present in that file |
| `unchanged_files` | `string[]` | the file is byte-identical to its `fixture.files` seed (skill must not touch it) |

**Scoping / tuning knobs (env vars):**

| Env var | Default | Effect |
|---------|---------|--------|
| `ARCUS_EVAL_SKILL` | — | run only this skill's spec |
| `ARCUS_EVAL_ID` | — | run only this case id |
| `ARCUS_EVAL_TRIALS` | `3` | trials per case (lower = cheaper/faster) |
| `ARCUS_EVAL_MAX_BUDGET_USD` | `0.50` | dollar ceiling per skill run |
| `ARCUS_EVAL_JUDGE_BUDGET_USD` | `0.10` | dollar ceiling per judge call |
| `ARCUS_EVAL_JUDGE_MODEL` | CLI default | model id for the judge |
| `ARCUS_EVAL_SCORE_THRESHOLD` | `70` | quality-tier mean-score gate |
| `ARCUS_EVAL_TIMEOUT_SECONDS` | `300` | per-CLI-call timeout |
| `ARCUS_EVAL_OUT_DIR` | temp dir | where per-trial forensic artifacts (raw event log, result text, project copy) are written |

> **Authoring a new skill?** Run just that skill's evals before pushing (manual responsibility — there
> is no pre-push hook):
>
> ```bash
> ARCUS_EVAL_SKILL=<your-skill> pnpm test:evals
> ```

> **Note:** `pnpm test:evals` shells out to the `claude` CLI. Run it from a normal terminal. The
> capability under test must be invocable by name in that subprocess — if the model reports the
> skill "doesn't exist in this session," the plugin isn't loaded for the headless run (a known
> setup caveat, separate from the spec itself).

### Run the trigger corpus (Layer 4 — zero tokens)

```bash
pnpm test:triggers     # node tests/e2e/triggers/run-triggers.mjs
```

Deterministic natural-language trigger matching (no LLM, no network, zero tokens). Safe to run
on every push / in CI.

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
| **L1-12** | Every capability skill owns a Layer-2 eval spec: each capability must have a `tests/e2e/evals/specs/<skill>/evals.json` — there is no "hard-to-test" capability | Hard fail | (live-tree check; a capability with no spec fails) |

**Note:** L1-6 is the **only advisory check** — it emits warnings but never sets `ok: false`. All others are **gate-hard-fail**.

---

## 4. The Planted-Violation Guarantee (DoD #1)

Every L1 check (except L1-6, which is advisory and asserts warnings) has **TWO permanent automated assertions**:

1. **Good input → `ok: true`**: The check accepts valid input (e.g., the real `spec-finalizer` skill, real `hooks.json`).
2. **Planted-bad input → `ok: false`**: The check **rejects** a deliberately-bad fixture from `tests/fixtures/`.

This is the **DoD #1 guarantee**: "the check actually fails on a violation" is not a manual review step — it's a permanent automated assertion in `tests/unit/unit.mjs`.

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
3. Add BOTH a good-input assertion and a planted-bad assertion to `tests/unit/unit.mjs`.
4. Wire the check into the live-tree scan in `tests/integration/integration.mjs`.
5. Update the coverage map section in `tests/unit/unit.mjs` to include the new check ID.
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

3. **Add unit tests** to `tests/unit/unit.mjs`:
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

4. **Wire into integration** (`tests/integration/integration.mjs`):
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

5. **Update the coverage map** in `tests/unit/unit.mjs` to include `'L1-X'` in the `coveredChecks` array.

6. **Update this README** (the L1 checks table and fixture mapping).

---

## 6. Regression Runbook

There is **no separate regression runner**. When a skill misbehaves in real use (e.g.,
`spec-finalizer` produces an invalid spec, `code-reviewer` misses a bug, `implementation-planner`
generates non-atomic tasks), capture the failure as a **normal eval case** and let the existing
eval suite guard against it:

1. **Capture the repro as an eval case.** Add it as a new entry in the responsible capability's
   spec (`tests/e2e/evals/specs/<skill>/evals.json`). If it doesn't map cleanly to one capability,
   drop it under `tests/e2e/evals/specs/_regressions/` (an append-only place to park such cases).
   The entry uses the same per-case shape as any other eval (prompt + fixture + tiered
   expectations + optional assertions).

2. **Prove it fails.** Run `pnpm test:evals` and confirm the new case grades RED for the right
   reason — i.e., the skill produces the buggy output. This proves the case captures the real
   defect.

3. **Fix the skill** (edit the `SKILL.md` prompt, adjust capability contracts, etc.).

4. **Re-run `pnpm test:evals`** and confirm the case now grades GREEN.

5. **Commit the new case alongside the fix.** The case is now **permanent and append-only** —
   never delete or edit existing regression cases.

The `_regressions/` directory is therefore just an **append-only folder** for regression eval
entries; it has no runner of its own and is graded by `pnpm test:evals` like any other spec. See
[`_regressions/README.md`](e2e/evals/specs/_regressions/README.md).

---

## 7. Test Architecture Notes

### Why zero-dependency for Layer 1?

Layer-1 tests (L1-1 through L1-12) are **pure Node ESM with zero npm packages** for three reasons:

1. **Zero supply-chain risk** — no transitive dependencies, no `npm audit` alerts, no version conflicts with the main plugin's dependencies.
2. **Instant cold-start** — no `npm install` latency, no `node_modules/` bloat. Tests run in <100ms even on a fresh clone.
3. **Discipline alignment** — mirrors `plugins/arcus/scripts/tests/checkpoint.test.sh` (Bash-native, no external tools). Static checks should be **boring and fast**, never a maintenance bottleneck.

The Layer-4 trigger runner is held to the same zero-dependency discipline. The Layer-2 eval
runner is also dependency-free Node ESM; it does its grading by shelling out to the `claude` CLI
rather than pulling in an SDK.

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

## 8. Contributing

When adding new L1 checks, evals, or test harness features:

1. **Follow the planted-violation guarantee** (§4) — every check MUST have both good and bad fixtures.
2. **Keep Layer 1 zero-dependency** — no npm packages in `tests/lib/`, `tests/unit/unit.mjs`, `tests/integration/integration.mjs`, or `tests/run-tests.mjs`.
3. **Update this README** — document the new check in the L1 checks table, add the fixture to the mapping, update the coverage map section reference.
4. **Run the full suite** before committing:
   ```bash
   pnpm test  # Must exit 0
   ```

When adding a new capability eval spec, lint it with `pnpm test:evals:lint` (zero tokens) and,
if you have an authenticated `claude` CLI, sanity-check it live with `pnpm test:evals`.

---

## 9. FAQ

**Q: Why not use a testing framework like Jest or Vitest?**

A: Layer-1 tests are **pure Node ESM with zero dependencies** (see §7). Adding a test framework would violate that discipline and introduce 50+ transitive dependencies. The custom `assert.mjs` module (40 lines) gives us everything we need: assertions, counters, section labels, and a clean exit-code contract.

**Q: Why are fixtures in `tests/fixtures/` instead of inline in the test files?**

A: Fixtures are **reusable across unit and integration tests** (e.g., `bad-manifest.json` is asserted in both `unit.mjs` for the check logic and `integration.mjs` for the live-tree scan). Inlining them would duplicate the fixture data and make updates error-prone.

**Q: Can I run a single L1 check in isolation?**

A: Yes — `tests/lib/checks.mjs` exports pure functions. You can import and call them directly from Node REPL or a scratch script:
```javascript
import { checkManifests } from './tests/lib/checks.mjs';
const result = checkManifests({ pluginJson: {...}, marketplaceJson: {...}, sourceResolves: true });
console.log(result);
```

**Q: Why does `tests/run-tests.mjs` spawn child processes instead of importing the tier suites directly?**

A: **Isolation** — the module-level default counter in `assert.mjs` is shared across all imports. If we imported the suites into `run-tests.mjs`, their counters would collide. Spawning them as separate processes gives each suite a clean counter and clean exit code (0 = green, non-zero = red).

**Q: What happens if I add a new skill but forget to add L1 tests for it?**

A: **Integration tests catch it automatically** — `tests/integration/integration.mjs` walks the live tree (`walkSkills()`) and applies all L1 checks to every skill. If the new skill is a capability, L1-12 also requires it to own an eval spec. If the new skill violates any check, integration fails. You don't need to manually wire the new skill into tests (unless it's a new check that didn't exist before).
