// models.mjs — ARCUS resolver data layer (constants + tierForComplexity)
//
// Model identifiers — which model string a host should use for `heavy` /
// `medium` / `light` — are entirely USER-SUPPLIED via the `tiers` object in
// `.arcus/config.json` (or the `model_policy` frozen into a story's
// session checkpoint at scaffold time). This module
// owns NO built-in model IDs and ships no presets: which provider/backend an
// OpenCode (or any other host) column should point at — GitHub Copilot,
// Amazon Bedrock, a direct Anthropic key, or a mix — is a deployment decision
// for the user, not an opinion this plugin should bake in and then have to
// keep from going stale across provider releases.
//
// No external dependencies — Node.js stdlib only.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Core constants
// ---------------------------------------------------------------------------

/** Tier levels in priority order (highest cost/quality → lowest). */
export const TIERS = ['heavy', 'medium', 'light'];

/**
 * Closed set of host surfaces, used only to validate and filter host-keyed maps.
 * Never used to SELECT a column at runtime — that is the caller's responsibility.
 * There is intentionally no 'default' key.
 */
export const HOSTS = ['claude', 'copilot', 'vscode', 'opencode'];

/** Default policy: inherit the calling session's model (no per-dispatch override). */
export const DEFAULT_POLICY = { mode: 'inherit' };

// ---------------------------------------------------------------------------
// STAGE_COMPLEXITY
// Fixed complexity for every orchestrator-level agent.
// One entry per file in plugins/arcus/agents/*.md (18 keys, 2026-09-03).
// Source: model-strategy/SKILL.md "Static Stage Assignments" table, plus four
// agents not listed there (assigned medium — standard implementation complexity).
// ---------------------------------------------------------------------------
export const STAGE_COMPLEXITY = {
  // From model-strategy/SKILL.md Static Stage Assignments
  // (code-reviewer is excluded — it is a skill, not an agent; no
  // plugins/arcus/agents/code-reviewer.md exists):
  'context-pack-builder':     'medium',
  'spec-finalizer':           'heavy',
  'implementation-planner':   'heavy',
  'test-spec-compiler':       'medium',
  'spec-compliance-reviewer': 'medium',
  'code-quality-reviewer':    'medium',
  'security-reviewer':        'medium',
  'performance-reviewer':     'medium',
  'history-context-reviewer': 'medium',
  'pull-request-builder':     'light',
  'repo-overview-discovery':  'heavy',
  'flow-discovery':           'heavy',
  'test-pattern-discovery':   'medium',
  'design-pattern-discovery': 'heavy',

  // Agents present in plugins/arcus/agents/ but not in the Static Stage
  // Assignments table; assigned medium (standard implementation complexity):
  'context-drift-sync':       'medium',
  'review-consolidator':      'medium',
  'simplify-and-verify':      'medium',
  'subagent-task-dispatcher': 'medium',
};

// ---------------------------------------------------------------------------
// tierForComplexity
// ---------------------------------------------------------------------------

/**
 * Resolve a complexity label to a canonical TIERS element.
 *
 * - `undefined` or `null` → `'medium'` (safe default per model-strategy/SKILL.md)
 * - Case-insensitive: `'HEAVY'` → `'heavy'`
 * - Any unknown value → `'medium'`
 *
 * @param {string|undefined|null} complexity
 * @returns {'heavy'|'medium'|'light'}
 */
export function tierForComplexity(complexity) {
  if (complexity == null) return 'medium';
  const lower = String(complexity).toLowerCase();
  return TIERS.includes(lower) ? lower : 'medium';
}

