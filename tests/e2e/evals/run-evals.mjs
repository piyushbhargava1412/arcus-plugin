#!/usr/bin/env node
// ARCUS Layer-2 EVAL HARNESS (zero-dependency, offline-capable).
//
// Drives behavioural evals for ARCUS skills. Each skill owns a spec at
//   tests/e2e/evals/specs/<skill>/evals.json
// describing a set of eval cases (prompt + fixture + tiered expectations +
// optional contractual-token assertions). This runner:
//
//   1. Discovers + loads every spec.
//   2. LINTS each spec (PR-2 no-naked-substrings-off-allowlist; PR-4 tier every
//      expectation).
//   3. Grades each case via one of three modes: judged | deterministic | routing.
//   4. Applies tiered thresholds (PR-4: critical gates hard ~100%, quality uses a
//      mean-score threshold) and trial/flaky classification (PR-3).
//   5. Captures cost (PR-7: tokens + duration; a case over its cost_budget fails).
//
// OFFLINE / --dry-run: NO network, NO API key required. The runner validates +
// lints every discovered spec, reports each case as `red (not yet run)`, and
// EXITS 0 on validation success (non-zero only on a lint failure). Real eval
// execution against an LLM judge is DEFERRED — see ARCUS-TESTING-DEFERRED.md.
//
// CLI: node run-evals.mjs [--dry-run] [--rebaseline]
//
// Zero npm dependencies — Node ESM + node: builtins only.

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolve(__dirname, 'specs');
const DEFERRED_DOC = 'ARCUS-TESTING-DEFERRED.md';

// ---------------------------------------------------------------------------
// Constants / policy
// ---------------------------------------------------------------------------

// PR-2 + PR-4: contractual-token skills are the ONLY skills allowed to declare
// `assertions.required_substrings`. These emit fixed contractual tokens:
//   - simplify-and-verify        -> SIMPLIFIED | REVERTED
//   - spec-compliance-reviewer   -> VERDICT: PASS | VERDICT: FAIL
const CONTRACTUAL_TOKEN_ALLOWLIST = new Set([
  'simplify-and-verify',
  'spec-compliance-reviewer'
]);

const VALID_MODES = new Set(['autonomous', 'dialogue']);
const VALID_KINDS = new Set(['judged', 'deterministic', 'routing']);
// Expectation tiers (PR-4). Named EVAL_TIERS to avoid confusion with skill-layer
// VALID_TIERS in tests/lib/skills.mjs — a different concept (capability/coordinator/...).
const EVAL_TIERS = new Set(['critical', 'quality']);

// FLAKY band (PR-3): pass-rate strictly inside [0.4, 0.7] is FLAKY.
const FLAKY_LOW = 0.4;
const FLAKY_HIGH = 0.7;

// ---------------------------------------------------------------------------
// Env knobs (Appendix A)
// ---------------------------------------------------------------------------

function intEnv(name, def) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
}

const ENV = {
  trials: Math.max(1, intEnv('ARCUS_EVAL_TRIALS', 3)),
  scoreThreshold: intEnv('ARCUS_EVAL_SCORE_THRESHOLD', 70),
  judgeModel: process.env.ARCUS_EVAL_JUDGE_MODEL || null,
  skillFilter: process.env.ARCUS_EVAL_SKILL || null,
  idFilter: process.env.ARCUS_EVAL_ID || null
};

// A judge is "available" only when an API key is present in the environment.
// In dry-run we never look at this; without --dry-run and without a key we
// defer rather than attempt any network call.
function judgeAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ARCUS_EVAL_API_KEY);
}

// ---------------------------------------------------------------------------
// Spec discovery + loading
// ---------------------------------------------------------------------------

/** Discover every specs/<skill>/evals.json under SPECS_DIR. Returns [{ skill, path }]. */
function discoverSpecs() {
  const found = [];
  let entries;
  try {
    entries = readdirSync(SPECS_DIR);
  } catch {
    return found;
  }
  for (const entry of entries) {
    const dir = join(SPECS_DIR, entry);
    let st;
    try {
      st = statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (entry.startsWith('_') || entry.startsWith('.')) continue; // _regressions etc.
    const specPath = join(dir, 'evals.json');
    try {
      if (statSync(specPath).isFile()) {
        found.push({ skill: entry, path: specPath });
      }
    } catch {
      // no evals.json in this folder — skip
    }
  }
  return found;
}

/** Read + JSON-parse a spec file. Returns { ok, value|error }. */
function loadSpec(path) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, 'utf-8')) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// PR-2 + PR-4: spec lint
// ---------------------------------------------------------------------------

