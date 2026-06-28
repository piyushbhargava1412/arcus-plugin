// Layer-1 INTEGRATION suite: runs the pure L1 checks against the LIVE tree
// (all skills, manifests). Uses the module-level default counter. Later tasks
// append more check invocations here. `node tests/integration/integration.mjs` exits
// non-zero on any failure.

import { assert, section, exitWithReport } from '../lib/assert.mjs';
import { walkSkills, walkAgents, walkAll, readJSON, repoRoot, VALID_TIERS, ADVISORY_REVIEWERS } from '../lib/skills.mjs';
import { checkManifests, checkFrontmatter, checkLineBudget, checkAdvisoryReadOnly, checkCapabilityNoState, checkNoInlinedDomain, checkCrossRefs, checkAgentRefQualified, checkCapabilityHasEvalSpec, checkAgentFrontmatter } from '../lib/checks.mjs';
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
  // L1-2 owns the SKILL surface (checkFrontmatter); the AGENT surface is owned
  // exclusively by L1-13 (checkAgentFrontmatter) — no double-validation.
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
  const items = walkAll();
  let budgetFailures = 0;

  for (const item of items) {
    // Read full file text to get accurate line count
    const fullText = readFileSync(item.path, 'utf-8');

    const result = checkLineBudget({
      name: item.name,
      body: item.body,
      fullText
    });

    if (!result.ok) {
      budgetFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(budgetFailures === 0, `L1-3: all ${items.length} skills+agents are within 500-line budget (${budgetFailures} failures)`);
}

section('L1-4: Advisory reviewers are read-only');
{
  const items = walkAll();
  let advisoryFailures = 0;
  let advisoryChecked = 0;

  for (const item of items) {
    // Advisory membership is resolved over the union — a reviewer is checked whether
    // it lives in skills/ or agents/.
    if (!ADVISORY_REVIEWERS.has(item.name)) {
      continue;
    }
    advisoryChecked++;

    const result = checkAdvisoryReadOnly({
      name: item.name,
      frontmatter: item.frontmatter,
      advisorySet: ADVISORY_REVIEWERS
    });

    if (!result.ok) {
      advisoryFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(advisoryFailures === 0, `L1-4: all ${advisoryChecked} advisory reviewers are read-only (${advisoryFailures} failures)`);
}

section('L1-5: Capabilities hold no orchestration state');
{
  const items = walkAll();
  let stateFailures = 0;

  for (const item of items) {
    const tier = item.frontmatter.layer;

    // Only check capabilities (skill OR agent)
    if (tier !== 'capability') {
      continue;
    }

    const result = checkCapabilityNoState({
      name: item.name,
      tier,
      body: item.body
    });

    if (!result.ok) {
      stateFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  const capabilityCount = items.filter(s => s.frontmatter.layer === 'capability').length;
  assert(stateFailures === 0, `L1-5: all ${capabilityCount} capabilities hold no orchestration state (${stateFailures} failures)`);
}

section('L1-6: Orchestrators/coordinators no inlined domain logic (advisory)');
{
  const items = walkAll();
  let totalWarnings = 0;

  for (const item of items) {
    const tier = item.frontmatter.layer;

    // Only check orchestrators and coordinators
    if (tier !== 'orchestrator' && tier !== 'coordinator') {
      continue;
    }

    const result = checkNoInlinedDomain({
      name: item.name,
      tier,
      body: item.body
    });

    if (result.warnings && result.warnings.length > 0) {
      totalWarnings += result.warnings.length;
      console.log(`  WARNING: ${item.surface} ${item.name}: ${result.warnings.join('; ')}`);
    }
  }

  const orchCoordCount = items.filter(s => s.frontmatter.layer === 'orchestrator' || s.frontmatter.layer === 'coordinator').length;
  console.log(`  L1-6: checked ${orchCoordCount} orchestrators/coordinators, found ${totalWarnings} warnings (advisory only)`);
  // Note: This check never fails - it only warns
  assert(true, 'L1-6: advisory check completed (warnings above are informational)');
}

section('L1-7: Cross-skill references resolve');
{
  const items = walkAll();
  // Cross-references resolve over the UNION of both surfaces: an `arcus:<name>` token
  // is valid whether <name> is a skill directory or an agent file.
  const knownSkillNames = new Set(items.map(s => s.name));
  let refFailures = 0;

  for (const item of items) {
    const result = checkCrossRefs({
      name: item.name,
      body: item.body,
      knownSkillNames
    });

    if (!result.ok) {
      refFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(refFailures === 0, `L1-7: all ${items.length} skills+agents have valid cross-references (${refFailures} failures)`);
}

section('L1-8: Bundled-resource paths resolve');
{
  const items = walkAll();
  const { checkResourcePaths } = await import('../lib/checks.mjs');
  let resourceFailures = 0;

  for (const item of items) {
    // Injected fileExists predicate. Skills root at the skill dir; agents are flat
    // files (agents/<name>.md) whose bundled resources live OUTSIDE the agent glob,
    // under plugins/arcus/agent-resources/<name>/ — kept out of agents/ so the live
    // loader does not register companion .md files as phantom agents.
    const resourceRoot = item.surface === 'agent'
      ? join(repoRoot, 'plugins/arcus/agent-resources', item.name)
      : item.dir;
    const fileExists = (resourcePath) => {
      const fullPath = join(resourceRoot, resourcePath);
      return existsSync(fullPath);
    };

    const result = checkResourcePaths({
      name: item.name,
      dir: item.dir,
      body: item.body,
      fileExists
    });

    if (!result.ok) {
      resourceFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(resourceFailures === 0, `L1-8: all ${items.length} skills+agents have valid resource paths (${resourceFailures} failures)`);
}

section('L1-9: Hooks integrity');
{
  const { checkHooks } = await import('../lib/checks.mjs');
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
  const items = walkAll();
  const { checkNoInlineModel } = await import('../lib/checks.mjs');
  let modelFailures = 0;

  for (const item of items) {
    const result = checkNoInlineModel({
      name: item.name,
      body: item.body
    });

    if (!result.ok) {
      modelFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(modelFailures === 0, `L1-10: all ${items.length} skills+agents use arcus:model-strategy (${modelFailures} failures)`);
}

section('L1-11: Artifact-schema validation (live checkpoint + real artifacts)');
{
  const { validateJsonSchema, checkArtifactSections } = await import('../lib/checks.mjs');

  const specDir = join(repoRoot, '.arcus/specs/ARC-0007');
  const schemaResult = readJSON(join(repoRoot, 'tests/schemas/session-checkpoint.schema.json'));
  const artifactsResult = readJSON(join(repoRoot, 'tests/schemas/artifacts.json'));

  assert(schemaResult.ok, `session-checkpoint.schema.json is valid JSON (${schemaResult.error || 'ok'})`);
  assert(artifactsResult.ok, `artifacts.json is valid JSON (${artifactsResult.error || 'ok'})`);

  // Live checkpoint validation. .arcus/ is gitignored, so on CI the file may be
  // absent — SKIP cleanly (assert true) rather than fail when it does not exist.
  const checkpointPath = join(specDir, 'session-checkpoint.json');
  if (schemaResult.ok && existsSync(checkpointPath)) {
    const checkpointResult = readJSON(checkpointPath);
    assert(checkpointResult.ok, `live session-checkpoint.json is valid JSON (${checkpointResult.error || 'ok'})`);
    if (checkpointResult.ok) {
      const result = validateJsonSchema(checkpointResult.value, schemaResult.value);
      assert(result.ok, `L1-11: live checkpoint validates against schema (${result.errors.join('; ') || 'ok'})`);
    }
  } else {
    console.log('  [skip] .arcus/specs/ARC-0007/session-checkpoint.json absent (gitignored) — skipping live checkpoint validation');
    assert(true, 'L1-11: live checkpoint validation skipped (artifact absent)');
  }

  // Required-section validation for the real planning artifacts.
  if (artifactsResult.ok) {
    const artifactSpecs = artifactsResult.value;
    for (const fileName of Object.keys(artifactSpecs)) {
      const artifactPath = join(specDir, fileName);
      const requiredSections = artifactSpecs[fileName].requiredSections || [];

      if (existsSync(artifactPath)) {
        const text = readFileSync(artifactPath, 'utf-8');
        const result = checkArtifactSections(text, requiredSections);
        assert(result.ok, `L1-11: ${fileName} has all required sections (${result.errors.join('; ') || 'ok'})`);
      } else {
        console.log(`  [skip] .arcus/specs/ARC-0007/${fileName} absent (gitignored) — skipping section validation`);
        assert(true, `L1-11: ${fileName} section validation skipped (artifact absent)`);
      }
    }
  }
}

section('L1-12: Every capability owns a Layer-2 eval spec');
{
  const items = walkAll();
  const specsDir = join(repoRoot, 'tests/e2e/evals/specs');

  // Injected predicate: does specs/<name>/evals.json exist?
  const specExists = (skillName) => existsSync(join(specsDir, skillName, 'evals.json'));

  let evalSpecFailures = 0;
  for (const item of items) {
    const result = checkCapabilityHasEvalSpec({
      name: item.name,
      tier: item.frontmatter.layer,
      specExists
    });
    if (!result.ok) {
      evalSpecFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  const capabilityCount = items.filter(s => s.frontmatter.layer === 'capability').length;
  assert(evalSpecFailures === 0, `L1-12: all ${capabilityCount} capabilities own a Layer-2 eval spec (${evalSpecFailures} missing)`);
}

section('L1-13: Agent frontmatter validity (agent surface)');
{
  const agents = walkAgents();
  let agentFmFailures = 0;

  for (const agent of agents) {
    const result = checkAgentFrontmatter({ name: agent.name, frontmatter: agent.frontmatter });
    if (!result.ok) {
      agentFmFailures++;
      console.error(`  agent ${agent.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(agentFmFailures === 0, `L1-13: all ${agents.length} agents have valid frontmatter (${agentFmFailures} failures)`);
}

section('Layout sanity: skills/agents surface counts (ARC-0008)');
{
  // Guards the layout against future regression: 13 user-invocable
  // skills + 16 dispatched agents. Three of the skills are thin wrappers over a
  // sibling agent (test-spec-compiler, pull-request-builder, context-drift-sync).
  // ARC-0009 converted the four repo-context discovery skills to pure agents
  // (repo-overview-discovery, flow-discovery, test-pattern-discovery, design-pattern-discovery).
  const skillCount = walkSkills().length;
  const agentCount = walkAgents().length;
  assert(skillCount === 13, `skill dirs == 13 (got ${skillCount})`);
  assert(agentCount === 16, `agent files == 16 (got ${agentCount})`);
}

section('L1-14: Pure-agent dispatch references carry the "agent" qualifier');
{
  const items = walkAll();
  // PURE agents = agent basenames with NO sibling skill dir. Dual-surface items
  // (test-spec-compiler, pull-request-builder, context-drift-sync) have a skill
  // wrapper too, so a reference to them as either "skill" or "agent" is valid —
  // exclude them. (pureAgentNames derives this dynamically via the sibling-dir filter.)
  const skillNames = new Set(walkSkills().map(s => s.name));
  const pureAgentNames = new Set(walkAgents().map(a => a.name).filter(n => !skillNames.has(n)));

  let qualifierFailures = 0;
  for (const item of items) {
    const result = checkAgentRefQualified({
      name: item.name,
      body: item.body,
      pureAgentNames
    });
    if (!result.ok) {
      qualifierFailures++;
      console.error(`  ${item.surface} ${item.name}: ${result.errors.join('; ')}`);
    }
  }

  assert(qualifierFailures === 0, `L1-14: all ${items.length} skills+agents qualify pure-agent dispatch refs (${qualifierFailures} failures)`);
}

exitWithReport();