// ---------------------------------------------------------------------------
// loadPolicy — the story's frozen policy, else the workspace config
//
// Exactly two places a policy can come from, highest first:
//
//   1. The `model_policy` frozen into the session checkpoint at scaffold time
//      (only when a `--checkpoint` path is given). A story is a unit of work:
//      it runs on the policy it started with, so editing `.arcus/config.json`
//      halfway through cannot change models between stages of one story.
//   2. The `models` block of `.arcus/config.json`, relative to cwd.
//
// Missing/absent/malformed at both → `{ mode: 'inherit' }`. Inherit is not a
// third "rank"; it is simply what the policy IS when nothing configures it.
//
// There are deliberately NO env-var overrides and no `--model` escape hatch.
// Those were pure configuration surface — every override mechanism is a place
// where the model you get stops matching a file you can read.
//
// The freeze is a real second source, so it is made VISIBLE rather than silent:
// when both exist and disagree, `describeDrift` produces a warning telling the
// user their config edit is not in effect and naming the command that updates
// the freeze. Behaviour does not change — the freeze still wins — but a config
// edit that does nothing never does nothing *quietly*.
//
// There is NO host chain: nothing here inspects the environment for a host.
//
// Every failure is SOFT: warn (to stderr AND the returned warnings[]) and fall
// back to `{ mode: 'inherit' }`. loadPolicy never throws and never exits.
// ---------------------------------------------------------------------------

const VALID_MODES = ['inherit', 'tiered', 'flat'];
const WARN_PREFIX = '[WARN] models.mjs: ';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collect warnings, mirroring each one to a stderr write-alike. */
function makeWarner(stderr) {
  const warnings = [];
  return {
    warnings,
    warn(message) {
      const line = `${WARN_PREFIX}${message}`;
      warnings.push(line);
      try {
        stderr?.write?.(`${line}\n`);
      } catch {
        // A broken stderr must never turn a soft failure into a hard one.
      }
    },
  };
}

/**
 * Read and parse a JSON file.
 * @returns {{ ok: true, value: any } | { ok: false, missing: boolean, message: string }}
 */
function readJsonFile(filePath) {
  let text;
  try {
    text = readFileSync(filePath, 'utf-8');
  } catch (error) {
    return { ok: false, missing: error?.code === 'ENOENT', message: error.message };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, missing: false, message: error.message };
  }
}

/**
 * Normalize one raw policy block into an effective policy.
 *
 * @returns {object} the effective policy, or DEFAULT_POLICY on any soft failure.
 */
function normalizePolicy(block, warn, origin) {
  if (!isPlainObject(block)) {
    warn(`${origin} model policy is not an object; falling back to inherit`);
    return { ...DEFAULT_POLICY };
  }

  const mode = block.mode;
  if (!VALID_MODES.includes(mode)) {
    warn(`${origin} has an unknown mode ${JSON.stringify(mode)} (expected ${VALID_MODES.join('|')}); falling back to inherit`);
    return { ...DEFAULT_POLICY };
  }

  if (mode === 'inherit') {
    const p = { mode: 'inherit' };
    if (isPlainObject(block.stages)) p.stages = { ...block.stages };
    return p;
  }

  const policy = { mode };
  if (isPlainObject(block.stages)) policy.stages = { ...block.stages };

  if (mode === 'flat') {
    const flat = block.flat;
    const usable = (typeof flat === 'string' && flat.trim() !== '')
      || (isPlainObject(flat) && Object.keys(flat).length > 0);
    if (!usable) {
      warn(`${origin} has mode 'flat' but no resolvable flat model string; falling back to inherit`);
      return { ...DEFAULT_POLICY };
    }
    policy.flat = isPlainObject(flat) ? { ...flat } : flat;
    return policy;
  }

  // mode === 'tiered' — tiers are entirely user-supplied; there is no
  // built-in preset to fall back to (which model id belongs to which host at
  // which tier is a deployment decision, not something this module ships an
  // opinion about).
  const tiers = isPlainObject(block.tiers) ? block.tiers : null;
  if (tiers === null || Object.keys(tiers).length === 0) {
    warn(`${origin} has mode 'tiered' but no usable 'tiers' object; falling back to inherit`);
    return { ...DEFAULT_POLICY };
  }

  policy.tiers = { ...tiers };
  return policy;
}

/**
 * Read the `models` block of `.arcus/config.json`, if any.
 *
 * @returns {{ policy: object|null, path: string }} `policy` is null when the file is
 *   absent or carries no `models` key (both normal); malformed warns and yields null.
 */
