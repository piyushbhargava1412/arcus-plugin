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

export { checkManifests, checkFrontmatter, checkLineBudget };
