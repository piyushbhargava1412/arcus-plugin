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
const AGENTS_DIR = resolve(repoRoot, 'plugins/arcus/agents');

// Roster constants (name-based, STABLE)
const DISPATCHED_ONLY = new Set([
  'code-quality-reviewer',
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

// Intentionally NO hard-coded expected tier counts: the skill roster changes over
// time (e.g. write-evals was added by ARC-0007). The suite asserts RELATIONAL
// invariants via tierCounts() — every skill has a valid tier, the named dispatched-only
// and advisory sets resolve — rather than a brittle exact total that rots on every add.

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
/**
 * Extract the body of a SKILL.md / agent .md file: everything after the closing
 * `---` of the leading frontmatter block. If there is no frontmatter, the whole
 * content is the body. Shared by walkSkills() and walkAgents() so the parse rule
 * lives in exactly one place.
 */
function extractBody(content) {
  const lines = content.split('\n');
  if (lines[0] && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        return lines.slice(i + 1).join('\n');
      }
    }
  }
  return content;
}

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
        const body = extractBody(content);

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
 * Walk all agent files in plugins/arcus/agents and return metadata for each.
 * Agents are FLAT files (`agents/<name>.md`), not per-agent directories, so the
 * agent name is the file basename (minus `.md`). Every `.md` file in the directory
 * is treated as a dispatched persona — no documentation files belong here.
 * Returns array of { name, dir, path, frontmatter, body, surface:'agent' }.
 * Returns [] cleanly if the agents directory does not exist yet.
 */
function walkAgents() {
  const agents = [];

  let entries;
  try {
    entries = readdirSync(AGENTS_DIR);
  } catch (err) {
    // Agents directory absent (e.g. pre-migration) — no agents to report.
    return agents;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;

    const agentPath = join(AGENTS_DIR, entry);
    let stat;
    try {
      stat = statSync(agentPath);
    } catch (err) {
      continue;
    }
    if (!stat.isFile()) continue;

    try {
      const content = readFileSync(agentPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      const body = extractBody(content);

      agents.push({
        name: entry.replace(/\.md$/, ''),
        dir: AGENTS_DIR,
        path: agentPath,
        frontmatter,
        body,
        surface: 'agent'
      });
    } catch (err) {
      continue;
    }
  }

  return agents;
}

/**
 * Union of both ARCUS surfaces: skills (tagged surface:'skill') and agents
 * (tagged surface:'agent'). This is the source of truth for invariants and rosters
 * that apply REGARDLESS of surface — cross-reference resolution, frontmatter
 * validity, capability-no-state, eval-spec ownership, and roster membership
 * (ADVISORY_REVIEWERS / DISPATCHED_ONLY) all resolve over this union, so an item
 * satisfies its checks whether it lives in skills/ or agents/.
 * Returns array of { name, dir, path, frontmatter, body, surface }.
 */
function walkAll() {
  const skills = walkSkills().map(s => ({ ...s, surface: 'skill' }));
  const agents = walkAgents();
  return [...skills, ...agents];
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
 * Compute tier counts from the current item set.
 * Counts over the UNION of both surfaces (skills ∪ agents) because the role axis
 * (`layer:`) is independent of the surface axis (skills/ vs agents/) — moving a
 * capability from skills/ to agents/ must not change the role distribution.
 * Returns { capability: N, coordinator: N, orchestrator: N, substrate: N }.
 */
function tierCounts() {
  const items = walkAll();
  const counts = {
    capability: 0,
    coordinator: 0,
    orchestrator: 0,
    substrate: 0
  };

  for (const item of items) {
    const tier = tierOf(item.frontmatter);
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
  AGENTS_DIR,
  walkSkills,
  walkAgents,
  walkAll,
  tierOf,
  tierCounts,
  lineCount,
  readJSON,
  repoRoot,
  DISPATCHED_ONLY,
  ADVISORY_REVIEWERS,
  SUBSTRATE_SKILLS,
  VALID_TIERS
};
