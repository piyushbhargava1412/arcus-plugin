// Layer-1 INTEGRATION suite: runs the pure L1 checks against the LIVE tree
// (all skills, manifests). Uses the module-level default counter. Later tasks
// append more check invocations here. `node tests/integration.mjs` exits
// non-zero on any failure.

import { assert, section, exitWithReport } from './lib/assert.mjs';
import { walkSkills, readJSON, repoRoot, VALID_TIERS, ADVISORY_REVIEWERS } from './lib/skills.mjs';
import { checkManifests, checkFrontmatter, checkLineBudget, checkAdvisoryReadOnly, checkCapabilityNoState, checkNoInlinedDomain, checkCrossRefs } from './lib/checks.mjs';
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

section('L1-4: Advisory reviewers are read-only');
{
  const skills = walkSkills();
  let advisoryFailures = 0;

  for (const skill of skills) {
    // Only check advisory reviewers
    if (!ADVISORY_REVIEWERS.has(skill.name)) {
      continue;
    }

    const result = checkAdvisoryReadOnly({
      name: skill.name,
      frontmatter: skill.frontmatter,
      advisorySet: ADVISORY_REVIEWERS
    });

    if (!result.ok) {
      advisoryFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(advisoryFailures === 0, `L1-4: all ${ADVISORY_REVIEWERS.size} advisory reviewers are read-only (${advisoryFailures} failures)`);
}

section('L1-5: Capabilities hold no orchestration state');
{
  const skills = walkSkills();
  let stateFailures = 0;

  for (const skill of skills) {
    const tier = skill.frontmatter.layer;

    // Only check capabilities
    if (tier !== 'capability') {
      continue;
    }

    const result = checkCapabilityNoState({
      name: skill.name,
      tier,
      body: skill.body
    });

    if (!result.ok) {
      stateFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  const capabilityCount = skills.filter(s => s.frontmatter.layer === 'capability').length;
  assert(stateFailures === 0, `L1-5: all ${capabilityCount} capabilities hold no orchestration state (${stateFailures} failures)`);
}

section('L1-6: Orchestrators/coordinators no inlined domain logic (advisory)');
{
  const skills = walkSkills();
  let totalWarnings = 0;

  for (const skill of skills) {
    const tier = skill.frontmatter.layer;

    // Only check orchestrators and coordinators
    if (tier !== 'orchestrator' && tier !== 'coordinator') {
      continue;
    }

    const result = checkNoInlinedDomain({
      name: skill.name,
      tier,
      body: skill.body
    });

    if (result.warnings && result.warnings.length > 0) {
      totalWarnings += result.warnings.length;
      console.log(`  WARNING: ${skill.name}: ${result.warnings.join('; ')}`);
    }
  }

  const orchCoordCount = skills.filter(s => s.frontmatter.layer === 'orchestrator' || s.frontmatter.layer === 'coordinator').length;
  console.log(`  L1-6: checked ${orchCoordCount} orchestrators/coordinators, found ${totalWarnings} warnings (advisory only)`);
  // Note: This check never fails - it only warns
  assert(true, 'L1-6: advisory check completed (warnings above are informational)');
}

section('L1-7: Cross-skill references resolve');
{
  const skills = walkSkills();
  const knownSkillNames = new Set(skills.map(s => s.name));
  let refFailures = 0;

  for (const skill of skills) {
    const result = checkCrossRefs({
      name: skill.name,
      body: skill.body,
      knownSkillNames
    });

    if (!result.ok) {
      refFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(refFailures === 0, `L1-7: all ${skills.length} skills have valid cross-references (${refFailures} failures)`);
}

section('L1-8: Bundled-resource paths resolve');
{
  const skills = walkSkills();
  const { checkResourcePaths } = await import('./lib/checks.mjs');
  let resourceFailures = 0;

  for (const skill of skills) {
    // Injected fileExists predicate rooted at skill dir
    const fileExists = (resourcePath) => {
      const fullPath = join(skill.dir, resourcePath);
      return existsSync(fullPath);
    };

    const result = checkResourcePaths({
      name: skill.name,
      dir: skill.dir,
      body: skill.body,
      fileExists
    });

    if (!result.ok) {
      resourceFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(resourceFailures === 0, `L1-8: all ${skills.length} skills have valid resource paths (${resourceFailures} failures)`);
}

section('L1-9: Hooks integrity');
{
  const { checkHooks } = await import('./lib/checks.mjs');
  const hooksJsonPath = join(repoRoot, 'plugins/arcus/hooks/hooks.json');
  const hooksJsonResult = readJSON(hooksJsonPath);

  assert(hooksJsonResult.ok, `hooks.json is valid JSON (${hooksJsonResult.error || 'ok'})`);

  if (hooksJsonResult.ok) {
    // Injected scriptExists predicate rooted at plugin root
    const scriptExists = (scriptPath) => {
      const fullPath = join(repoRoot, 'plugins/arcus', scriptPath);
      return existsSync(fullPath);
    };

    const result = checkHooks({
      hooksJson: hooksJsonResult.value,
      scriptExists
    });

    assert(result.ok, `L1-9: hooks integrity (${result.errors.join('; ') || 'ok'})`);
  }
}

section('L1-10: Single model-resolution point');
{
  const skills = walkSkills();
  const { checkNoInlineModel } = await import('./lib/checks.mjs');
  let modelFailures = 0;

  for (const skill of skills) {
    const result = checkNoInlineModel({
      name: skill.name,
      body: skill.body
    });

    if (!result.ok) {
      modelFailures++;
      console.error(`  ${skill.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(modelFailures === 0, `L1-10: all ${skills.length} skills use arcus:model-strategy (${modelFailures} failures)`);
}

exitWithReport();