function readConfigPolicy(cwd, warn) {
  const configPath = join(cwd, '.arcus', 'config.json');
  const read = readJsonFile(configPath);

  // Unparseable is worth a warning; simply absent is the normal case.
  if (!read.ok) {
    if (!read.missing) {
      warn(`could not parse ${configPath} (${read.message}); falling back to inherit`);
    }
    return { policy: null, path: configPath };
  }

  const block = isPlainObject(read.value) ? read.value.models : undefined;
  // A config file with no `models` key is the normal case: no policy configured.
  if (block === undefined) return { policy: null, path: configPath };

  return { policy: normalizePolicy(block, warn, `${configPath} 'models'`), path: configPath };
}

/**
 * Load the effective model policy.
 *
 * Precedence: the checkpoint's frozen `model_policy` (when `checkpoint` is given and
 * carries one), then `.arcus/config.json`'s `models` block, then the inherit default.
 *
 * @param {object}  [options]
 * @param {string}  [options.cwd]  Directory holding `.arcus/config.json`. Default `process.cwd()`.
 * @param {string}  [options.checkpoint] Path to the story's session-checkpoint.json.
 * @param {{write:Function}} [options.stderr] Warning sink. Default `process.stderr`.
 * @returns {{ policy: object, warnings: string[], source: 'checkpoint'|'config'|'default' }}
 */
export function loadPolicy({ cwd = process.cwd(), checkpoint, stderr = process.stderr } = {}) {
  const { warnings, warn } = makeWarner(stderr);

  // --- Rank 1: the story's frozen policy ---------------------------------
  if (checkpoint) {
    const read = readJsonFile(checkpoint);
    if (!read.ok) {
      // A named-but-unreadable checkpoint is worth a warning only when it exists
      // and cannot be parsed. A path that simply is not there yet (pre-scaffold,
      // or a story-less dispatch) falls through silently by design.
      if (!read.missing) {
        warn(`could not parse ${checkpoint} (${read.message}); ignoring the frozen policy`);
      }
    } else {
      const block = isPlainObject(read.value) ? read.value.model_policy : undefined;
      if (block !== undefined) {
        const frozen = normalizePolicy(block, warn, `${checkpoint} 'model_policy'`);

        // The freeze is a second source of truth, so make disagreement visible.
        // The frozen policy still wins — this only ensures a mid-story config
        // edit that has no effect does not have no effect SILENTLY.
        const { policy: live } = readConfigPolicy(cwd, () => {});
        if (live !== null && JSON.stringify(live) !== JSON.stringify(frozen)) {
          warn(
            `.arcus/config.json 'models' differs from the policy frozen for this story; `
            + `the frozen policy is in effect. To adopt the new one, run: `
            + `.arcus/bin/checkpoint.sh set-model-policy <STORY_ID> "$(node .arcus/bin/models.mjs show --policy-only)"`,
          );
        }

        return { policy: frozen, warnings, source: 'checkpoint' };
      }
    }
  }

  // --- Rank 2: the workspace config --------------------------------------
  const { policy } = readConfigPolicy(cwd, warn);
  if (policy !== null) return { policy, warnings, source: 'config' };

  return { policy: { ...DEFAULT_POLICY }, warnings, source: 'default' };
}

// ---------------------------------------------------------------------------
// resolveModel — an effective policy + a complexity → ONE of four shapes
//
//   1. { dispatch: false, mode: 'inherit', model: null }
//   2. { dispatch: true,  mode: 'flat',    model:  '<string>' }
//   3. { dispatch: true,  mode: 'tiered',  model:  '<string>' }
//   4. { dispatch: true,  mode: 'tiered',  models: { claude, copilot, vscode, opencode } }
//
// This function NEVER selects a column out of a keyed map and takes no argument
// naming a surface — shape 4 is forwarded whole and the calling model indexes
// its own column. That is the whole point of the design: adding a fifth surface
// costs zero changes here.
//
// Call sites branch on exactly three rules and NEVER on `mode`:
//   `dispatch !== true` → inherit · `typeof model === 'string'` → use it ·
//   `models` is an object → pick your own key.
// `mode` is informational provenance only, which is why a future fifth mode
// costs zero call-site edits.
//
// `inherit` is expressed as `model: null` + `dispatch: false` — NEVER the
// literal string 'inherit'. A literal 'inherit' reaching a dispatch parameter
// is exactly the bug this whole design exists to make unrepresentable.
// ---------------------------------------------------------------------------

