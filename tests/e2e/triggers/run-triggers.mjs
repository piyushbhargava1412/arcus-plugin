#!/usr/bin/env node
// ARCUS Layer-4 TRIGGER-ACTIVATION runner.
//
// Tests organic skill activation: a user types a natural-language query, and the
// RIGHT skill should fire (and the wrong ones must NOT). The corpus is a set of
// { query, owner } pairs (owner = the skill that should activate, or "none").
//
// GRADING (deterministic — no LLM, no network, zero tokens):
//   Only ORGANICALLY-INVOCABLE skills can fire. Skills marked
//   `disable-model-invocation: true` (the 10 dispatched-only skills) are NEVER
//   candidates — they are invoked imperatively by an orchestrator, never by an
//   organic query. This is exactly why an adversarial near-miss like
//   "check this code for security issues" must resolve to owner "none": the
//   security-reviewer is dispatched-only, so nothing organic fires.
//
//   For each organic candidate, its `description:` trigger phrases (the quoted,
//   multi-word/placeholder phrases) are compiled into START-ANCHORED matchers.
//   `<STORY>`-style placeholders match one-or-more tokens. The matched set is every
//   candidate with a matching phrase; the "winner" (for accuracy + false-positive)
//   is the candidate whose matched phrase is the most specific (longest literal).
//
// METRICS + GATES (L4-3):
//   - activation  = positives where the expected owner is in the matched set.
//   - accuracy    = positives where the winner equals the expected owner.
//   - false-pos   = "none" queries where ANY organic skill fired.
//   Gate: activation >= 80%, false-positive <= 10%. Trials default 3, majority rule
//   (deterministic matcher => trials agree, but the knob is honoured).
//
// CORPUS VALIDATION (L4-1, L4-2) runs BEFORE grading and hard-fails on:
//   - L4-1: a dispatched-only (or unknown) skill named as a positive `owner`.
//   - L4-2: negatives (owner "none") < 40% of the corpus.
//
// This grades against each SKILL.md's declared trigger phrasing — it is intentionally
// SIMPLER and cheaper than driving a live CLI per query (afk's approach): it runs
// anywhere, for free, and is part of the everyday suite.
//
// CLI: node run-triggers.mjs
// Zero npm dependencies — Node ESM + node: builtins only.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { walkSkills, DISPATCHED_ONLY } from '../../lib/skills.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = resolve(__dirname, 'corpus.json');

// ---------------------------------------------------------------------------
// Gates + env knobs (Appendix A / L4-3)
// ---------------------------------------------------------------------------

const ACTIVATION_MIN = 80; // percent
const FALSE_POSITIVE_MAX = 10; // percent
const NEGATIVE_MIN_FRACTION = 0.4; // L4-2: >= 40% negatives

function intEnv(name, def) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
}

const ENV = {
  trials: Math.max(1, intEnv('ARCUS_TRIGGER_TRIALS', 3)),
  skillFilter: process.env.ARCUS_TRIGGER_SKILL || null,
  queryFilter: process.env.ARCUS_TRIGGER_QUERY || null
};

// ---------------------------------------------------------------------------
// Trigger-phrase extraction + matcher (pure, exported for unit testing)
// ---------------------------------------------------------------------------

/** Normalize a query/phrase literal: lowercase, non-alphanumerics -> single space. */
function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Extract trigger phrases from a skill `description`. We take every double-quoted
 * phrase that is a real trigger: multi-word OR containing a `<placeholder>`. Bare
 * single words quoted in prose (e.g. "Avoid", "agentifies") are NOT reliable
 * organic triggers and are dropped.
 */
function extractTriggerPhrases(description) {
  if (typeof description !== 'string') return [];
  const phrases = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(description)) !== null) {
    const phrase = m[1].trim();
    const hasSpace = /\s/.test(phrase);
    const hasPlaceholder = /<[^>]+>/.test(phrase);
    if (phrase.length >= 4 && (hasSpace || hasPlaceholder)) {
      phrases.push(phrase);
    }
  }
  return phrases;
}

/**
 * Compile a trigger phrase into a START-ANCHORED RegExp over a normalized query.
 * `<placeholder>` segments become a one-or-more-token wildcard. The literal weight
 * (normalized non-placeholder character count) is returned for specificity ranking.
 */
