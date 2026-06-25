#!/usr/bin/env node
// ARCUS Layer-2 EVAL HARNESS.
//
// Drives behavioural evals for ARCUS skills. Each skill owns a spec at
//   tests/e2e/evals/specs/<skill>/evals.json
// describing a set of eval cases (prompt + fixture + tiered expectations +
// optional contractual-token assertions).
//
// MODEL INVOCATION: this runner shells out to the already-authenticated
// `claude` CLI — there is NO API-key env var and NO offline/dry-run mode. The only
// precondition is that the `claude` binary is on PATH. Cost is bounded per-eval by a
// DOLLAR budget passed to the CLI (`--max-budget-usd`), mirroring
// https://github.com/alexanderop/afk/blob/main/tests/e2e/evals/run-evals.ts
//
// These evals are LLM-token-COSTLY. They are NOT part of `pnpm test` (the fast,
// zero-token Layer-1 gate). Run them manually / pre-release:  pnpm test:evals
// To run a single skill's evals (e.g. a newly authored skill before pushing):
//   ARCUS_EVAL_SKILL=<skill-name> pnpm test:evals
//
// What it does:
//   1. Discovers + loads every spec.
//   2. LINTS each spec (PR-2 no-naked-substrings-off-allowlist; PR-4 tier every
//      expectation; file-assertion shape). Lint runs with zero model calls.
//   3. Runs each case `ARCUS_EVAL_TRIALS` times via the `claude` CLI inside a throwaway
//      git project, captures the stream-json event log, and reduces it to a TRANSCRIPT
//      (assistant prose + tool calls + final result). Grades each trial by BOTH its
//      kind-specific grade (judged | deterministic | routing, over the transcript) AND
//      its file-system assertions (required_files / required_file_substrings /
//      unchanged_files) against the project the skill operated on.
//   4. Applies tiered thresholds (PR-4: critical gates hard ~100%, quality uses a
//      mean-score threshold) and trial/flaky classification (PR-3).
//   5. Tracks dollar cost per run; a case over its dollar budget fails. Persists
//      forensic artifacts (raw event log, result text, project copy) under ARCUS_EVAL_OUT_DIR.
//
// CLI: node run-evals.mjs [--lint-only]
//   --lint-only   lint every spec and exit (zero model calls) — handy in CI.
//
// Zero npm dependencies — Node ESM + node: builtins only.

import { readdirSync, statSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolve(__dirname, 'specs');
const REPO_ROOT = resolve(__dirname, '../../..');
const PLUGIN_DIR = resolve(REPO_ROOT, 'plugins/arcus');

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

// Cap on the transcript length handed to the judge (chars).
const TRANSCRIPT_CHAR_LIMIT = 20000;

// ---------------------------------------------------------------------------
// Env knobs
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
  timeoutSeconds: Math.max(30, intEnv('ARCUS_EVAL_TIMEOUT_SECONDS', 300)),
  // Dollar budgets handed to the CLI. The skill run is the costly half;
  // the judge runs a cheaper model.
  maxBudgetUsd: process.env.ARCUS_EVAL_MAX_BUDGET_USD || '0.50',
  judgeBudgetUsd: process.env.ARCUS_EVAL_JUDGE_BUDGET_USD || '0.10',
  judgeModel: process.env.ARCUS_EVAL_JUDGE_MODEL || null,
  skillFilter: process.env.ARCUS_EVAL_SKILL || null,
  idFilter: process.env.ARCUS_EVAL_ID || null,
  // Where to persist forensic artifacts (raw event log, result text, project copy).
  outDir: process.env.ARCUS_EVAL_OUT_DIR || join(tmpdir(), `arcus-evals-${process.pid}`)
};

