// Pure L1 checks for ARCUS plugin integrity.
// Each check is a pure function: checkX(input) => { ok: boolean, errors: string[] }.
// Takes already-parsed/already-read input; does NOT walk the disk itself.

import { VALID_TIERS } from './skills.mjs';

/**
 * L1-1: Manifest validity check.
 * Validates plugin.json and marketplace.json structure and name consistency.
 *
 * @param {Object} input
 * @param {Object} input.pluginJson - Parsed plugin.json
 * @param {Object} input.marketplaceJson - Parsed marketplace.json
 * @param {boolean} input.sourceResolves - Whether the source path exists
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkManifests({ pluginJson, marketplaceJson, sourceResolves }) {
  const errors = [];

  // Validate plugin.json has required fields
  if (!pluginJson.name) {
    errors.push('plugin.json missing required field: name');
  }
  if (!pluginJson.description) {
    errors.push('plugin.json missing required field: description');
  }
  if (!pluginJson.version) {
    errors.push('plugin.json missing required field: version');
  }

  // Validate marketplace.json has required fields
  if (!marketplaceJson.name) {
    errors.push('marketplace.json missing required field: name');
  }
  if (!marketplaceJson.plugins || !Array.isArray(marketplaceJson.plugins)) {
    errors.push('marketplace.json missing or invalid plugins array');
  }

  // Cross-validate: plugin name must match in both manifests
  if (pluginJson.name && marketplaceJson.plugins && marketplaceJson.plugins.length > 0) {
    const marketplacePlugin = marketplaceJson.plugins.find(p => p.name === pluginJson.name);
    if (!marketplacePlugin) {
      errors.push(`plugin.json name "${pluginJson.name}" not found in marketplace.json plugins array`);
    }
  }

  // Validate source path resolves
  if (!sourceResolves) {
    errors.push('marketplace.json source path does not resolve to an existing directory');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-2: Frontmatter validity check (per skill).
 * Validates skill frontmatter structure and naming conventions.
 *
 * @param {Object} input
 * @param {string} input.name - Skill name (directory name)
 * @param {string} input.dir - Skill directory path
 * @param {Object} input.frontmatter - Parsed frontmatter object
 * @param {string} input.body - Skill body text
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkFrontmatter({ name, dir, frontmatter, body }) {
  const errors = [];

  // Check frontmatter exists
  if (!frontmatter || Object.keys(frontmatter).length === 0 || frontmatter._hasFrontmatter === false) {
    errors.push(`${name}: frontmatter is missing or empty`);
    return { ok: false, errors };
  }

  // Check name matches directory
  if (frontmatter.name !== name) {
    errors.push(`${name}: frontmatter name "${frontmatter.name}" does not match directory name "${name}"`);
  }

  // Check name is lowercase kebab-case
  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(name)) {
    errors.push(`${name}: name is not lowercase kebab-case (must match ^[a-z0-9]+(-[a-z0-9]+)*$)`);
  }

  // Check for reserved words
  const reservedWords = ['claude', 'anthropic'];
  const nameLower = name.toLowerCase();
  for (const reserved of reservedWords) {
    if (nameLower.includes(reserved)) {
      errors.push(`${name}: name contains reserved word "${reserved}"`);
    }
  }

  // Check description exists and is within limit
  if (!frontmatter.description) {
    errors.push(`${name}: frontmatter missing required field: description`);
  } else if (frontmatter.description.length > 1024) {
    errors.push(`${name}: description exceeds 1024 characters (${frontmatter.description.length} chars)`);
  }

  // Check layer field exists and is valid
  if (!frontmatter.layer) {
    errors.push(`${name}: frontmatter missing required field: layer`);
  } else if (!VALID_TIERS.includes(frontmatter.layer)) {
    errors.push(`${name}: invalid layer "${frontmatter.layer}" (must be one of: ${VALID_TIERS.join(', ')})`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-3: Line budget check.
 * Ensures each SKILL.md file does not exceed 500 lines.
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {string} input.body - Skill body text (not used, but kept for consistency)
 * @param {string} input.fullText - Full file text including frontmatter
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkLineBudget({ name, body, fullText }) {
  const errors = [];
  const lines = fullText.split('\n').length;
  const limit = 500;

  if (lines > limit) {
    errors.push(`${name}: file exceeds ${limit}-line limit (${lines} lines)`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-4: Advisory reviewers are read-only (category invariant).
 * Advisory reviewers must have disable-model-invocation: true, user-invocable: false,
 * and disallowed-tools must include Edit, Write, and MultiEdit.
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {Object} input.frontmatter - Parsed frontmatter object
 * @param {Set<string>} input.advisorySet - Set of advisory reviewer names
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkAdvisoryReadOnly({ name, frontmatter, advisorySet }) {
  const errors = [];

  // Only check advisory reviewers
  if (!advisorySet.has(name)) {
    return { ok: true, errors };
  }

  // Check disable-model-invocation is true
  if (frontmatter['disable-model-invocation'] !== true) {
    errors.push(`${name}: advisory reviewer must have disable-model-invocation: true`);
  }

  // Check user-invocable is false
  if (frontmatter['user-invocable'] !== false) {
    errors.push(`${name}: advisory reviewer must have user-invocable: false`);
  }

  // Check disallowed-tools includes Edit, Write, and MultiEdit
  const disallowedTools = frontmatter['disallowed-tools'];
  if (!Array.isArray(disallowedTools)) {
    errors.push(`${name}: advisory reviewer must have disallowed-tools array`);
  } else {
    const requiredTools = ['Edit', 'Write', 'MultiEdit'];
    for (const tool of requiredTools) {
      if (!disallowedTools.includes(tool)) {
        errors.push(`${name}: advisory reviewer must disallow ${tool}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-5: Capabilities hold no orchestration state (category invariant).
 * Capabilities must not reference checkpoint.sh state subcommands, branch.sh,
 * git checkout -b, or "next stage" routing patterns.
 *
 * Patterns are calibrated to avoid false positives on clean capabilities:
 * - session-checkpoint (the orchestration-state artifact, hyphenated token or .json filename)
 * - checkpoint.sh <state subcommand> — read | set-status | set-branch | set-mode | complete | init
 *   (requires a known subcommand, not just the bare word "checkpoint")
 * - branch.sh (as a command or script reference)
 * - git checkout -b (the exact branch creation command)
 * - "next stage" or "proceed to the next stage" (routing language)
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {string} input.tier - Skill tier (layer field)
 * @param {string} input.body - Skill body text
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkCapabilityNoState({ name, tier, body }) {
  const errors = [];

  // Only check capabilities
  if (tier !== 'capability') {
    return { ok: true, errors };
  }

  // Pattern 0: the session-checkpoint artifact itself (L1-5 lists it explicitly).
  // Match the hyphenated artifact token and the JSON filename, not the bare word
  // "checkpoint" (which can appear benignly in prose).
  if (/session-checkpoint|session-checkpoint\.json/i.test(body)) {
    errors.push(`${name}: capability references session-checkpoint (orchestration state)`);
  }

  // Pattern 1: checkpoint.sh with any state subcommand. Reading OR advancing the
  // checkpoint is orchestration state — a capability must do neither. Matches the
  // script + a known subcommand (read | set-status | set-branch | set-mode | complete |
  // init), so a benign prose mention of "checkpoint" still does not trip it.
  const checkpointSub = /checkpoint\.sh\s+(read|set-status|set-branch|set-mode|complete|init)\b/i;
  const m = body.match(checkpointSub);
  if (m) {
    errors.push(`${name}: capability references checkpoint.sh ${m[1]} (orchestration state)`);
  }

  // Pattern 2: branch.sh as a script/command (not just the word "branch")
  // Match branch.sh as a command (with or without path, with or without arguments)
  if (/\bbranch\.sh\b/.test(body)) {
    errors.push(`${name}: capability references branch.sh (branch creation script)`);
  }

  // Pattern 3: git checkout -b (branch creation command)
  if (/git\s+checkout\s+-b/.test(body)) {
    errors.push(`${name}: capability references git checkout -b (branch creation)`);
  }

  // Pattern 4: "next stage" routing language
  // Be specific to avoid false positives on benign mentions
  if (/\b(next stage|proceed to the next stage|move to the next stage)\b/i.test(body)) {
    errors.push(`${name}: capability contains stage routing language`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-6: Orchestrators/coordinators no inlined domain logic (ADVISORY, non-failing heuristic).
 * For orchestrator/coordinator tiers, heuristically flag large prose blocks that lack
 * skill-dispatch references.
 *
 * This is a WARNINGS-ONLY check — it never sets ok: false. Returns warnings array instead
 * of errors array.
 *
 * Heuristic: flag if there's a prose block of 15+ consecutive non-trivial lines
 * (>20 chars, not headers/lists/fences) with no arcus: mentions and no dispatch patterns.
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {string} input.tier - Skill tier (layer field)
 * @param {string} input.body - Skill body text
 * @returns {{ ok: boolean, warnings: string[] }}
 */