/**
 * Lint a single spec object. Returns { ok, errors: string[] }.
 *
 * REJECTS:
 *  (PR-2) assertions.required_substrings non-empty on a skill NOT in the
 *         contractual-token allowlist.
 *  (PR-4) any expectation missing a `tier`.
 * Also validates baseline structure (skill_name, evals[], mode, kind, tiers).
 */
function lintSpec(spec) {
  const errors = [];

  if (!spec || typeof spec !== 'object') {
    return { ok: false, errors: ['spec is not an object'] };
  }
  if (typeof spec.skill_name !== 'string' || spec.skill_name.length === 0) {
    errors.push('spec missing string "skill_name"');
  }
  const skill = spec.skill_name;
  const allowlisted = CONTRACTUAL_TOKEN_ALLOWLIST.has(skill);

  if (spec.cost_budget !== undefined) {
    const cb = spec.cost_budget;
    if (typeof cb !== 'object' || cb === null) {
      errors.push('cost_budget must be an object when present');
    }
  }

  if (!Array.isArray(spec.evals) || spec.evals.length === 0) {
    errors.push('spec "evals" must be a non-empty array');
    return { ok: errors.length === 0, errors };
  }

  spec.evals.forEach((ev, i) => {
    const tag = `eval[${i}]${ev && ev.id ? ` (${ev.id})` : ''}`;
    if (!ev || typeof ev !== 'object') {
      errors.push(`${tag}: not an object`);
      return;
    }
    if (typeof ev.id !== 'string' || ev.id.length === 0) {
      errors.push(`${tag}: missing string "id"`);
    }
    if (typeof ev.prompt !== 'string' || ev.prompt.length === 0) {
      errors.push(`${tag}: missing string "prompt"`);
    }
    if (!VALID_MODES.has(ev.mode)) {
      errors.push(`${tag}: invalid mode "${ev.mode}" (expected autonomous|dialogue)`);
    }
    if (!VALID_KINDS.has(ev.kind)) {
      errors.push(`${tag}: invalid kind "${ev.kind}" (expected judged|deterministic|routing)`);
    }

    // PR-4: every expectation must carry a tier.
    if (!Array.isArray(ev.expectations) || ev.expectations.length === 0) {
      errors.push(`${tag}: "expectations" must be a non-empty array`);
    } else {
      ev.expectations.forEach((exp, j) => {
        if (!exp || typeof exp !== 'object') {
          errors.push(`${tag}: expectation[${j}] is not an object`);
          return;
        }
        if (typeof exp.text !== 'string' || exp.text.length === 0) {
          errors.push(`${tag}: expectation[${j}] missing "text"`);
        }
        if (exp.tier === undefined) {
          errors.push(`${tag}: expectation[${j}] missing required "tier" (PR-4)`);
        } else if (!EVAL_TIERS.has(exp.tier)) {
          errors.push(`${tag}: expectation[${j}] invalid tier "${exp.tier}" (expected critical|quality)`);
        }
      });
    }

    // PR-2: required_substrings only allowed for contractual-token skills.
    const req = ev.assertions && ev.assertions.required_substrings;
    if (Array.isArray(req) && req.length > 0 && !allowlisted) {
      errors.push(
        `${tag}: assertions.required_substrings is set but "${skill}" is not a ` +
        `contractual-token skill (PR-2: naked substrings allowed only for ` +
        `${[...CONTRACTUAL_TOKEN_ALLOWLIST].join(', ')})`
      );
    }
  });

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Grading modes (each grades a single output string for one case)
// ---------------------------------------------------------------------------

/**
 * deterministic — grade purely by assertions (required/forbidden substrings).
 * Offline-capable; used by contractual-token skills. Returns
 *   { graded:true, passed, score(0|100), detail }.
 */
function gradeDeterministic(ev, output) {
  const a = ev.assertions || {};
  const req = Array.isArray(a.required_substrings) ? a.required_substrings : [];
  const forb = Array.isArray(a.forbidden_substrings) ? a.forbidden_substrings : [];
  const text = typeof output === 'string' ? output : '';
  const missing = req.filter(s => !text.includes(s));
  const present = forb.filter(s => text.includes(s));
  const passed = missing.length === 0 && present.length === 0;
  const detail = passed
    ? 'all required present, no forbidden present'
    : `missing=[${missing.join(', ')}] forbidden-present=[${present.join(', ')}]`;
  return { graded: true, passed, score: passed ? 100 : 0, detail };
}

/**
 * routing — code-graded expect/forbid over substrings. Offline-capable.
 * Identical mechanics to deterministic, but semantically used for routing
 * decisions (e.g. which subagent/stage was selected) rather than contractual
 * tokens. Kept separate so the policy layer can treat them differently later.
 */
function gradeRouting(ev, output) {
  return gradeDeterministic(ev, output);
}

/**
 * judged — would call an LLM judge over tiered expectations. OFFLINE this does
 * NOT call out: it validates structure only and reports the case as not-yet-run.
 * When a judge becomes available (later story) this returns per-expectation
 * scores. Here it returns { graded:false } so the policy layer marks it red.
 */
function gradeJudged(ev, output, { dryRun }) {
  if (dryRun || !judgeAvailable()) {
    return { graded: false, passed: false, score: 0, detail: 'judge not run (offline / dry-run)' };
  }
  // Real judge invocation is DEFERRED (see ARCUS-TESTING-DEFERRED.md). We never
  // reach here in this story because the CLI defers before grading when no
  // judge is available.
  throw new Error('judged grading requires an LLM judge — execution is deferred');
}

// ---------------------------------------------------------------------------
// Tiered thresholds (PR-4)
// ---------------------------------------------------------------------------

/**
 * Apply tiered gating to a set of graded expectations for one trial.
 *   - critical: ALL must pass (hard ~100% gate).
 *   - quality : mean score must meet the threshold.
 * `gradeFn(expectation) => { passed, score }`.
 * Returns { passed, criticalPassed, qualityMean, threshold }.
 */
function applyTieredThresholds(expectations, gradeFn, threshold) {
  const critical = expectations.filter(e => e.tier === 'critical');
  const quality = expectations.filter(e => e.tier === 'quality');

  let criticalPassed = true;
  for (const exp of critical) {
    if (!gradeFn(exp).passed) {
      criticalPassed = false;
      break;
    }
  }

  let qualityMean = 100;
  if (quality.length > 0) {
    const sum = quality.reduce((acc, exp) => acc + (gradeFn(exp).score ?? 0), 0);
    qualityMean = sum / quality.length;
  }

  const passed = criticalPassed && qualityMean >= threshold;
  return { passed, criticalPassed, qualityMean, threshold };
}

// ---------------------------------------------------------------------------
// Trials + FLAKY classification (PR-3)
// ---------------------------------------------------------------------------

/**
 * Classify a pass-rate into a CI state.
 *   - passRate strictly inside (0.4, 0.7)  -> 'FLAKY'  (CI fails)
 *   - passRate >= 0.7                       -> 'pass'
 *   - otherwise                             -> 'fail'
 * The boundaries 0.4 and 0.7 themselves are decisive (not flaky).
 */
function classify(passRate) {
  if (passRate > FLAKY_LOW && passRate < FLAKY_HIGH) return 'FLAKY';
  if (passRate >= FLAKY_HIGH) return 'pass';
  return 'fail';
}

// ---------------------------------------------------------------------------
// Cost capture (PR-7)
// ---------------------------------------------------------------------------

/**
 * Check a captured cost against the spec's cost_budget. Returns
 *   { within, errors:string[] }. In dry-run, cost is { tokens:0, seconds:0 }
 * so this always passes.
 */
function checkCostBudget(cost, budget) {
  const errors = [];
  if (!budget || typeof budget !== 'object') return { within: true, errors };
  if (typeof budget.max_tokens === 'number' && cost.tokens > budget.max_tokens) {
    errors.push(`tokens ${cost.tokens} exceed budget ${budget.max_tokens}`);
  }
  if (typeof budget.max_seconds === 'number' && cost.seconds > budget.max_seconds) {
    errors.push(`duration ${cost.seconds}s exceeds budget ${budget.max_seconds}s`);
  }
  return { within: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Case runner
// ---------------------------------------------------------------------------

/**
 * Run a single eval case. In dry-run / offline this does NOT execute the skill
 * or any judge: it validates the case is gradable and reports `red (not yet run)`.
 * Returns a result record.
 */
function runCase(spec, ev, { dryRun }) {
  const cost = { tokens: 0, seconds: 0 }; // dry-run: no execution, zero cost.
  const budgetCheck = checkCostBudget(cost, spec.cost_budget);

  // deterministic + routing CAN grade offline IF an output was supplied on the
  // case (ev.sample_output). In a real run the harness would capture the skill's
  // output here; in this story no skill is executed, so there is no live output.
  // We therefore treat every case as not-yet-run (red-first) in dry-run.
  if (dryRun || !judgeAvailable()) {
    return {
      id: ev.id,
      kind: ev.kind,
      state: 'red',
      label: 'red (not yet run)',
      reason: 'offline/dry-run: skill + judge not executed',
      cost,
      withinBudget: budgetCheck.within
    };
  }

  // --- Live path (DEFERRED in this story) -------------------------------------
  // When execution lands, the harness would: run the skill `ENV.trials` times,
  // grade each trial, compute pass-rate, classify(), and apply cost budget.
  // Left intentionally unreachable here (CLI defers before this point).
  throw new Error('live eval execution is deferred — see ' + DEFERRED_DOC);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = { dryRun: false, rebaseline: false };
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--rebaseline') flags.rebaseline = true;
  }
  return flags;
}

function matchesFilters(spec, ev) {
  if (ENV.skillFilter && spec.skill_name !== ENV.skillFilter) return false;
  if (ENV.idFilter && ev.id !== ENV.idFilter) return false;
  return true;
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const log = (...a) => console.log(...a);

  log('='.repeat(64));
  log('ARCUS Layer-2 Eval Harness');
  log('='.repeat(64));
  log(`mode: ${flags.dryRun ? 'DRY-RUN (offline validation)' : 'execute'}` +
      ` | trials=${ENV.trials} | score-threshold=${ENV.scoreThreshold}` +
      ` | judge-model=${ENV.judgeModel || '(unset)'}`);
  if (ENV.skillFilter) log(`filter: skill=${ENV.skillFilter}`);
  if (ENV.idFilter) log(`filter: id=${ENV.idFilter}`);
  if (flags.rebaseline) {
    log('--rebaseline: would diff each case pass-rate against the last recorded ' +
        'baseline and rewrite it (deferred in dry-run; no baseline I/O performed).');
  }

  const specFiles = discoverSpecs();
  log(`\nDiscovered ${specFiles.length} spec(s) under ${SPECS_DIR}`);

  // Without --dry-run AND with no judge available: defer cleanly, no network.
  if (!flags.dryRun && !judgeAvailable()) {
    log('\nNo --dry-run flag and no API key available.');
    log(`Real eval execution is DEFERRED — see ${DEFERRED_DOC}.`);
    log('No network call attempted. Exiting 0.');
    process.exit(0);
  }

  let lintFailures = 0;
  let caseCount = 0;
  let redCount = 0;

  for (const { skill, path } of specFiles) {
    log(`\n--- spec: ${skill} (${path}) ---`);
    const loaded = loadSpec(path);
    if (!loaded.ok) {
      log(`  LINT FAIL: cannot parse JSON: ${loaded.error}`);
      lintFailures++;
      continue;
    }
    const spec = loaded.value;

    const lint = lintSpec(spec);
    if (!lint.ok) {
      log('  LINT FAIL:');
      for (const e of lint.errors) log(`    - ${e}`);
      lintFailures++;
      continue;
    }
    log('  lint: OK');

    for (const ev of spec.evals) {
      if (!matchesFilters(spec, ev)) continue;
      caseCount++;
      const result = runCase(spec, ev, { dryRun: flags.dryRun });
      if (result.state === 'red') redCount++;
      const budgetNote = result.withinBudget ? '' : ' [OVER BUDGET]';
      log(`  [${result.kind}] ${result.id}: ${result.label}${budgetNote}` +
          `  (cost: ${result.cost.tokens} tok / ${result.cost.seconds}s)`);
    }
  }

  log('\n' + '='.repeat(64));
  log(`Specs: ${specFiles.length} | lint failures: ${lintFailures}` +
      ` | cases: ${caseCount} | red (not yet run): ${redCount}`);

  if (lintFailures > 0) {
    log('RESULT: lint failures detected — exiting non-zero.');
    process.exit(1);
  }

  if (flags.dryRun) {
    log('RESULT: dry-run validation PASSED. All specs lint clean; all cases ' +
        'reported red-first (offline). Real execution deferred. Exiting 0.');
    process.exit(0);
  }

  // Reachable only when a judge IS available (out of scope for this story).
  log(`RESULT: live execution is deferred — see ${DEFERRED_DOC}. Exiting 0.`);
  process.exit(0);
}

// Export pure pieces for unit testing; run main() only when invoked directly.
export {
  lintSpec,
  gradeDeterministic,
  gradeRouting,
  gradeJudged,
  applyTieredThresholds,
  classify,
  checkCostBudget,
  discoverSpecs,
  loadSpec,
  CONTRACTUAL_TOKEN_ALLOWLIST
};

const invokedDirectly = resolve(process.argv[1] || '') === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main();
}