/** Is the `claude` CLI on PATH? (afk's only precondition.) */
function claudeAvailable() {
  const res = spawnSync('claude', ['--version'], { encoding: 'utf-8' });
  return res.status === 0 || (res.stdout || '').length > 0;
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

    // File-system assertions (optional, allowed for any skill): shape validation only.
    const fa = ev.assertions || {};
    if (fa.required_files !== undefined && !Array.isArray(fa.required_files)) {
      errors.push(`${tag}: assertions.required_files must be an array of paths`);
    }
    if (fa.unchanged_files !== undefined && !Array.isArray(fa.unchanged_files)) {
      errors.push(`${tag}: assertions.unchanged_files must be an array of paths`);
    }
    if (fa.required_file_substrings !== undefined) {
      const rfs = fa.required_file_substrings;
      if (typeof rfs !== 'object' || rfs === null || Array.isArray(rfs)) {
        errors.push(`${tag}: assertions.required_file_substrings must be an object of path -> string[]`);
      } else {
        for (const [k, v] of Object.entries(rfs)) {
          if (!Array.isArray(v)) errors.push(`${tag}: assertions.required_file_substrings["${k}"] must be an array`);
        }
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Grading modes (each grades a single output string for one case)
// ---------------------------------------------------------------------------

/**
 * deterministic — grade purely by assertions (required/forbidden substrings).
 * Used by contractual-token skills. Returns { graded:true, passed, score(0|100), detail }.
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
 * routing — code-graded expect/forbid over substrings. Identical mechanics to
 * deterministic, but semantically used for routing decisions (which subagent/stage
 * was selected) rather than contractual tokens. Kept separate so the policy layer
 * can treat them differently later.
 */
function gradeRouting(ev, output) {
  return gradeDeterministic(ev, output);
}

/**
 * judged — invoke the LLM judge (a cheaper `claude --model <judge>` run) over the
 * tiered expectations and parse a per-expectation pass/score. The judge is asked to
 * emit a strict JSON object. Returns { graded, passed, score, detail, perExpectation, cost }.
 *
 * `runClaude` is injectable for testing; defaults to the real CLI invocation.
 */
function gradeJudged(ev, output, { runClaude = runClaudeCli } = {}) {
  const judgePrompt = buildJudgePrompt(ev, output);
  const args = ['-p', judgePrompt, '--permission-mode', 'bypassPermissions', '--max-budget-usd', ENV.judgeBudgetUsd];
  if (ENV.judgeModel) args.push('--model', ENV.judgeModel);

  const res = runClaude(args);
  if (!res.ok) {
    return { graded: false, passed: false, score: 0, detail: `judge invocation failed: ${res.error}`, cost: res.cost || 0 };
  }
  const parsed = parseJudgeVerdict(res.stdout, ev);
  return { ...parsed, cost: res.cost || 0 };
}

/** Build the judge prompt: score each tiered expectation, return strict JSON. */
function buildJudgePrompt(ev, output) {
  const lines = [
    'You are an impartial evaluation judge. You are given a SKILL OUTPUT and a list of',
    'EXPECTATIONS. For each expectation, decide if the output satisfies it and give a',
    'score 0-100. Respond with ONLY a JSON object of the form:',
    '{"expectations":[{"index":0,"passed":true,"score":100}, ...]}',
    'No prose, no code fences — just the JSON.',
    '',
    '=== SKILL OUTPUT ===',
    String(output || ''),
    '',
    '=== EXPECTATIONS ==='
  ];
  ev.expectations.forEach((exp, i) => lines.push(`[${i}] (${exp.tier}) ${exp.text}`));
  return lines.join('\n');
}

/** Parse the judge's JSON verdict and apply tiered thresholds. */
function parseJudgeVerdict(stdout, ev) {
  let verdict;
  try {
    const match = String(stdout).match(/\{[\s\S]*\}/);
    verdict = JSON.parse(match ? match[0] : stdout);
  } catch (err) {
    return { graded: false, passed: false, score: 0, detail: `unparseable judge output: ${err.message}` };
  }
  const byIndex = new Map((verdict.expectations || []).map(e => [e.index, e]));
  const gradeFn = (exp) => {
    const i = ev.expectations.indexOf(exp);
    const v = byIndex.get(i) || {};
    return { passed: Boolean(v.passed), score: typeof v.score === 'number' ? v.score : (v.passed ? 100 : 0) };
  };
  const tiered = applyTieredThresholds(ev.expectations, gradeFn, ENV.scoreThreshold);
  return {
    graded: true,
    passed: tiered.passed,
    score: tiered.qualityMean,
    detail: `critical=${tiered.criticalPassed ? 'pass' : 'FAIL'} qualityMean=${tiered.qualityMean.toFixed(1)} (>=${tiered.threshold})`,
    perExpectation: ev.expectations.map((exp, i) => ({ index: i, ...gradeFn(exp) }))
  };
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
// Dollar-cost budget
// ---------------------------------------------------------------------------

/**
 * Check accumulated dollar cost against the spec's cost_budget.max_usd (if any).
 * Returns { within, errors:string[] }.
 */
function checkCostBudget(costUsd, budget) {
  const errors = [];
  if (!budget || typeof budget !== 'object') return { within: true, errors };
  if (typeof budget.max_usd === 'number' && costUsd > budget.max_usd) {
    errors.push(`cost $${costUsd.toFixed(4)} exceeds budget $${budget.max_usd}`);
  }
  return { within: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Stream-json transcript reduction (pure)
// ---------------------------------------------------------------------------

/** Parse a JSONL string into an array of event objects, skipping unparseable lines. */
function parseJsonl(raw) {
  return String(raw)
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

/** Concatenate the assistant's text blocks from a stream-json event array. */
function collectAssistantText(events) {
  return events
    .filter((e) => e && e.type === 'assistant')
    .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : []))
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
}

/** Summarize tool calls (name + a short argument hint) from a stream-json event array. */
function collectToolCalls(events) {
  return events
    .filter((e) => e && e.type === 'assistant')
    .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : []))
    .filter((c) => c && c.type === 'tool_use' && typeof c.name === 'string')
    .map((c) => {
      const input = c.input || {};
      const hint = input.file_path ?? input.path ?? input.pattern ?? input.command ?? input.prompt ?? input.description;
      const hintText = typeof hint === 'string' ? hint.slice(0, 120) : '';
      return hintText ? `${c.name}(${hintText})` : c.name;
    });
}

/** Build a graded transcript (assistant prose + tool calls + final result), length-capped. */
function buildTranscript(assistantText, toolCalls, resultText) {
  const parts = [assistantText];
  if (toolCalls && toolCalls.length > 0) {
    parts.push(`Tools used:\n${toolCalls.map((c) => `- ${c}`).join('\n')}`);
  }
  if (resultText) parts.push(`Final result:\n${resultText}`);
  const transcript = parts.filter(Boolean).join('\n\n');
  return transcript.length > TRANSCRIPT_CHAR_LIMIT
    ? `${transcript.slice(0, TRANSCRIPT_CHAR_LIMIT)}\n…[truncated]`
    : transcript;
}

/** Wrap the case prompt with an eval-mode instruction so the run is gradeable. */
function buildSkillPrompt(ev) {
  return `${ev.prompt}\n\nEval mode: follow the skill normally. Include enough detail in your ` +
    `final response for the eval assertions to verify what happened. Do not edit files ` +
    `outside this temporary eval project.`;
}

// ---------------------------------------------------------------------------
// claude CLI invocation
// ---------------------------------------------------------------------------

/**
 * Invoke the `claude` CLI once in `--print --output-format json` mode and parse the
 * structured envelope. Returns { ok, stdout, cost, error } where `stdout` is the
 * model's RESULT TEXT (the `.result` field) — the thing graders should inspect, not
 * the raw JSON envelope. `cost` is the reported `total_cost_usd`. This is the single
 * seam shelling out to the live model.
 *
 * Callers pass the base args (prompt + flags); `--output-format json` is appended
 * here so every invocation is parseable. The CLI also flags `is_error`/non-success
 * subtypes (e.g. budget exceeded), which we surface as a failed run.
 */
function runClaudeCli(args, { cwd } = {}) {
  const fullArgs = [...args, '--output-format', 'json'];
  const res = spawnSync('claude', fullArgs, {
    cwd: cwd || process.cwd(),
    encoding: 'utf-8',
    input: '', // close stdin (equivalent to `< /dev/null`) — the CLI otherwise waits
               // for piped stdin in --print mode and warns/alters behaviour.
    timeout: ENV.timeoutSeconds * 1000,
    maxBuffer: 64 * 1024 * 1024
  });
  if (res.error) return { ok: false, stdout: '', cost: 0, error: res.error.message };
  if (res.status !== 0) {
    return { ok: false, stdout: res.stdout || '', cost: extractCost(res.stdout), error: `exit ${res.status}: ${(res.stderr || '').slice(0, 200)}` };
  }
  const env = parseEnvelope(res.stdout);
  if (!env.ok) return { ok: false, stdout: '', cost: 0, error: env.error };
  return { ok: true, stdout: env.result, cost: env.cost, error: null };
}

/**
 * Parse the `--output-format json` envelope. Returns { ok, result, cost, error }.
 * `result` is the model's final text (`.result`); `cost` is `total_cost_usd`.
 */
function parseEnvelope(stdout) {
  let obj;
  try {
    obj = JSON.parse(String(stdout));
  } catch (err) {
    return { ok: false, result: '', cost: 0, error: `unparseable CLI envelope: ${err.message}` };
  }
  if (obj.is_error || (obj.subtype && obj.subtype !== 'success')) {
    return { ok: false, result: '', cost: extractCostObj(obj), error: `CLI reported ${obj.subtype || 'error'}${obj.api_error_status ? ` (${obj.api_error_status})` : ''}` };
  }
  return { ok: true, result: typeof obj.result === 'string' ? obj.result : '', cost: extractCostObj(obj), error: null };
}

function extractCostObj(obj) {
  return obj && typeof obj.total_cost_usd === 'number' ? obj.total_cost_usd : 0;
}

/** Best-effort parse of `total_cost_usd` from raw CLI output (error fallback). */
function extractCost(stdout) {
  const m = String(stdout).match(/"total_cost_usd"\s*:\s*([0-9.]+)/);
  return m ? Number.parseFloat(m[1]) : 0;
}

/** git-init a throwaway project and materialize the case's fixture files. Returns the dir. */
function seedProject(ev) {
  const dir = mkdtempSync(join(tmpdir(), 'arcus-eval-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  const files = (ev.fixture && ev.fixture.files) || {};
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, String(contents));
  }
  return dir;
}

/**
 * Invoke the skill via the `claude` CLI in stream-json mode and reduce the JSONL event
 * stream into the pieces graders need. Returns
 * { ok, raw, resultText, assistantText, toolCalls, cost, error }. Injectable for tests.
 */
function runSkillCli(args, { cwd } = {}) {
  const fullArgs = [...args, '--output-format', 'stream-json', '--verbose'];
  const res = spawnSync('claude', fullArgs, {
    cwd: cwd || process.cwd(),
    encoding: 'utf-8',
    input: '', // close stdin (the CLI otherwise waits for piped stdin in --print mode)
    timeout: ENV.timeoutSeconds * 1000,
    maxBuffer: 64 * 1024 * 1024
  });
  const raw = `${res.stdout || ''}${res.stderr || ''}`;
  const events = parseJsonl(res.stdout || '');
  const resultEvent = events.filter((e) => e && e.type === 'result').at(-1);
  const resultText = typeof resultEvent?.result === 'string' ? resultEvent.result : '';
  const assistantText = collectAssistantText(events);
  const toolCalls = collectToolCalls(events);
  const rawCost = Number(resultEvent?.total_cost_usd ?? 0);
  const cost = Number.isFinite(rawCost) ? rawCost : 0;
  if (res.error) return { ok: false, raw, resultText, assistantText, toolCalls, cost, error: res.error.message };
  if (res.status !== 0) return { ok: false, raw, resultText, assistantText, toolCalls, cost, error: `claude exited ${res.status}` };
  if (resultEvent?.is_error === true) {
    return { ok: false, raw, resultText, assistantText, toolCalls, cost, error: `claude reported is_error: ${resultText.slice(0, 200)}` };
  }
  return { ok: true, raw, resultText, assistantText, toolCalls, cost, error: null };
}

/**
 * Grade the file-system effects of a skill run against the project dir it operated on.
 * Supports required_files, required_file_substrings, and unchanged_files. Returns
 * { passed, errors }.
 */
function gradeFileAssertions(ev, projectDir) {
  const a = ev.assertions || {};
  const errors = [];
  for (const f of a.required_files || []) {
    if (!existsSync(join(projectDir, f))) errors.push(`missing required file '${f}'`);
  }
  for (const [f, subs] of Object.entries(a.required_file_substrings || {})) {
    const full = join(projectDir, f);
    const content = existsSync(full) ? readFileSync(full, 'utf-8') : null;
    for (const s of subs) {
      if (content === null) errors.push(`'${f}' not created (needed '${s}')`);
      else if (!content.includes(s)) errors.push(`'${f}' missing '${s}'`);
    }
  }
  for (const f of a.unchanged_files || []) {
    const expected = ev.fixture && ev.fixture.files ? ev.fixture.files[f] : undefined;
    const full = join(projectDir, f);
    const actual = existsSync(full) ? readFileSync(full, 'utf-8') : undefined;
    if (!(typeof expected === 'string' && actual === expected)) errors.push(`'${f}' was modified or removed`);
  }
  return { passed: errors.length === 0, errors };
}

/** Persist forensic artifacts for one trial: raw event stream, result text, project copy. */
function persistArtifacts(caseDir, suffix, run, projectDir) {
  try {
    mkdirSync(caseDir, { recursive: true });
    writeFileSync(join(caseDir, `raw${suffix}.jsonl`), run.raw || '');
    writeFileSync(join(caseDir, `result${suffix}.txt`), run.resultText || '');
    cpSync(projectDir, join(caseDir, `project${suffix}`), { recursive: true });
  } catch {
    // artifacts are best-effort; never fail a run because we couldn't write them.
  }
}

// ---------------------------------------------------------------------------
// Case runner
// ---------------------------------------------------------------------------

/**
 * Run a single eval case `ENV.trials` times via the `claude` CLI. Each trial is graded by
 * BOTH its kind-specific grade (judged|deterministic|routing, over the transcript) AND its
 * file-system assertions against the project the skill operated on. Classifies the
 * pass-rate and checks the dollar budget. `runSkill`/`runClaude` are injectable for tests.
 */
function runCase(spec, ev, { runSkill = runSkillCli, runClaude = runClaudeCli } = {}) {
  let passes = 0;
  let costUsd = 0;
  const trialDetails = [];
  const caseDir = join(ENV.outDir, spec.skill_name, ev.id);
  const budget = typeof ev.max_budget_usd === 'number' ? String(ev.max_budget_usd) : ENV.maxBudgetUsd;

  for (let t = 0; t < ENV.trials; t++) {
    const suffix = ENV.trials > 1 ? `.trial${t + 1}` : '';
    // The fixture IS the project the skill operates on (afk-style throwaway git repo):
    // run with cwd=projectDir so the skill sees the fixture as its working tree.
    const projectDir = seedProject(ev);
    try {
      const args = [
        '-p', buildSkillPrompt(ev),
        '--plugin-dir', PLUGIN_DIR,
        '--setting-sources', 'project',
        '--permission-mode', 'bypassPermissions',
        '--max-budget-usd', budget
      ];
      const run = runSkill(args, { cwd: projectDir });
      costUsd += run.cost || 0;
      persistArtifacts(caseDir, suffix, run, projectDir);
      if (!run.ok) {
        trialDetails.push(`trial ${t}: skill run failed (${run.error})`);
        continue;
      }
      const transcript = buildTranscript(run.assistantText, run.toolCalls, run.resultText);
      const assertionText = `${run.assistantText}\n${run.resultText}`;
      const graded = ev.kind === 'judged'
        ? gradeJudged(ev, transcript, { runClaude })
        : (ev.kind === 'routing' ? gradeRouting(ev, assertionText) : gradeDeterministic(ev, assertionText));
      costUsd += graded.cost || 0;
      const fileRes = gradeFileAssertions(ev, projectDir);
      const trialPassed = graded.passed && fileRes.passed;
      if (trialPassed) passes++;
      const detail = [graded.detail, fileRes.passed ? '' : `files: ${fileRes.errors.join(', ')}`]
        .filter(Boolean).join('; ');
      trialDetails.push(`trial ${t}: ${trialPassed ? 'pass' : 'fail'} (${detail})`);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }

  const passRate = passes / ENV.trials;
  const state = classify(passRate);
  const budgetCheck = checkCostBudget(costUsd, spec.cost_budget);
  const withinBudget = budgetCheck.within;

  return {
    id: ev.id,
    kind: ev.kind,
    state: withinBudget ? state : 'fail',
    passRate,
    passes,
    trials: ENV.trials,
    costUsd,
    withinBudget,
    budgetErrors: budgetCheck.errors,
    trialDetails
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = { lintOnly: false };
  for (const arg of argv) {
    if (arg === '--lint-only') flags.lintOnly = true;
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
  log(`mode: ${flags.lintOnly ? 'LINT-ONLY (zero model calls)' : 'EXECUTE (claude CLI)'}` +
      ` | trials=${ENV.trials} | score-threshold=${ENV.scoreThreshold}` +
      ` | budget/run=$${ENV.maxBudgetUsd} judge=$${ENV.judgeBudgetUsd}` +
      ` | judge-model=${ENV.judgeModel || '(cli default)'}`);
  if (ENV.skillFilter) log(`filter: skill=${ENV.skillFilter}`);
  if (ENV.idFilter) log(`filter: id=${ENV.idFilter}`);

  const specFiles = discoverSpecs();
  log(`\nDiscovered ${specFiles.length} spec(s) under ${SPECS_DIR}`);

  // --- Lint every spec first (zero model calls). ---
  const loaded = [];
  let lintFailures = 0;
  for (const { skill, path } of specFiles) {
    const res = loadSpec(path);
    if (!res.ok) {
      log(`\n--- spec: ${skill} ---\n  LINT FAIL: cannot parse JSON: ${res.error}`);
      lintFailures++;
      continue;
    }
    const lint = lintSpec(res.value);
    if (!lint.ok) {
      log(`\n--- spec: ${skill} ---\n  LINT FAIL:`);
      for (const e of lint.errors) log(`    - ${e}`);
      lintFailures++;
      continue;
    }
    loaded.push({ skill, spec: res.value });
  }

  if (lintFailures > 0) {
    log(`\nRESULT: ${lintFailures} spec(s) failed lint — exiting non-zero.`);
    process.exit(1);
  }
  log(`lint: OK for all ${loaded.length} spec(s).`);

  if (flags.lintOnly) {
    log('\nRESULT: --lint-only — all specs lint clean. Exiting 0.');
    process.exit(0);
  }

  // --- Execute against the live claude CLI. ---
  if (!claudeAvailable()) {
    log('\nERROR: the `claude` CLI is not on PATH. Layer-2 evals run the live CLI.' +
        ' Install/authenticate `claude`, or use --lint-only. Exiting non-zero.');
    process.exit(1);
  }

  log(`artifacts: ${ENV.outDir}`);

  let caseCount = 0;
  let failures = 0;
  let flaky = 0;
  let totalCostUsd = 0;

  for (const { skill, spec } of loaded) {
    let printedHeader = false;
    for (const ev of spec.evals) {
      if (!matchesFilters(spec, ev)) continue;
      if (!printedHeader) { log(`\n--- spec: ${skill} ---`); printedHeader = true; }
      caseCount++;
      const result = runCase(spec, ev);
      totalCostUsd += result.costUsd;
      if (result.state === 'FLAKY') flaky++;
      if (result.state !== 'pass') failures++;
      const budgetNote = result.withinBudget ? '' : ` [OVER BUDGET: ${result.budgetErrors.join('; ')}]`;
      log(`  [${result.kind}] ${result.id}: ${result.state} ` +
          `(${result.passes}/${result.trials} trials, $${result.costUsd.toFixed(4)})${budgetNote}`);
      for (const d of result.trialDetails) log(`      ${d}`);
    }
  }

  log('\n' + '='.repeat(64));
  log(`Cases: ${caseCount} | failures: ${failures} | flaky: ${flaky} | cost: $${totalCostUsd.toFixed(4)}`);
  if (failures > 0) {
    log('RESULT: eval failures detected — exiting non-zero.');
    process.exit(1);
  }
  log('RESULT: all eval cases passed. Exiting 0.');
  process.exit(0);
}

// Export pure pieces for unit testing; run main() only when invoked directly.
export {
  lintSpec,
  gradeDeterministic,
  gradeRouting,
  gradeJudged,
  buildJudgePrompt,
  parseJudgeVerdict,
  applyTieredThresholds,
  classify,
  checkCostBudget,
  discoverSpecs,
  loadSpec,
  parseJsonl,
  collectAssistantText,
  collectToolCalls,
  buildTranscript,
  buildSkillPrompt,
  gradeFileAssertions,
  CONTRACTUAL_TOKEN_ALLOWLIST
};

const invokedDirectly = resolve(process.argv[1] || '') === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main();
}