function checkNoInlinedDomain({ name, tier, body }) {
  const warnings = [];

  // Only check orchestrators and coordinators
  if (tier !== 'orchestrator' && tier !== 'coordinator') {
    return { ok: true, warnings };
  }

  // Split into lines and look for long prose blocks without dispatch references
  const lines = body.split('\n');
  let consecutiveProse = 0;
  let maxConsecutive = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, markdown headers, list items, code fences, table separators
    if (trimmed === '' ||
        /^#+\s/.test(line) ||
        /^[-*]\s/.test(line) ||
        /^```/.test(line) ||
        /^\|/.test(line) ||
        /^[-|:]+$/.test(trimmed)) {
      consecutiveProse = 0;
      continue;
    }

    // Check if line contains dispatch patterns
    const hasDispatchPattern = /arcus:/i.test(line) ||
                               /dispatch|delegate|invoke|call.*skill/i.test(line);

    // Count as prose if it's substantial (>20 chars) and has no dispatch patterns
    if (!hasDispatchPattern && trimmed.length > 20) {
      consecutiveProse++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveProse);
    } else {
      consecutiveProse = 0;
    }
  }

  // Flag if we found a block of 15+ consecutive prose lines
  if (maxConsecutive >= 15) {
    warnings.push(
      `${name}: ${tier} has ${maxConsecutive} consecutive prose lines without dispatch patterns (consider extracting to capability)`
    );
  }

  // Always return ok: true (this is advisory only)
  return { ok: true, warnings };
}

/**
 * L1-7: Cross-skill references resolve.
 * Every arcus:<skill-name> mention in the body must resolve to a real skill directory.
 *
 * Matches the pattern arcus: followed by kebab-case skill name.
 * Excludes placeholder patterns like arcus:<...> or arcus:<SKILL>.
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {string} input.body - Skill body text
 * @param {Set<string>} input.knownSkillNames - Set of known skill directory names
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkCrossRefs({ name, body, knownSkillNames }) {
  const errors = [];

  // Match arcus:<skill-name> pattern
  // Exclude placeholders like <...>, <SKILL>, <skill>
  const refPattern = /arcus:([a-z0-9]+(?:-[a-z0-9]+)*)/g;
  const matches = [...body.matchAll(refPattern)];

  const danglingRefs = new Set();

  for (const match of matches) {
    const refName = match[1];

    // Check if it's a known skill
    if (!knownSkillNames.has(refName)) {
      danglingRefs.add(refName);
    }
  }

  if (danglingRefs.size > 0) {
    const refList = Array.from(danglingRefs).sort().join(', ');
    errors.push(`${name}: references non-existent skills: ${refList}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-14: Pure-agent dispatch references carry the "agent" qualifier.
 *
 * The `arcus:<name>` token is surface-agnostic — it resolves to a skill dir OR an
 * agent file. A SKILL is the default assumption (it lives in skills/<name>/), so a
 * bare imperative like "read and follow `arcus:foo`" sends the model looking for a
 * skill folder. For a PURE agent (an agent file whose basename is NOT also a skill
 * dir) that folder does not exist, so the dispatch instruction MUST label it as an
 * `agent` to point the model at agents/<name>.md.
 *
 * Scope is deliberately tight to keep false positives near zero:
 *   - Only PURE agents are checked (dual-surface items like test-spec-compiler /
 *     pull-request-builder / context-drift-sync, which have BOTH a skill wrapper and an
 *     agent file, may be referenced as either "skill" or "agent").
 *   - Only IMPERATIVE dispatch lead-ins that sit IMMEDIATELY before the token are
 *     flagged (`read and follow` / `dispatch` / `invoke`, optionally + "the"). Passive
 *     descriptions ("dispatched by `arcus:x`", "delegates … to the `arcus:x`") are not
 *     dispatch instructions and are left alone.
 *
 * When such a lead-in is found, the token's line plus the following line (to allow a
 * wrapped sentence) — with `arcus:` tokens stripped so a name like
 * `subagent-task-dispatcher` cannot self-satisfy — must contain the word "agent".
 *
 * @param {Object} input
 * @param {string} input.name - Item name (skill or agent being checked)
 * @param {string} input.body - Item body text
 * @param {Set<string>} input.pureAgentNames - Agent basenames with NO sibling skill dir
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkAgentRefQualified({ name, body, pureAgentNames }) {
  const errors = [];

  // Imperative dispatch verb sitting immediately before the `arcus:` token,
  // optionally followed by "the" and an opening backtick.
  const leadIn = /(?:read\s+and\s+follow|dispatch|invoke)\s+(?:the\s+)?`?$/i;
  const refPattern = /arcus:([a-z0-9]+(?:-[a-z0-9]+)*)/g;
  const stripTokens = (text) => text.replace(/arcus:[a-z0-9-]+/gi, '');

  const flagged = new Set();

  for (const match of body.matchAll(refPattern)) {
    const refName = match[1];
    if (!pureAgentNames.has(refName)) continue;

    // Only require the qualifier when this is an imperative dispatch instruction.
    const before = body.slice(0, match.index);
    if (!leadIn.test(before)) continue;

    // Window = the token's line + the next line (handles a wrapped sentence).
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = body.indexOf('\n', match.index);
    const nextLineEnd = lineEnd === -1 ? -1 : body.indexOf('\n', lineEnd + 1);
    const windowEnd = nextLineEnd === -1 ? body.length : nextLineEnd;
    const window = stripTokens(body.slice(lineStart, windowEnd));

    if (!/\bagents?\b/i.test(window)) {
      flagged.add(refName);
    }
  }

  if (flagged.size > 0) {
    const list = Array.from(flagged).sort().join(', ');
    errors.push(`${name}: dispatch reference to pure agent(s) missing the "agent" qualifier: ${list}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-8: Bundled-resource paths resolve.
 * Find every references/... or assets/... path mentioned in the body that has a FILE EXTENSION,
 * and verify it exists on disk relative to the skill's dir.
 *
 * Match ONLY extension-bearing paths (e.g., .md, .json, .py, .txt, .sh) to avoid false positives
 * on prose mentions of "references/" or "assets/" without a filename.
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {string} input.dir - Skill directory path
 * @param {string} input.body - Skill body text
 * @param {Function} input.fileExists - Injected predicate (path) => boolean (rooted at skill dir)
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkResourcePaths({ name, dir, body, fileExists }) {
  const errors = [];

  // Match references/... or assets/... paths with file extensions
  // Pattern: (references|assets)/[path-segment(s)]/filename.ext
  // We require at least one dot in the filename portion to indicate an extension
  const resourcePattern = /\b(references|assets)\/[^\s"'`)\]]+\.[a-zA-Z0-9]+/g;
  const matches = [...body.matchAll(resourcePattern)];

  const missingPaths = new Set();

  for (const match of matches) {
    const resourcePath = match[0];

    // Check if the file exists relative to the skill directory
    if (!fileExists(resourcePath)) {
      missingPaths.add(resourcePath);
    }
  }

  if (missingPaths.size > 0) {
    const pathList = Array.from(missingPaths).sort().join(', ');
    errors.push(`${name}: references non-existent resource files: ${pathList}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-9: Hooks integrity.
 * Validates hooks.json structure and ensures every referenced command script exists.
 *
 * @param {Object} input
 * @param {Object} input.hooksJson - Parsed hooks.json
 * @param {Function} input.scriptExists - Injected predicate (path) => boolean (rooted at plugin root)
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkHooks({ hooksJson, scriptExists }) {
  const errors = [];

  // Validate basic structure
  if (!hooksJson || typeof hooksJson !== 'object') {
    errors.push('hooks.json is not a valid object');
    return { ok: false, errors };
  }

  if (!hooksJson.hooks || typeof hooksJson.hooks !== 'object') {
    errors.push('hooks.json missing "hooks" top-level object');
    return { ok: false, errors };
  }

  // Extract all command scripts from the hooks structure
  const scriptPaths = new Set();

  for (const hookName in hooksJson.hooks) {
    const hookEntries = hooksJson.hooks[hookName];
    if (!Array.isArray(hookEntries)) {
      errors.push(`hooks.json: hook "${hookName}" is not an array`);
      continue;
    }

    for (const entry of hookEntries) {
      if (!entry.hooks || !Array.isArray(entry.hooks)) {
        continue;
      }

      for (const hook of entry.hooks) {
        if (hook.type === 'command' && hook.command) {
          // Extract script path from command string
          // Handle: "${CLAUDE_PLUGIN_ROOT}"/scripts/bootstrap.sh
          // Resolve ${CLAUDE_PLUGIN_ROOT} to empty string (we check relative to plugin root)
          let scriptPath = hook.command;

          // Remove quotes
          scriptPath = scriptPath.replace(/^["']|["']$/g, '');

          // Replace ${CLAUDE_PLUGIN_ROOT} with empty string (we'll check relative to plugin root)
          scriptPath = scriptPath.replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/?/, '');

          // Extract just the script path (first token before any arguments)
          scriptPath = scriptPath.split(/\s+/)[0];

          // Remove any remaining quotes
          scriptPath = scriptPath.replace(/["']/g, '');

          if (scriptPath) {
            scriptPaths.add(scriptPath);
          }
        }
      }
    }
  }

  // Check that each script exists
  const missingScripts = [];
  for (const scriptPath of scriptPaths) {
    if (!scriptExists(scriptPath)) {
      missingScripts.push(scriptPath);
    }
  }

  if (missingScripts.length > 0) {
    errors.push(`hooks.json references non-existent scripts: ${missingScripts.join(', ')}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-10: Single model-resolution point (CALIBRATION-CRITICAL).
 * Every skill EXCEPT model-strategy must NOT hard-code a model string as a ROUTING decision.
 *
 * Flag patterns like:
 *   - Explicit versioned model ids: claude-...-4-... (e.g., claude-opus-4, claude-sonnet-4-6, claude-3-5-...)
 *
 * IMPORTANT: Bare words opus/sonnet/haiku appear LEGITIMATELY across many skills as
 * COMPLEXITY-TIER references (e.g., "light→haiku, medium→sonnet, heavy→opus",
 * "resolve via arcus:model-strategy"). Those are NOT violations — they reference the
 * model-strategy table, they don't hardcode a routing decision.
 *
 * CALIBRATION: This check MUST be GREEN for all non-model-strategy skills in the live tree.
 * The regex matches versioned model-id strings like:
 *   - claude-opus-4
 *   - claude-sonnet-4-6
 *   - claude-3-5-sonnet
 *   - claude-haiku-3-5
 * AND space-form routing strings: "Claude Opus 4.6", "Claude Sonnet 4.6 (copilot)".
 * But NOT bare tier words: opus, sonnet, haiku (which are legitimate complexity tier references).
 *
 * Allowlisted skills (MODEL_STRING_ALLOWLIST) are always ok:true: model-strategy (owns the
 * single resolution table) and subagent-task-dispatcher (documents the pass-through format).
 *
 * @param {Object} input
 * @param {string} input.name - Skill name
 * @param {string} input.body - Skill body text
 * @returns {{ ok: boolean, errors: string[] }}
 */
// Skills allowed to contain literal model strings:
//   - model-strategy: owns the single resolution table (the one allowed point).
//   - subagent-task-dispatcher: documents the platform pass-through string FORMAT
//     (e.g. "Claude Sonnet 4.6 (copilot)") as an example of what model-strategy
//     resolves to — it routes via model-strategy, it does not hardcode a decision.
const MODEL_STRING_ALLOWLIST = new Set(['model-strategy', 'subagent-task-dispatcher']);

function checkNoInlineModel({ name, body }) {
  const errors = [];

  // Allowlisted skills legitimately contain model strings (see MODEL_STRING_ALLOWLIST).
  if (MODEL_STRING_ALLOWLIST.has(name)) {
    return { ok: true, errors };
  }

  const found = new Set();

  // Form 1 — hyphenated versioned IDs: claude-opus-4, claude-opus-4-8,
  // claude-sonnet-4-6, claude-3-5-sonnet, claude-haiku-3-5.
  // Match the whole "claude-<segment>(-<segment>)*" token (one linear pass, no
  // backtracking around a straddling \d), then keep only tokens that contain a digit
  // (a versioned id) — bare "claude-code" etc. without a version is not flagged.
  for (const m of body.matchAll(/claude-[a-z0-9]+(?:-[a-z0-9]+)*/gi)) {
    if (/\d/.test(m[0])) found.add(m[0]);
  }

  // Form 2 — space-form routing strings: "Claude Opus 4.6", "Claude Sonnet 4.6 (copilot)",
  // "Claude Haiku 4.5". A tier word followed by a version number is a concrete model
  // string, not a bare tier reference (bare "opus"/"sonnet"/"haiku" stay allowed).
  for (const m of body.matchAll(/claude\s+(?:opus|sonnet|haiku)\s+\d[\d.]*/gi)) {
    found.add(m[0].replace(/\s+/g, ' ').trim());
  }

  if (found.size > 0) {
    const modelIds = [...found].sort();
    errors.push(`${name}: hardcodes model string(s): ${modelIds.join(', ')} (must resolve via arcus:model-strategy)`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-11a: Dependency-free JSON-Schema (draft-07 subset) validator.
 *
 * Supports the SUFFICIENT SUBSET needed to validate the session checkpoint:
 *   - type    : object | string | number | integer | array | boolean
 *   - required: array of property names that must be present (objects)
 *   - enum    : array of allowed values
 *   - properties: object map of subschemas (recurses into each present property)
 * Any other keyword is treated as a pass (ignored). NO external libraries.
 *
 * @param {*} instance - The value to validate.
 * @param {Object} schema - The (subset) JSON Schema.
 * @param {string} [pathPrefix] - Internal: dotted path for error messages.
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateJsonSchema(instance, schema, pathPrefix = '') {
  const errors = [];
  const at = pathPrefix || '(root)';

  if (!schema || typeof schema !== 'object') {
    return { ok: true, errors };
  }

  // type
  if (typeof schema.type === 'string') {
    if (!matchesType(instance, schema.type)) {
      errors.push(`${at}: expected type ${schema.type}, got ${describeType(instance)}`);
      // Bail on further structural checks for this node — they assume the type.
      return { ok: false, errors };
    }
  }

  // enum
  if (Array.isArray(schema.enum)) {
    if (!schema.enum.some(allowed => deepEqual(allowed, instance))) {
      errors.push(`${at}: value ${JSON.stringify(instance)} not in enum [${schema.enum.map(v => JSON.stringify(v)).join(', ')}]`);
    }
  }

  // required (only meaningful for objects)
  if (Array.isArray(schema.required) && instance && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const key of schema.required) {
      if (!Object.prototype.hasOwnProperty.call(instance, key)) {
        errors.push(`${at}: missing required property "${key}"`);
      }
    }
  }

  // properties (recurse into each present property)
  if (schema.properties && typeof schema.properties === 'object' &&
      instance && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const key of Object.keys(schema.properties)) {
      if (Object.prototype.hasOwnProperty.call(instance, key)) {
        const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
        const childResult = validateJsonSchema(instance[key], schema.properties[key], childPath);
        if (!childResult.ok) {
          errors.push(...childResult.errors);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function matchesType(value, type) {
  switch (type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    default:
      // Unknown type keyword -> treat as pass.
      return true;
  }
}

function describeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * L1-11b: Artifact required-section presence check (pure, no disk walk).
 * Parses `## ` headings from the markdown text and asserts every required
 * section heading is present (matched on the heading text after `## `).
 *
 * @param {string} markdownText - Full markdown body.
 * @param {string[]} requiredSections - Required `## ` heading texts.
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkArtifactSections(markdownText, requiredSections) {
  const errors = [];
  const text = typeof markdownText === 'string' ? markdownText : '';

  // Collect all level-2 heading texts (exactly "## " prefix).
  const present = new Set();
  for (const line of text.split('\n')) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      present.add(match[1].trim());
    }
  }

  for (const required of (requiredSections || [])) {
    if (!present.has(required.trim())) {
      errors.push(`missing required section: "## ${required}"`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-12: Every capability skill owns a Layer-2 eval spec.
 *
 * The Layer-2 strategy mandates one `tests/e2e/evals/specs/<skill>/evals.json` per
 * `layer: capability` skill. This static check makes that obligation a hard gate: if a
 * capability is added without an eval spec, integration fails — there is no
 * "hard-to-test" capability.
 *
 * Pure: the disk lookup is injected via `specExists(skillName) => boolean`, so the
 * function performs no I/O itself (mirrors checkResourcePaths/checkHooks).
 *
 * @param {Object} input
 * @param {string} input.name - Skill name (directory name)
 * @param {string} input.tier - The skill's `layer` value
 * @param {(skillName: string) => boolean} input.specExists - Predicate: does
 *        tests/e2e/evals/specs/<skillName>/evals.json exist?
 * @returns {{ ok: boolean, errors: string[] }}
 */
function checkCapabilityHasEvalSpec({ name, tier, specExists }) {
  const errors = [];

  // Only capabilities carry the Layer-2 eval obligation.
  if (tier !== 'capability') {
    return { ok: true, errors };
  }

  if (!specExists(name)) {
    errors.push(
      `${name}: capability has no Layer-2 eval spec ` +
      `(expected tests/e2e/evals/specs/${name}/evals.json)`
    );
  }

  return { ok: errors.length === 0, errors };
}

/**
 * L1-13: Agent frontmatter validity (agent surface).
 *
 * Agents are flat `plugins/arcus/agents/<name>.md` files. This is the agent-surface
 * analogue of checkFrontmatter (which governs skills). It enforces the canonical
 * Claude Code agent frontmatter documented in plugins/arcus/agents.md:
 *   - name present, == file basename, lowercase kebab-case, no reserved words
 *   - description present, <= 1024 chars
 *   - layer present and in VALID_TIERS (the role axis survives on agents)
 *   - model present and a TIER word (opus|sonnet|haiku) or `inherit` — never a
 *     versioned model string (tier->model resolution is owned by arcus:model-strategy)
 *
 * Pure: receives the already-parsed frontmatter; performs no I/O.
 *
 * @param {Object} input
 * @param {string} input.name - Agent name (file basename, no .md)
 * @param {Object} input.frontmatter - Parsed frontmatter object
 * @returns {{ ok: boolean, errors: string[] }}
 */
const VALID_AGENT_MODELS = new Set(['opus', 'sonnet', 'haiku', 'inherit']);

function checkAgentFrontmatter({ name, frontmatter }) {
  const errors = [];

  if (!frontmatter || Object.keys(frontmatter).length === 0 || frontmatter._hasFrontmatter === false) {
    errors.push(`${name}: agent frontmatter is missing or empty`);
    return { ok: false, errors };
  }

  // name matches file basename
  if (frontmatter.name !== name) {
    errors.push(`${name}: agent frontmatter name "${frontmatter.name}" does not match file basename "${name}"`);
  }

  // name is lowercase kebab-case
  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(name)) {
    errors.push(`${name}: agent name is not lowercase kebab-case (must match ^[a-z0-9]+(-[a-z0-9]+)*$)`);
  }

  // reserved words
  const reservedWords = ['claude', 'anthropic'];
  const nameLower = name.toLowerCase();
  for (const reserved of reservedWords) {
    if (nameLower.includes(reserved)) {
      errors.push(`${name}: agent name contains reserved word "${reserved}"`);
    }
  }

  // description present and within limit
  if (!frontmatter.description) {
    errors.push(`${name}: agent frontmatter missing required field: description`);
  } else if (frontmatter.description.length > 1024) {
    errors.push(`${name}: agent description exceeds 1024 characters (${frontmatter.description.length} chars)`);
  }

  // layer present and valid (role axis survives on agents)
  if (!frontmatter.layer) {
    errors.push(`${name}: agent frontmatter missing required field: layer`);
  } else if (!VALID_TIERS.includes(frontmatter.layer)) {
    errors.push(`${name}: invalid layer "${frontmatter.layer}" (must be one of: ${VALID_TIERS.join(', ')})`);
  }

  // model present and a tier word (or inherit) — never a versioned model string
  if (!frontmatter.model) {
    errors.push(`${name}: agent frontmatter missing required field: model`);
  } else if (!VALID_AGENT_MODELS.has(String(frontmatter.model))) {
    errors.push(`${name}: invalid model "${frontmatter.model}" (must be a tier word: ${[...VALID_AGENT_MODELS].join(', ')} — resolve via arcus:model-strategy)`);
  }

  return { ok: errors.length === 0, errors };
}

export {
  validateJsonSchema,
  checkArtifactSections,
  checkManifests,
  checkFrontmatter,
  checkLineBudget,
  checkAdvisoryReadOnly,
  checkCapabilityNoState,
  checkNoInlinedDomain,
  checkCrossRefs,
  checkAgentRefQualified,
  checkResourcePaths,
  checkHooks,
  checkNoInlineModel,
  checkCapabilityHasEvalSpec,
  checkAgentFrontmatter
};