function compilePhrase(phrase) {
  // Split on <...> placeholders, keeping the literal segments.
  const segments = phrase.split(/<[^>]+>/);
  const literalParts = segments.map(s => normalize(s)).filter(s => s.length > 0);
  const literalWeight = literalParts.join('').length;

  // Rebuild the regex source preserving placeholder positions.
  const tokens = phrase.split(/(<[^>]+>)/).filter(t => t.length > 0);
  let src = '^';
  let prevWasLiteral = false;
  for (const tok of tokens) {
    if (/^<[^>]+>$/.test(tok)) {
      // placeholder: one or more normalized tokens
      src += prevWasLiteral ? '\\s+\\S+(?:\\s+\\S+)*' : '\\S+(?:\\s+\\S+)*';
      prevWasLiteral = false;
    } else {
      const norm = normalize(tok);
      if (norm.length === 0) continue;
      const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
      src += (prevWasLiteral ? '\\s+' : '') + escaped;
      prevWasLiteral = true;
    }
  }
  // Allow trailing tokens after the trigger phrase (e.g. "review ARC-7 against base").
  src += '(?:\\s|$)';
  return { regex: new RegExp(src), literalWeight, phrase };
}

/**
 * Build the organic-skill matcher table from the live skill tree (or an injected
 * skill list for tests). Returns [{ name, matchers: [{regex, literalWeight}] }],
 * EXCLUDING dispatched-only skills.
 */
function buildMatchers(skills) {
  const table = [];
  for (const skill of skills) {
    const name = skill.name;
    const dmi = skill.frontmatter && skill.frontmatter['disable-model-invocation'];
    const isDispatchedOnly = dmi === true || dmi === 'true' || DISPATCHED_ONLY.has(name);
    if (isDispatchedOnly) continue; // organic candidates only
    const phrases = extractTriggerPhrases(skill.frontmatter && skill.frontmatter.description);
    if (phrases.length === 0) continue;
    table.push({ name, matchers: phrases.map(compilePhrase) });
  }
  return table;
}

/**
 * Resolve a query against the matcher table.
 * Returns { matched: Set<string>, winner: string ("none" if nothing matched) }.
 */
function resolveQuery(query, table) {
  const norm = normalize(query);
  const matched = new Set();
  let winner = 'none';
  let bestWeight = -1;
  for (const entry of table) {
    let entryBest = -1;
    for (const m of entry.matchers) {
      if (m.regex.test(norm)) entryBest = Math.max(entryBest, m.literalWeight);
    }
    if (entryBest >= 0) {
      matched.add(entry.name);
      if (entryBest > bestWeight) {
        bestWeight = entryBest;
        winner = entry.name;
      }
    }
  }
  return { matched, winner };
}

// ---------------------------------------------------------------------------
// Corpus validation (L4-1, L4-2)
// ---------------------------------------------------------------------------

/**
 * Validate the corpus shape + population. `organicNames` is the set of skills that
 * MAY appear as a positive owner. Returns { ok, errors, stats }.
 */