/** Shape 1 — a fresh object every time, so no caller can mutate a shared one. */
function inheritResponse() {
  return { dispatch: false, mode: 'inherit', model: null };
}

/**
 * The SF-2 value shape rule, applied to one policy value.
 *
 * - a string  → shape 2/3, passed through byte-identically;
 * - an object → keys validated against HOSTS, unknown keys WARNED about and
 *   OMITTED (a typo must never be consumable), the survivors forwarded as-is;
 * - anything else, or an object that filters down to empty → `null`, which the
 *   caller turns into inherit.
 *
 * @param {unknown}  value
 * @param {'flat'|'tiered'} mode   Echoed into the response as provenance.
 * @param {string}   label         Human label for warnings, e.g. `tier 'heavy'`.
 * @param {Function} warn
 * @returns {object|null}
 */
function shapeValue(value, mode, label, warn) {
  if (typeof value === 'string') return { dispatch: true, mode, model: value };

  if (isPlainObject(value)) {
    const forwarded = {};
    for (const key of Object.keys(value)) {
      if (HOSTS.includes(key)) {
        forwarded[key] = value[key];
      } else {
        warn(`${label} has an unknown host key '${key}' (known: ${HOSTS.join(', ')}); ignoring it`);
      }
    }
    if (Object.keys(forwarded).length === 0) {
      warn(`${label} has no valid host entries; falling back to inherit`);
      return null;
    }
    return { dispatch: true, mode, models: forwarded };
  }

  warn(`${label} is neither a model string nor a keyed object; falling back to inherit`);
  return null;
}

/**
 * Resolve one dispatch's model from an effective policy.
 *
 * Resolution order: `stages[stage]` → `mode: flat` → `mode: tiered`
 * (tier row lookup) → inherit.
 *
 * `stages` values are reserved-word sensitive: a value that is itself a TIERS
 * word resolves through the effective `tiers` in ANY mode — including
 * `inherit` — while any other string is a literal model passed through verbatim.
 *
 * Every failure is soft: warn and fall back to inherit. Never throws.
 *
 * NOTE: there is deliberately no argument naming a surface anywhere in this
 * signature or body; see the block comment above.
 *
 * @param {object}  [options]
 * @param {object}  [options.policy]     Effective policy from loadPolicy.
 * @param {string}  [options.complexity] 'heavy'|'medium'|'light'; anything else → medium.
 * @param {string}  [options.stage]      Agent name, matched against STAGE_COMPLEXITY.
 * @param {{write:Function}} [options.stderr]
 * @returns {{dispatch:boolean, mode:string, model?:string|null, models?:object}}
 */
