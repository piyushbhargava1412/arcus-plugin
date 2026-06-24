// Skill introspection library for the ARCUS Layer-1 static suite.
// Zero-dependency parsing of SKILL.md frontmatter, directory walking,
// and tier/roster constants.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// Resolve paths relative to this module (so it works from any working directory)
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const SKILLS_DIR = resolve(repoRoot, 'plugins/arcus/skills');

// Roster constants (name-based, STABLE)
const DISPATCHED_ONLY = new Set([
  'code-quality-reviewer',
  'code-simplifier',
  'history-context-reviewer',
  'model-strategy',
  'performance-reviewer',
  'security-reviewer',
  'spec-compliance-reviewer',
  'subagent-task-dispatcher',
  'review-consolidator',
  'simplify-and-verify'
]);

const ADVISORY_REVIEWERS = new Set([
  'security-reviewer',
  'performance-reviewer',
  'code-quality-reviewer',
  'history-context-reviewer',
  'spec-compliance-reviewer'
]);

const SUBSTRATE_SKILLS = new Set([
  'model-strategy',
  'arcus-guide'
]);

const VALID_TIERS = ['capability', 'coordinator', 'orchestrator', 'substrate'];

// NOTE: Task 8 adds write-evals capability, bumping capability→18 / total→27.
// These are the current expected counts before Task 8.
const EXPECTED_TIER_COUNTS = {
  orchestrator: 3,
  coordinator: 4,
  capability: 17,
  substrate: 2
};

/**
 * Parse the leading YAML-ish frontmatter block from a SKILL.md file.
 * Returns a flat object { key: value }.
 *
 * Handles:
 * - Simple scalars (key: value)
 * - Folded descriptions (description: > followed by indented lines)
 * - Comma-list values (disallowed-tools: Edit, Write, MultiEdit) returned as arrays
 * - Boolean strings ('true'/'false') converted to actual booleans
 *
 * Returns {} with _hasFrontmatter:false if no frontmatter block found.
 */
function parseFrontmatter(text) {
  const lines = text.split('\n');

  // Check for leading ---
  if (!lines[0] || lines[0].trim() !== '---') {
    return { _hasFrontmatter: false };
  }

  // Find closing ---
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { _hasFrontmatter: false };
  }

  const fmLines = lines.slice(1, endIndex);
  const result = {};
  let currentKey = null;
  let foldedValue = [];

  for (const line of fmLines) {
    // Check if this is a folded description continuation (indented line)
    if (currentKey && line.match(/^\s+\S/)) {
      foldedValue.push(line.trim());
      continue;
    }

    // Flush any accumulated folded value
    if (currentKey && foldedValue.length > 0) {
      result[currentKey] = foldedValue.join(' ');
      foldedValue = [];
      currentKey = null;
    }

    // Parse key: value line
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    // Handle folded block indicator (>)
    if (value === '>') {
      currentKey = key;
      foldedValue = [];
      continue;
    }

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Convert boolean strings
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    // Handle comma-list values for certain keys
    if (key === 'disallowed-tools' || key === 'allowed-tools') {
      result[key] = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    } else {
      result[key] = value;
    }
  }

  // Flush final folded value if any
  if (currentKey && foldedValue.length > 0) {
    result[currentKey] = foldedValue.join(' ');
  }

  return result;
}

/**
 * Walk all SKILL.md files in plugins/arcus/skills and return metadata for each.
 * Returns array of { name, dir, path, frontmatter, body }.
 */
function walkSkills() {
  const skills = [];

  try {
    const entries = readdirSync(SKILLS_DIR);

    for (const entry of entries) {
      const skillDir = join(SKILLS_DIR, entry);
      const stat = statSync(skillDir);

      if (!stat.isDirectory()) continue;

      const skillPath = join(skillDir, 'SKILL.md');
      try {
        const content = readFileSync(skillPath, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        // Extract body (content after frontmatter)
        let body = content;
        const lines = content.split('\n');
        if (lines[0] && lines[0].trim() === '---') {
          let endIndex = -1;
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
              endIndex = i;
              break;
            }
          }
          if (endIndex !== -1) {
            body = lines.slice(endIndex + 1).join('\n');
          }
        }

        skills.push({
          name: entry,
          dir: skillDir,
          path: skillPath,
          frontmatter,
          body
        });
      } catch (err) {
        // Skip directories without SKILL.md
        continue;
      }
    }
  } catch (err) {
    console.error(`Error walking skills directory: ${err.message}`);
  }

  return skills;
}

/**
 * Extract the tier from a frontmatter object.
 * Reads the 'layer:' field (the established field name).
 * Returns the tier string or null if not present.
 */
function tierOf(frontmatter) {
  return frontmatter.layer || null;
}

/**
 * Compute tier counts from the current skill set.
 * Returns { capability: N, coordinator: N, orchestrator: N, substrate: N }.
 */
function tierCounts() {
  const skills = walkSkills();
  const counts = {
    capability: 0,
    coordinator: 0,
    orchestrator: 0,
    substrate: 0
  };

  for (const skill of skills) {
    const tier = tierOf(skill.frontmatter);
    if (tier && counts.hasOwnProperty(tier)) {
      counts[tier]++;
    }
  }

  return counts;
}

/**
 * Count lines in a text string.
 */
function lineCount(text) {
  return text.split('\n').length;
}

/**
 * Read and parse a JSON file with error handling.
 * Returns { ok: true, value: <parsed> } on success.
 * Returns { ok: false, error: <message> } on failure.
 */
function readJSON(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    const value = JSON.parse(content);
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export {
  parseFrontmatter,
  SKILLS_DIR,
  walkSkills,
  tierOf,
  tierCounts,
  lineCount,
  readJSON,
  repoRoot,
  DISPATCHED_ONLY,
  ADVISORY_REVIEWERS,
  SUBSTRATE_SKILLS,
  VALID_TIERS,
  EXPECTED_TIER_COUNTS
};