function validateCorpus(corpus, organicNames) {
  const errors = [];
  if (!Array.isArray(corpus) || corpus.length === 0) {
    return { ok: false, errors: ['corpus must be a non-empty array'], stats: {} };
  }

  let negatives = 0;
  corpus.forEach((entry, i) => {
    const tag = `entry[${i}]`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${tag}: not an object`);
      return;
    }
    if (typeof entry.query !== 'string' || entry.query.trim().length === 0) {
      errors.push(`${tag}: missing non-empty "query"`);
    }
    if (typeof entry.owner !== 'string' || entry.owner.length === 0) {
      errors.push(`${tag}: missing "owner" (a skill name or "none")`);
      return;
    }
    if (entry.owner === 'none') {
      negatives++;
      return;
    }
    // L4-1: a positive owner MUST be an organically-invocable skill.
    if (!organicNames.has(entry.owner)) {
      if (DISPATCHED_ONLY.has(entry.owner)) {
        errors.push(`${tag}: owner "${entry.owner}" is dispatched-only (disable-model-invocation) — it may appear ONLY as a negative (owner "none") (L4-1)`);
      } else {
        errors.push(`${tag}: owner "${entry.owner}" is not a known organically-invocable skill (L4-1)`);
      }
    }
  });

  // L4-2: heavy negative weighting.
  const negFraction = negatives / corpus.length;
  if (negFraction < NEGATIVE_MIN_FRACTION) {
    errors.push(
      `negatives are ${(negFraction * 100).toFixed(1)}% of the corpus; ` +
      `L4-2 requires >= ${NEGATIVE_MIN_FRACTION * 100}%`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: { total: corpus.length, negatives, positives: corpus.length - negatives, negFraction }
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const log = (...a) => console.log(...a);

  log('='.repeat(64));
  log('ARCUS Layer-4 Trigger-Activation Runner');
  log('='.repeat(64));
  log(`mode: deterministic trigger match (zero tokens)` +
      ` | trials=${ENV.trials} | gates: activation>=${ACTIVATION_MIN}% fp<=${FALSE_POSITIVE_MAX}%`);

  if (!existsSync(CORPUS_PATH)) {
    log(`\nNo corpus at ${CORPUS_PATH}. Nothing to run. Exiting 0.`);
    process.exit(0);
  }

  let corpus;
  try {
    corpus = JSON.parse(readFileSync(CORPUS_PATH, 'utf-8'));
  } catch (err) {
    log(`\nCORPUS PARSE FAIL: ${err.message}`);
    process.exit(1);
  }

  const skills = walkSkills();
  const table = buildMatchers(skills);
  const organicNames = new Set(table.map(t => t.name));

  // --- Corpus validation (L4-1, L4-2) ---
  const v = validateCorpus(corpus, organicNames);
  log(`\nCorpus: ${v.stats.total} entries | positives: ${v.stats.positives} | ` +
      `negatives: ${v.stats.negatives} (${(v.stats.negFraction * 100).toFixed(1)}%)`);
  if (!v.ok) {
    log('CORPUS VALIDATION FAIL:');
    for (const e of v.errors) log(`  - ${e}`);
    log('RESULT: corpus invalid — exiting non-zero.');
    process.exit(1);
  }
  log('corpus validation: OK (L4-1 population, L4-2 negative weighting)');

  // --- Offline deterministic grading ---
  let posTotal = 0, activated = 0, accurate = 0;
  let negTotal = 0, falsePos = 0;
  const misses = [];

  for (const entry of corpus) {
    if (ENV.skillFilter && entry.owner !== ENV.skillFilter) continue;
    if (ENV.queryFilter && !entry.query.includes(ENV.queryFilter)) continue;

    // Deterministic matcher => every trial agrees; majority rule is trivially met.
    const { matched, winner } = resolveQuery(entry.query, table);

    if (entry.owner === 'none') {
      negTotal++;
      if (matched.size > 0) {
        falsePos++;
        misses.push(`FALSE-POSITIVE: "${entry.query}" fired [${[...matched].join(', ')}] (expected none)`);
      }
    } else {
      posTotal++;
      if (matched.has(entry.owner)) activated++;
      else misses.push(`NO-ACTIVATION: "${entry.query}" expected ${entry.owner}, fired [${[...matched].join(', ') || 'none'}]`);
      if (winner === entry.owner) accurate++;
      else if (matched.has(entry.owner)) {
        misses.push(`MISROUTE: "${entry.query}" expected ${entry.owner}, winner was ${winner}`);
      }
    }
  }

  const activationRate = posTotal ? (activated / posTotal) * 100 : 100;
  const accuracyRate = posTotal ? (accurate / posTotal) * 100 : 100;
  const fpRate = negTotal ? (falsePos / negTotal) * 100 : 0;

  log('\n--- Results ---');
  log(`activation:     ${activated}/${posTotal} = ${activationRate.toFixed(1)}%  (gate >= ${ACTIVATION_MIN}%)`);
  log(`accuracy:       ${accurate}/${posTotal} = ${accuracyRate.toFixed(1)}%  (winner == expected owner)`);
  log(`false-positive: ${falsePos}/${negTotal} = ${fpRate.toFixed(1)}%  (gate <= ${FALSE_POSITIVE_MAX}%)`);

  if (misses.length > 0) {
    log('\nDiagnostics:');
    for (const m of misses) log(`  - ${m}`);
  }

  const activationOk = activationRate >= ACTIVATION_MIN;
  const fpOk = fpRate <= FALSE_POSITIVE_MAX;

  log('\n' + '='.repeat(64));
  if (activationOk && fpOk) {
    log('RESULT: trigger gates PASSED. Exiting 0.');
    process.exit(0);
  }
  log(`RESULT: trigger gates FAILED ` +
      `(activation ${activationOk ? 'ok' : 'LOW'}, false-positive ${fpOk ? 'ok' : 'HIGH'}). Exiting non-zero.`);
  process.exit(1);
}

export {
  normalize,
  extractTriggerPhrases,
  compilePhrase,
  buildMatchers,
  resolveQuery,
  validateCorpus
};

const invokedDirectly = resolve(process.argv[1] || '') === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main();
}