export function resolveModel({
  policy = DEFAULT_POLICY,
  complexity = undefined,
  stage = undefined,
  stderr = process.stderr,
} = {}) {
  const { warn } = makeWarner(stderr);
  const effective = isPlainObject(policy) ? policy : DEFAULT_POLICY;

  const tiers = isPlainObject(effective.tiers) ? effective.tiers : null;
  // A stages pin that is not a tier row describes a single model string, so it
  // reports 'flat' unless the policy itself is tiered.
  const declared = effective.mode === 'tiered' ? 'tiered' : 'flat';

  // --- stages[stage] beats the tier lookup ---------------------------------
  // Unknown keys are warned about and dropped on sight, not on lookup, so a
  // typo is reported even when its stage is never dispatched.
  let stages = null;
  if (isPlainObject(effective.stages)) {
    stages = {};
    for (const key of Object.keys(effective.stages)) {
      if (Object.hasOwn(STAGE_COMPLEXITY, key)) {
        stages[key] = effective.stages[key];
      } else {
        warn(`stages key '${key}' is not a known stage; ignoring it`);
      }
    }
  }

  if (stages !== null && typeof stage === 'string' && Object.hasOwn(stages, stage)) {
    const pinned = stages[stage];

    if (typeof pinned === 'string' && TIERS.includes(pinned)) {
      // Reserved word: resolve through the effective tiers in ANY mode.
      if (tiers === null || !Object.hasOwn(tiers, pinned)) {
        warn(`stages['${stage}'] names tier '${pinned}' but no tiers are configured`);
        return inheritResponse();
      }
      return shapeValue(tiers[pinned], 'tiered', `tier '${pinned}'`, warn) ?? inheritResponse();
    }

    return shapeValue(pinned, declared, `stages['${stage}']`, warn) ?? inheritResponse();
  }

  // --- mode: flat ----------------------------------------------------------
  if (effective.mode === 'flat') {
    return shapeValue(effective.flat, 'flat', 'the flat model', warn) ?? inheritResponse();
  }

  // --- mode: tiered --------------------------------------------------------
  if (effective.mode === 'tiered') {
    const tier = tierForComplexity(complexity);
    if (tiers === null || !Object.hasOwn(tiers, tier)) {
      warn(`tier '${tier}' has no entry in the effective tiers; falling back to inherit`);
      return inheritResponse();
    }
    return shapeValue(tiers[tier], 'tiered', `tier '${tier}'`, warn) ?? inheritResponse();
  }

  // --- mode: inherit (and anything unrecognised) ---------------------------
  return inheritResponse();
}

// ---------------------------------------------------------------------------
// HOST_DISCOVERY_HINTS
//
// Single-source constant consumed by both `models.mjs show` and
// `site/guide/model-policy.md` so the two cannot drift.
//
// SF-13 — verified status per host (2026-09-03):
//   claude    — `claude models` is a confirmed subcommand (exits "Not logged in"
//               rather than "unknown command"), but the full output format cannot
//               be verified in this environment because the CLI requires auth.
//               Marked unverified; command string is the confirmed surface.
//   copilot   — No Copilot CLI binary reachable in this environment.
//               Marked unverified; docs link provided.
//   vscode    — GUI host; no programmatic surface reachable in this environment.
//               Marked unverified; docs link provided.
//   opencode  — No opencode binary reachable in this environment.
//               Marked unverified; docs link provided.
//
// Key set must exactly match HOSTS = ['claude', 'copilot', 'vscode', 'opencode'].
// ---------------------------------------------------------------------------

/**
 * Per-host guidance on how to discover the model identifiers that belong in
 * each tier slot.  Consumed by `describePolicy` and `site/guide/model-policy.md`.
 *
 * Entry shape (either form is valid):
 *   - string               — verified command that lists available models.
 *   - { surface, docs, unverified?: true }
 *                          — the surface to look for, a doc link, and an
 *                            explicit unverified marker when the command could
 *                            not be confirmed in the implementation environment.
 */
