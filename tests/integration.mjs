// Layer-1 INTEGRATION suite: runs the pure L1 checks against the LIVE tree
// (all skills, manifests). Uses the module-level default counter. Later tasks
// append more check invocations here. `node tests/integration.mjs` exits
// non-zero on any failure.

import { assert, section, exitWithReport } from './lib/assert.mjs';
import { walkSkills, readJSON, repoRoot, VALID_TIERS } from './lib/skills.mjs';
import { checkManifests, checkFrontmatter, checkLineBudget } from './lib/checks.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

section('L1-1: Manifest validity');
{
  const pluginJsonPath = join(repoRoot, 'plugins/arcus/.claude-plugin/plugin.json');
  const marketplaceJsonPath = join(repoRoot, '.claude-plugin/marketplace.json');

  const pluginJsonResult = readJSON(pluginJsonPath);
  const marketplaceJsonResult = readJSON(marketplaceJsonPath);

  assert(pluginJsonResult.ok, `plugin.json is valid JSON (${pluginJsonResult.error || 'ok'})`);
  assert(marketplaceJsonResult.ok, `marketplace.json is valid JSON (${marketplaceJsonResult.error || 'ok'})`);

  if (pluginJsonResult.ok && marketplaceJsonResult.ok) {
    const sourcePath = join(repoRoot, 'plugins/arcus');
    const sourceResolves = existsSync(sourcePath);

    const result = checkManifests({
      pluginJson: pluginJsonResult.value,
      marketplaceJson: marketplaceJsonResult.value,
      sourceResolves
    });

    assert(result.ok, `L1-1: manifest validity (${result.errors.join('; ') || 'ok'})`);
  }
}

section('L1-2: Frontmatter validity');
{
  const skills = walkSkills();
  let frontmatterFailures = 0;

  for (const skill of skills) {
    const result = checkFrontmatter({
      name: skill.name,
      dir: skill.dir,
      frontmatter: skill.frontmatter,
      body: skill.body
    });

    if (!result.ok) {
      frontmatterFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(frontmatterFailures === 0, `L1-2: all ${skills.length} skills have valid frontmatter (${frontmatterFailures} failures)`);
}

section('L1-3: Line budget');
{
  const skills = walkSkills();
  let budgetFailures = 0;

  for (const skill of skills) {
    // Read full file text to get accurate line count
    const fullText = readFileSync(skill.path, 'utf-8');

    const result = checkLineBudget({
      name: skill.name,
      body: skill.body,
      fullText
    });

    if (!result.ok) {
      budgetFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(budgetFailures === 0, `L1-3: all ${skills.length} skills are within 500-line budget (${budgetFailures} failures)`);
}

exitWithReport();
