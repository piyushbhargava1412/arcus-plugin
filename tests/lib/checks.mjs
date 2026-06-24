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
 * Capabilities must not reference checkpoint.sh, branch.sh, git checkout -b,
 * set-status, or "next stage" routing patterns.
 *
 * Patterns are calibrated to avoid false positives on clean capabilities:
 * - checkpoint.sh set-status (requires the set-status subcommand, not just "checkpoint")
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

  // Pattern 1: checkpoint.sh set-status (specific subcommand)
  if (/checkpoint\.sh\s+set-status/i.test(body)) {
    errors.push(`${name}: capability references checkpoint.sh set-status (orchestration state)`);
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

export {
  checkManifests,
  checkFrontmatter,
  checkLineBudget,
  checkAdvisoryReadOnly,
  checkCapabilityNoState,
  checkNoInlinedDomain,
  checkCrossRefs
};