export const HOST_DISCOVERY_HINTS = {
  /**
   * Claude Code (Anthropic-direct or GitHub-Copilot-backed).
   *
   * `claude models` is a confirmed subcommand (CLI returns "Not logged in"
   * rather than "unknown command"), but the full listing format was not
   * verifiable in this environment (unauthenticated).
   */
  claude: {
    surface: 'Run `claude models` (or `claude models list`) to list available model identifiers.',
    docs: 'https://docs.anthropic.com/en/docs/claude-code/settings#model',
    unverified: true,
  },

  /**
   * GitHub Copilot CLI (`gh copilot`).
   *
   * No `gh copilot` binary was reachable in this environment; command string
   * could not be verified.
   */
  copilot: {
    surface: 'In the GitHub Copilot CLI or VS Code Copilot settings, look for the model slug identifiers accepted by the `task` tool\'s `model:` parameter.',
    docs: 'https://docs.github.com/en/copilot/using-github-copilot/ai-model-selection-for-copilot',
    unverified: true,
  },

  /**
   * VS Code with GitHub Copilot extension.
   *
   * GUI host only; no programmatic listing surface was reachable in this
   * environment.
   */
  vscode: {
    surface: 'Open the Command Palette (Cmd/Ctrl+Shift+P) and run "GitHub Copilot: Change Model" to see available model display names.',
    docs: 'https://code.visualstudio.com/docs/copilot/ai-powered-suggestions#_change-your-ai-model',
    unverified: true,
  },

  /**
   * OpenCode (`opencode` CLI).
   *
   * No `opencode` binary was reachable in this environment; command string
   * could not be verified.
   */
  opencode: {
    surface: 'Run `opencode models` (or check the opencode documentation) to list provider/model-id strings accepted by your backend.',
    docs: 'https://opencode.ai/docs',
    unverified: true,
  },
};

// ---------------------------------------------------------------------------
// describePolicy
// ---------------------------------------------------------------------------

/**
 * Return a structured human-readable description of an effective policy.
 *
 * @param {object} policy  The effective policy object (output of `loadPolicy().policy`
 *                         or a hand-crafted policy object). No host argument is accepted.
 * @returns {{
 *   mode: string,
 *   bindings: object|null,
 *   discovery_hints: object,
 * }}
 *
 * `bindings` shape per mode:
 *   - 'tiered'  — { [tier]: { claude, copilot, vscode, opencode } } for each tier in TIERS.
 *   - 'flat'    — { claude, copilot, vscode, opencode } all set to the flat model string.
 *   - 'inherit' — null (the session model is inherited; nothing to show).
 *
 * All four host columns are shown unconditionally — there is no host argument.
 */
export function describePolicy(policy) {
  const effective = isPlainObject(policy) ? policy : DEFAULT_POLICY;
  const mode = typeof effective.mode === 'string' ? effective.mode : 'inherit';

  let bindings = null;

  if (mode === 'tiered' && isPlainObject(effective.tiers)) {
    // Expand the tiers map so every tier row shows all four host columns.
    bindings = {};
    for (const tier of TIERS) {
      if (Object.hasOwn(effective.tiers, tier)) {
        const tierVal = effective.tiers[tier];
        // Tier value is either an object with host keys or a bare string.
        bindings[tier] = isPlainObject(tierVal) ? { ...tierVal } : tierVal;
      }
    }
  } else if (mode === 'flat') {
    // If flat is a plain string, repeat it for every host column.
    // If flat is a host-keyed object, index into it per host (same shape normalizePolicy stores).
    bindings = {};
    for (const host of HOSTS) {
      bindings[host] = typeof effective.flat === 'string'
        ? effective.flat
        : (isPlainObject(effective.flat) ? (effective.flat[host] ?? null) : null);
    }
  }
  // mode === 'inherit' (or anything unrecognised): bindings stays null.

  return {
    mode,
    bindings,
    discovery_hints: HOST_DISCOVERY_HINTS,
  };
}

// ---------------------------------------------------------------------------
// CLI main — guarded, mirrors arcus-controller.mjs (lines 358-450)
//
// Canonical invocation (resolve):
//   node .arcus/bin/models.mjs resolve --complexity <heavy|medium|light>
//       [--stage <agent-name>]
//
// Three stdout contracts:
//   resolve         → one line of minified JSON (JSON.stringify(result))
//   show            → human-readable text: mode, bindings, provenance, hints
//   show [--checkpoint <path>] [--policy-only]
//   show --policy-only → exactly one line of minified JSON (the policy object)
//
// Warnings → stderr only. Hard errors (unknown subcommand, missing --complexity)
//   → [ERROR] models.mjs: <message>  + exit 1. All config/policy failures → exit 0.
// ---------------------------------------------------------------------------

function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  const args = { _: command || '', policyOnly: false };
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    if (token === '--policy-only') { args.policyOnly = true; continue; }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true';
    args[key] = value;
  }
  return args;
}

/**
 * Render an effective policy as human-readable text for the `show` subcommand.
 *
 * @param {object} policy   Effective policy (from loadPolicy().policy).
 * @param {string} [source] 'config' (from .arcus/config.json) or 'default' (nothing configured).
 * @returns {string}
 */
function formatPolicyText(policy, source) {
  const described = describePolicy(policy);
  const { mode, bindings, discovery_hints } = described;
  const lines = [];

  lines.push(`Effective mode: ${mode}`);
  if (source) lines.push(`Source:         ${source}`);

  if (bindings !== null) {
    lines.push('');
    lines.push('Bindings:');
    if (mode === 'flat') {
      // All hosts get the same flat model string.
      for (const [host, model] of Object.entries(bindings)) {
        lines.push(`  ${host}: ${model}`);
      }
    } else {
      // Tiered: one row per tier.
      for (const [tier, val] of Object.entries(bindings)) {
        if (typeof val === 'string') {
          lines.push(`  ${tier}: ${val}`);
        } else {
          lines.push(`  ${tier}:`);
          for (const [host, model] of Object.entries(val)) {
            lines.push(`    ${host}: ${model}`);
          }
        }
      }
    }
  } else {
    lines.push('');
    lines.push('Bindings: (none — session model is inherited)');
  }

  lines.push('');
  lines.push('Discovery hints (how to find model identifiers for each host):');
  for (const [host, hint] of Object.entries(discovery_hints)) {
    if (typeof hint === 'string') {
      lines.push(`  ${host}: ${hint}`);
    } else {
      lines.push(`  ${host}:`);
      if (hint.surface) lines.push(`    ${hint.surface}`);
      if (hint.docs) lines.push(`    docs: ${hint.docs}`);
      if (hint.unverified) lines.push(`    (unverified: command not confirmed in this environment)`);
    }
  }

  return lines.join('\n');
}

// Flags that used to exist and no longer do. Silently ignoring one would hand
// back a DIFFERENT model than the caller asked for, with nothing to notice — so
// each is warned about explicitly. Still a warning rather than an error: a stale
// call site must not kill a mid-story dispatch, and re-staging fixes it anyway.
const REMOVED_FLAGS = {
  model: 'the --model literal override was removed; set `models` in .arcus/config.json',
};

function warnRemovedFlags(args, stderr) {
  for (const [flag, why] of Object.entries(REMOVED_FLAGS)) {
    if (args[flag] !== undefined) {
      stderr.write(`${WARN_PREFIX}--${flag} is no longer supported and was ignored (${why})\n`);
    }
  }
}

function runCli(argv) {
  const args = parseCliArgs(argv);
  warnRemovedFlags(args, process.stderr);

  switch (args._) {
    case 'resolve': {
      if (!args.complexity) {
        throw new Error('resolve requires --complexity <heavy|medium|light>');
      }
      const { policy } = loadPolicy({
        cwd: process.cwd(),
        checkpoint: typeof args.checkpoint === 'string' ? args.checkpoint : undefined,
        stderr: process.stderr,
      });
      const result = resolveModel({
        policy,
        complexity: args.complexity,
        stage: typeof args.stage === 'string' ? args.stage : undefined,
        stderr: process.stderr,
      });
      process.stdout.write(JSON.stringify(result) + '\n');
      return;
    }
    case 'show': {
      const { policy, source } = loadPolicy({
        cwd: process.cwd(),
        checkpoint: typeof args.checkpoint === 'string' ? args.checkpoint : undefined,
        stderr: process.stderr,
      });
      if (args.policyOnly) {
        // Exactly one line of minified JSON — the raw policy object.
        process.stdout.write(JSON.stringify(policy) + '\n');
      } else {
        process.stdout.write(formatPolicyText(policy, source) + '\n');
      }
      return;
    }
    default:
      throw new Error(`unknown command: ${args._ || 'models.mjs'}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`[ERROR] models.mjs: ${error.message}\n`);
    process.exit(1);
  }
}
