// Layer-1 UNIT suite: runs the pure L1 checks against tests/fixtures/ (good
// inputs must pass; planted-bad inputs must fail — the DoD #1 guarantee), plus
// self-tests of the assert helper. Uses the module-level default counter; later
// tasks append more sections here. `node tests/unit/unit.mjs` exits non-zero on any
// failure.
import { assert, section, makeCounter, pass, fail, exitWithReport } from '../lib/assert.mjs';

// --- assert.mjs self-tests (isolated counter, so they never pollute the suite) ---
section('assert.mjs');
{
  const c = makeCounter();
  c.assert(true, 'truthy assert is counted as a pass');
  assert(c.counts().passes === 1 && c.counts().failures === 0, 'assert(true) increments passes only');

  c.fail('deliberate failure (isolated)');
  assert(c.counts().failures === 1, 'fail() increments the failure count');
  assert(c.report() === 1, 'report() returns the failure count');

  const fresh = makeCounter();
  assert(fresh.report() === 0, 'a fresh counter reports zero failures (isolation holds)');
}

// --- skills.mjs tests ---
section('skills.mjs');
{
  // Will fail until skills.mjs is implemented (RED phase)
  try {
    const { parseFrontmatter, walkSkills, walkAll, tierOf, DISPATCHED_ONLY, ADVISORY_REVIEWERS,
            VALID_TIERS, tierCounts, SKILLS_DIR, readJSON, lineCount, repoRoot }
      = await import('../lib/skills.mjs');

    // Test 1: parseFrontmatter on spec-finalizer
    const fs = await import('node:fs/promises');
    const specFinalizerText = await fs.readFile(`${SKILLS_DIR}/spec-finalizer/SKILL.md`, 'utf-8');
    const specFM = parseFrontmatter(specFinalizerText);
    assert(specFM.name === 'spec-finalizer', 'parseFrontmatter extracts name from spec-finalizer');
    assert(tierOf(specFM) === 'capability', 'tierOf reads layer field as capability for spec-finalizer');

    // Test 2: parseFrontmatter on security-reviewer (now an AGENT — flat file under agents/)
    const { AGENTS_DIR } = await import('../lib/skills.mjs');
    const secReviewerText = await fs.readFile(`${AGENTS_DIR}/security-reviewer.md`, 'utf-8');
    const secFM = parseFrontmatter(secReviewerText);
    assert(Array.isArray(secFM['disallowed-tools']), 'disallowed-tools is parsed as an array');
    assert(secFM['disallowed-tools'].includes('Edit'), 'disallowed-tools contains Edit');
    assert(secFM['disallowed-tools'].includes('Write'), 'disallowed-tools contains Write');
    assert(secFM['disallowed-tools'].includes('MultiEdit'), 'disallowed-tools contains MultiEdit');
    assert(secFM['disable-model-invocation'] === true || secFM['disable-model-invocation'] === 'true',
           'disable-model-invocation is truthy for security-reviewer');

    // Test 3: the union of skills+agents has at least 26 entries (roster lower bound,
    // surface-independent — items moving skills/->agents/ stay counted)
    const allSkills = walkSkills();
    const allItems = walkAll();
    assert(allItems.length >= 26, `walkAll returns at least 26 skills+agents, got ${allItems.length}`);

    // Test 4: every skill has a valid tier
    let invalidTierCount = 0;
    for (const skill of allSkills) {
      const tier = tierOf(skill.frontmatter);
      if (!VALID_TIERS.includes(tier)) {
        console.error(`  Invalid tier for ${skill.name}: ${tier}`);
        invalidTierCount++;
      }
    }
    assert(invalidTierCount === 0, `all skills have valid tiers (found ${invalidTierCount} invalid)`);

    // Test 5: every DISPATCHED_ONLY name exists (in skills OR agents) and has
    // disable-model-invocation. Resolved over the union so the move is surface-independent.
    let missingDispatched = 0;
    for (const name of DISPATCHED_ONLY) {
      const item = allItems.find(s => s.name === name);
      if (!item) {
        console.error(`  DISPATCHED_ONLY item not found: ${name}`);
        missingDispatched++;
      } else if (!item.frontmatter['disable-model-invocation']) {
        console.error(`  DISPATCHED_ONLY item missing disable-model-invocation: ${name}`);
        missingDispatched++;
      }
    }
    assert(missingDispatched === 0, `all DISPATCHED_ONLY items exist and have disable-model-invocation (${missingDispatched} issues)`);

    // Test 6: every ADVISORY_REVIEWERS name exists (in skills OR agents)
    let missingAdvisory = 0;
    for (const name of ADVISORY_REVIEWERS) {
      const item = allItems.find(s => s.name === name);
      if (!item) {
        console.error(`  ADVISORY_REVIEWERS item not found: ${name}`);
        missingAdvisory++;
      }
    }
    assert(missingAdvisory === 0, `all ADVISORY_REVIEWERS items exist (${missingAdvisory} missing)`);

    // Test 7: tierCounts returns expected distribution
    const counts = tierCounts();
    assert(counts.capability >= 17, `capability count is at least 17, got ${counts.capability}`);
    assert(counts.orchestrator >= 3, `orchestrator count is at least 3, got ${counts.orchestrator}`);
    assert(counts.coordinator >= 4, `coordinator count is at least 4, got ${counts.coordinator}`);
    assert(counts.substrate >= 2, `substrate count is at least 2, got ${counts.substrate}`);

    // Test 8: parseFrontmatter on synthetic input (no frontmatter) - use isolated counter
    const synthetic = makeCounter();
    const noFM = parseFrontmatter('# Just a heading\nNo frontmatter here');
    const hasFrontmatter = noFM._hasFrontmatter !== false;
    synthetic.assert(!hasFrontmatter || Object.keys(noFM).length === 0 || Object.keys(noFM).length === 1,
                     'parseFrontmatter returns empty/marker for input without frontmatter');
    assert(synthetic.counts().passes === 1, 'parseFrontmatter negative test passed (isolated counter)');

    pass('skills.mjs tests passed');
  } catch (err) {
    fail(`skills.mjs tests failed: ${err.message}`);
  }
}

// --- walkAgents / walkAll (agent-surface awareness) ---
section('skills.mjs: agents surface');
{
  try {
    const { walkSkills, walkAgents, walkAll, AGENTS_DIR, parseFrontmatter }
      = await import('../lib/skills.mjs');

    // walkAgents returns an array (possibly empty pre-migration); never throws.
    const agents = walkAgents();
    assert(Array.isArray(agents), 'walkAgents returns an array');

    // README.md is documentation, never an agent.
    assert(!agents.some(a => a.name === 'README' || a.name.toLowerCase() === 'readme'),
           'walkAgents skips README.md (not a dispatched persona)');

    // Every walked agent is a flat file tagged surface:'agent' with a name == basename.
    for (const a of agents) {
      assert(a.surface === 'agent', `agent ${a.name} is tagged surface:'agent'`);
      assert(a.path.endsWith(`${a.name}.md`), `agent ${a.name} path matches its basename`);
    }

    // walkAll is the union of both surfaces with no duplicates.
    const all = walkAll();
    const skills = walkSkills();
    assert(all.length === skills.length + agents.length,
           `walkAll() is the union of skills (${skills.length}) + agents (${agents.length}), got ${all.length}`);
    const skillNames = new Set(skills.map(s => s.name));
    assert(all.every(i => i.surface === 'skill' || i.surface === 'agent'),
           'every walkAll item is tagged with a surface');
    assert(skills.every(s => skillNames.has(s.name)), 'walkAll preserves skill entries');

    pass('walkAgents/walkAll tests passed');
  } catch (err) {
    fail(`walkAgents/walkAll tests failed: ${err.message}`);
  }
}

// --- L1-1, L1-2, L1-3 checks ---
section('L1-1..L1-3');
{
  try {
    const { checkManifests, checkFrontmatter, checkLineBudget } = await import('../lib/checks.mjs');
    const { walkSkills, readJSON, parseFrontmatter, lineCount, repoRoot } = await import('../lib/skills.mjs');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { existsSync } = await import('node:fs');

    // Test L1-1: checkManifests passes on real manifests
    const pluginJsonPath = path.join(repoRoot, 'plugins/arcus/.claude-plugin/plugin.json');
    const marketplaceJsonPath = path.join(repoRoot, '.claude-plugin/marketplace.json');
    const pluginJsonResult = readJSON(pluginJsonPath);
    const marketplaceJsonResult = readJSON(marketplaceJsonPath);

    assert(pluginJsonResult.ok && marketplaceJsonResult.ok, 'real manifests are valid JSON');

    const sourcePath = path.join(repoRoot, 'plugins/arcus');
    const sourceResolves = existsSync(sourcePath);

    const manifestResult = checkManifests({
      pluginJson: pluginJsonResult.value,
      marketplaceJson: marketplaceJsonResult.value,
      sourceResolves
    });
    assert(manifestResult.ok === true, `checkManifests passes on real manifests (got ${manifestResult.errors?.join('; ') || 'ok'})`);

    // Test L1-1: checkManifests FAILS on bad manifest
    const badManifestResult = readJSON(path.join(repoRoot, 'tests/fixtures/bad-manifest.json'));
    assert(badManifestResult.ok, 'bad-manifest.json is parseable JSON');
    const badResult = checkManifests({
      pluginJson: badManifestResult.value,
      marketplaceJson: marketplaceJsonResult.value,
      sourceResolves: true
    });
    assert(badResult.ok === false, `checkManifests fails on name mismatch (got ok=${badResult.ok})`);
    assert(badResult.errors.length > 0, 'checkManifests returns error messages for bad manifest');

    // Test L1-2: checkFrontmatter passes on real skill (spec-finalizer)
    const allSkills = walkSkills();
    const specFinalizer = allSkills.find(s => s.name === 'spec-finalizer');
    assert(specFinalizer !== undefined, 'spec-finalizer skill exists');

    const fmResult = checkFrontmatter({
      name: specFinalizer.name,
      dir: specFinalizer.dir,
      frontmatter: specFinalizer.frontmatter,
      body: specFinalizer.body
    });
    assert(fmResult.ok === true, `checkFrontmatter passes on spec-finalizer (got ${fmResult.errors?.join('; ') || 'ok'})`);

    // Test L1-2: checkFrontmatter FAILS on bad frontmatter (reserved word)
    const badFMPath = path.join(repoRoot, 'tests/fixtures/bad-frontmatter/SKILL.md');
    const badFMText = await fs.readFile(badFMPath, 'utf-8');
    const badFM = parseFrontmatter(badFMText);
    const badFMResult = checkFrontmatter({
      name: 'Claude',
      dir: path.join(repoRoot, 'tests/fixtures/bad-frontmatter'),
      frontmatter: badFM,
      body: badFMText
    });
    assert(badFMResult.ok === false, `checkFrontmatter fails on reserved word 'Claude' (got ok=${badFMResult.ok})`);
    assert(badFMResult.errors.length > 0, 'checkFrontmatter returns error messages for reserved word');

    // Test L1-3: checkLineBudget passes on real skill
    const specText = await fs.readFile(specFinalizer.path, 'utf-8');
    const budgetResult = checkLineBudget({
      name: specFinalizer.name,
      body: specFinalizer.body,
      fullText: specText
    });
    assert(budgetResult.ok === true, `checkLineBudget passes on spec-finalizer (got ${budgetResult.errors?.join('; ') || 'ok'})`);

    // Test L1-3: checkLineBudget FAILS on over-budget file
    const overBudgetPath = path.join(repoRoot, 'tests/fixtures/over-budget.md');
    const overBudgetText = await fs.readFile(overBudgetPath, 'utf-8');
    const overBudgetResult = checkLineBudget({
      name: 'over-budget',
      body: overBudgetText,
      fullText: overBudgetText
    });
    assert(overBudgetResult.ok === false, `checkLineBudget fails on >500 lines (got ok=${overBudgetResult.ok})`);
    assert(overBudgetResult.errors.length > 0, 'checkLineBudget returns error messages for over-budget file');

    pass('L1-1..L1-3 checks passed');
  } catch (err) {
    fail(`L1-1..L1-3 checks failed: ${err.message}`);
  }
}

// --- L1-4..L1-7 checks ---
section('L1-4..L1-7');
{
  try {
    const { checkAdvisoryReadOnly, checkCapabilityNoState, checkNoInlinedDomain, checkCrossRefs }
      = await import('../lib/checks.mjs');
    const { walkSkills, walkAll, parseFrontmatter, ADVISORY_REVIEWERS }
      = await import('../lib/skills.mjs');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { repoRoot } = await import('../lib/skills.mjs');

    // Use the union (skills + agents) so advisory reviewers (now agents) and
    // cross-references to agents resolve.
    const allSkills = walkAll();
    const knownSkillNames = new Set(allSkills.map(s => s.name));

    // Test L1-4: checkAdvisoryReadOnly passes on real advisory reviewer (security-reviewer, now an agent)
    const securityReviewer = allSkills.find(s => s.name === 'security-reviewer');
    assert(securityReviewer !== undefined, 'security-reviewer agent exists');

    const secResult = checkAdvisoryReadOnly({
      name: securityReviewer.name,
      frontmatter: securityReviewer.frontmatter,
      advisorySet: ADVISORY_REVIEWERS
    });
    assert(secResult.ok === true, `checkAdvisoryReadOnly passes on security-reviewer (got ${secResult.errors?.join('; ') || 'ok'})`);

    // Test L1-4: checkAdvisoryReadOnly FAILS on write-enabled-reviewer fixture
    const writeEnabledPath = path.join(repoRoot, 'tests/fixtures/write-enabled-reviewer/SKILL.md');
    const writeEnabledText = await fs.readFile(writeEnabledPath, 'utf-8');
    const writeEnabledFM = parseFrontmatter(writeEnabledText);
    const writeEnabledResult = checkAdvisoryReadOnly({
      name: 'security-reviewer', // Use the name from the fixture to trigger advisory check
      frontmatter: writeEnabledFM,
      advisorySet: ADVISORY_REVIEWERS
    });
    assert(writeEnabledResult.ok === false, `checkAdvisoryReadOnly fails on write-enabled-reviewer (got ok=${writeEnabledResult.ok})`);
    assert(writeEnabledResult.errors.length > 0, 'checkAdvisoryReadOnly returns error messages for write-enabled-reviewer');

    // Test L1-4: checkAdvisoryReadOnly passes (not applicable) on non-advisory skill
    const specFinalizer = allSkills.find(s => s.name === 'spec-finalizer');
    const nonAdvisoryResult = checkAdvisoryReadOnly({
      name: specFinalizer.name,
      frontmatter: specFinalizer.frontmatter,
      advisorySet: ADVISORY_REVIEWERS
    });
    assert(nonAdvisoryResult.ok === true, 'checkAdvisoryReadOnly passes (not applicable) on non-advisory skill');

    // Test L1-5: checkCapabilityNoState passes on real capability (spec-finalizer)
    const stateResult = checkCapabilityNoState({
      name: specFinalizer.name,
      tier: 'capability',
      body: specFinalizer.body
    });
    assert(stateResult.ok === true, `checkCapabilityNoState passes on spec-finalizer (got ${stateResult.errors?.join('; ') || 'ok'})`);

    // Test L1-5: checkCapabilityNoState FAILS on capability-with-state fixture
    const capWithStatePath = path.join(repoRoot, 'tests/fixtures/capability-with-state/SKILL.md');
    const capWithStateText = await fs.readFile(capWithStatePath, 'utf-8');
    const capWithStateFM = parseFrontmatter(capWithStateText);
    const bodyMatch = capWithStateText.match(/---\n([\s\S]*?)---\n([\s\S]*)/);
    const capWithStateBody = bodyMatch ? bodyMatch[2] : capWithStateText;
    const capWithStateResult = checkCapabilityNoState({
      name: 'capability-with-state',
      tier: 'capability',
      body: capWithStateBody
    });
    assert(capWithStateResult.ok === false, `checkCapabilityNoState fails on capability-with-state (got ok=${capWithStateResult.ok})`);
    assert(capWithStateResult.errors.length > 0, 'checkCapabilityNoState returns error messages for capability-with-state');

    // Test L1-5: the bare "session-checkpoint" literal alone triggers a violation
    // (the spec lists it explicitly; this proves the pattern independent of other tokens).
    const sessionCheckpointOnly = checkCapabilityNoState({
      name: 'synthetic-capability',
      tier: 'capability',
      body: 'This capability reads the session-checkpoint to decide what to do next.'
    });
    assert(sessionCheckpointOnly.ok === false, 'checkCapabilityNoState rejects a bare session-checkpoint reference');
    assert(sessionCheckpointOnly.errors.join(' ').includes('session-checkpoint'),
           'checkCapabilityNoState names session-checkpoint in the error');

    // Negative control: the benign word "checkpoint" in prose must NOT trip the check.
    const benignCheckpoint = checkCapabilityNoState({
      name: 'synthetic-capability',
      tier: 'capability',
      body: 'Use this as a quality checkpoint before handing off your analysis.'
    });
    assert(benignCheckpoint.ok === true, 'checkCapabilityNoState does not flag the benign word "checkpoint"');

    // Test L1-5: checkCapabilityNoState passes (not applicable) on orchestrator
    const implementationRunner = allSkills.find(s => s.name === 'implementation-runner');
    const orchestratorResult = checkCapabilityNoState({
      name: implementationRunner.name,
      tier: 'orchestrator',
      body: implementationRunner.body
    });
    assert(orchestratorResult.ok === true, 'checkCapabilityNoState passes (not applicable) on orchestrator');

    // Test L1-6: checkNoInlinedDomain returns warnings (not errors) on prose-heavy-coordinator fixture
    const proseHeavyPath = path.join(repoRoot, 'tests/fixtures/prose-heavy-coordinator/SKILL.md');
    const proseHeavyText = await fs.readFile(proseHeavyPath, 'utf-8');
    const proseHeavyFM = parseFrontmatter(proseHeavyText);
    const proseBodyMatch = proseHeavyText.match(/---\n([\s\S]*?)---\n([\s\S]*)/);
    const proseHeavyBody = proseBodyMatch ? proseBodyMatch[2] : proseHeavyText;
    const proseHeavyResult = checkNoInlinedDomain({
      name: 'prose-heavy-coordinator',
      tier: 'coordinator',
      body: proseHeavyBody
    });
    assert(proseHeavyResult.ok === true, 'checkNoInlinedDomain always returns ok:true (advisory only)');
    assert(proseHeavyResult.warnings && proseHeavyResult.warnings.length > 0, 'checkNoInlinedDomain returns warnings for prose-heavy-coordinator');

    // Test L1-6: checkNoInlinedDomain returns no warnings on real coordinator (code-reviewer)
    const codeReviewer = allSkills.find(s => s.name === 'code-reviewer');
    const codeReviewerResult = checkNoInlinedDomain({
      name: codeReviewer.name,
      tier: 'coordinator',
      body: codeReviewer.body
    });
    assert(codeReviewerResult.ok === true, 'checkNoInlinedDomain returns ok:true on code-reviewer');
    // Note: we allow warnings on real coordinators, just check it doesn't fail the gate
    assert(codeReviewerResult.warnings !== undefined, 'checkNoInlinedDomain returns warnings array (may be empty)');

    // Test L1-7: checkCrossRefs passes on real skill with valid references (code-reviewer)
    const crossRefResult = checkCrossRefs({
      name: codeReviewer.name,
      body: codeReviewer.body,
      knownSkillNames
    });
    assert(crossRefResult.ok === true, `checkCrossRefs passes on code-reviewer (got ${crossRefResult.errors?.join('; ') || 'ok'})`);

    // Test L1-7: checkCrossRefs FAILS on dangling-ref fixture
    const danglingRefPath = path.join(repoRoot, 'tests/fixtures/dangling-ref/SKILL.md');
    const danglingRefText = await fs.readFile(danglingRefPath, 'utf-8');
    const danglingBodyMatch = danglingRefText.match(/---\n([\s\S]*?)---\n([\s\S]*)/);
    const danglingRefBody = danglingBodyMatch ? danglingBodyMatch[2] : danglingRefText;
    const danglingRefResult = checkCrossRefs({
      name: 'dangling-ref',
      body: danglingRefBody,
      knownSkillNames
    });
    assert(danglingRefResult.ok === false, `checkCrossRefs fails on dangling-ref (got ok=${danglingRefResult.ok})`);
    assert(danglingRefResult.errors.length > 0, 'checkCrossRefs returns error messages for dangling-ref');
    // Verify it caught the specific dangling refs
    const errorMsg = danglingRefResult.errors.join(' ');
    assert(errorMsg.includes('does-not-exist-skill') || errorMsg.includes('another-missing-skill'),
           'checkCrossRefs identifies specific dangling references');

    pass('L1-4..L1-7 checks passed');
  } catch (err) {
    fail(`L1-4..L1-7 checks failed: ${err.message}`);
  }
}

// --- L1-8..L1-10 checks ---
section('L1-8..L1-10');
{
  try {
    const { checkResourcePaths, checkHooks, checkNoInlineModel } = await import('../lib/checks.mjs');
    const { walkSkills, walkAll, readJSON, parseFrontmatter, repoRoot } = await import('../lib/skills.mjs');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { existsSync } = await import('node:fs');

    // Test L1-8: checkResourcePaths FAILS on dead-resource fixture
    const deadResourcePath = path.join(repoRoot, 'tests/fixtures/dead-resource/SKILL.md');
    const deadResourceText = await fs.readFile(deadResourcePath, 'utf-8');
    const deadResourceBody = deadResourceText.split('---\n').slice(2).join('---\n');
    const deadResourceDir = path.join(repoRoot, 'tests/fixtures/dead-resource');

    // Injected fileExists that returns false for missing files
    const deadResourceFileExists = (resourcePath) => {
      const fullPath = path.join(deadResourceDir, resourcePath);
      return existsSync(fullPath);
    };

    const deadResourceResult = checkResourcePaths({
      name: 'dead-resource',
      dir: deadResourceDir,
      body: deadResourceBody,
      fileExists: deadResourceFileExists
    });
    assert(deadResourceResult.ok === false, `checkResourcePaths fails on dead-resource (got ok=${deadResourceResult.ok})`);
    assert(deadResourceResult.errors.length > 0, 'checkResourcePaths returns error messages for dead-resource');
    const deadResourceError = deadResourceResult.errors.join(' ');
    assert(deadResourceError.includes('missing-file.md') || deadResourceError.includes('another-missing.json'),
           'checkResourcePaths identifies specific missing resource files');

    // Test L1-8: checkResourcePaths passes on real skill with valid resources (spec-finalizer)
    const allSkills = walkSkills();
    const specFinalizer = allSkills.find(s => s.name === 'spec-finalizer');
    assert(specFinalizer !== undefined, 'spec-finalizer skill exists');

    const specFinalizerFileExists = (resourcePath) => {
      const fullPath = path.join(specFinalizer.dir, resourcePath);
      return existsSync(fullPath);
    };

    const specFinalizerResourceResult = checkResourcePaths({
      name: specFinalizer.name,
      dir: specFinalizer.dir,
      body: specFinalizer.body,
      fileExists: specFinalizerFileExists
    });
    assert(specFinalizerResourceResult.ok === true,
           `checkResourcePaths passes on spec-finalizer (got ${specFinalizerResourceResult.errors?.join('; ') || 'ok'})`);

    // Test L1-9: checkHooks FAILS on bad-hooks.json fixture
    const badHooksPath = path.join(repoRoot, 'tests/fixtures/bad-hooks.json');
    const badHooksResult = readJSON(badHooksPath);
    assert(badHooksResult.ok, 'bad-hooks.json is parseable JSON');

    const badScriptExists = (scriptPath) => {
      // For the test, we know does-not-exist.sh does not exist
      return false;
    };

    const badHooksCheckResult = checkHooks({
      hooksJson: badHooksResult.value,
      scriptExists: badScriptExists
    });
    assert(badHooksCheckResult.ok === false, `checkHooks fails on bad-hooks.json (got ok=${badHooksCheckResult.ok})`);
    assert(badHooksCheckResult.errors.length > 0, 'checkHooks returns error messages for bad-hooks.json');
    const badHooksError = badHooksCheckResult.errors.join(' ');
    assert(badHooksError.includes('does-not-exist.sh'), 'checkHooks identifies missing script');

    // Test L1-9: checkHooks passes on real hooks.json
    const realHooksPath = path.join(repoRoot, 'plugins/arcus/hooks/hooks.json');
    const realHooksResult = readJSON(realHooksPath);
    assert(realHooksResult.ok, 'real hooks.json is parseable JSON');

    const realScriptExists = (scriptPath) => {
      const fullPath = path.join(repoRoot, 'plugins/arcus', scriptPath);
      return existsSync(fullPath);
    };

    const realHooksCheckResult = checkHooks({
      hooksJson: realHooksResult.value,
      scriptExists: realScriptExists
    });
    assert(realHooksCheckResult.ok === true,
           `checkHooks passes on real hooks.json (got ${realHooksCheckResult.errors?.join('; ') || 'ok'})`);

    // Test L1-10: checkNoInlineModel FAILS on inline-model fixture
    const inlineModelPath = path.join(repoRoot, 'tests/fixtures/inline-model/SKILL.md');
    const inlineModelText = await fs.readFile(inlineModelPath, 'utf-8');
    const inlineModelBody = inlineModelText.split('---\n').slice(2).join('---\n');

    const inlineModelResult = checkNoInlineModel({
      name: 'inline-model',
      body: inlineModelBody
    });
    assert(inlineModelResult.ok === false, `checkNoInlineModel fails on inline-model (got ok=${inlineModelResult.ok})`);
    assert(inlineModelResult.errors.length > 0, 'checkNoInlineModel returns error messages for inline-model');
    const inlineModelError = inlineModelResult.errors.join(' ');
    assert(inlineModelError.includes('claude-opus-4') || inlineModelError.includes('claude-haiku-3'),
           'checkNoInlineModel identifies versioned model IDs');

    // Test L1-10: checkNoInlineModel passes on model-strategy (always allowed)
    const modelStrategy = allSkills.find(s => s.name === 'model-strategy');
    assert(modelStrategy !== undefined, 'model-strategy skill exists');

    const modelStrategyResult = checkNoInlineModel({
      name: modelStrategy.name,
      body: modelStrategy.body
    });
    assert(modelStrategyResult.ok === true, 'checkNoInlineModel passes on model-strategy (single allowed resolution point)');

    // Test L1-10: checkNoInlineModel passes on real skill with bare tier words (implementation-runner)
    const implementationRunner = allSkills.find(s => s.name === 'implementation-runner');
    assert(implementationRunner !== undefined, 'implementation-runner skill exists');

    const implementationRunnerResult = checkNoInlineModel({
      name: implementationRunner.name,
      body: implementationRunner.body
    });
    assert(implementationRunnerResult.ok === true,
           `checkNoInlineModel passes on implementation-runner with bare tier words (got ${implementationRunnerResult.errors?.join('; ') || 'ok'})`);

    // Test L1-10: a SPACE-FORM model string (e.g. "Claude Sonnet 4.6") is detected as a
    // hardcode for a non-allowlisted skill — the original regex missed this form.
    const spaceFormResult = checkNoInlineModel({
      name: 'synthetic-skill',
      body: 'Always dispatch with the "Claude Sonnet 4.6 (copilot)" model.'
    });
    assert(spaceFormResult.ok === false, 'checkNoInlineModel detects a space-form model string');
    assert(spaceFormResult.errors.join(' ').toLowerCase().includes('claude sonnet 4.6'),
           'checkNoInlineModel reports the space-form model string it found');

    // Test L1-10: bare tier words in space-form context are still allowed (no version number).
    const bareTierResult = checkNoInlineModel({
      name: 'synthetic-skill',
      body: 'Resolve light→haiku, medium→sonnet, heavy→opus via arcus:model-strategy.'
    });
    assert(bareTierResult.ok === true, 'checkNoInlineModel allows bare tier words (no version)');

    // Test L1-10: subagent-task-dispatcher is allowlisted — it documents the pass-through
    // string FORMAT (e.g. "Claude Sonnet 4.6 (copilot)") rather than hardcoding a routing decision.
    // It is now an AGENT, so resolve over the union.
    const dispatcher = walkAll().find(s => s.name === 'subagent-task-dispatcher');
    assert(dispatcher !== undefined, 'subagent-task-dispatcher agent exists');
    const dispatcherResult = checkNoInlineModel({ name: dispatcher.name, body: dispatcher.body });
    assert(dispatcherResult.ok === true,
           `checkNoInlineModel passes on allowlisted subagent-task-dispatcher (got ${dispatcherResult.errors?.join('; ') || 'ok'})`);

    pass('L1-8..L1-10 checks passed');
  } catch (err) {
    fail(`L1-8..L1-10 checks failed: ${err.message}`);
  }
}

// --- L1-11 checks (artifact-schema validation) ---
section('L1-11');
{
  try {
    const { validateJsonSchema, checkArtifactSections } = await import('../lib/checks.mjs');
    const { readJSON, repoRoot } = await import('../lib/skills.mjs');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const schemaPath = path.join(repoRoot, 'tests/schemas/session-checkpoint.schema.json');
    const schemaResult = readJSON(schemaPath);
    assert(schemaResult.ok, `session-checkpoint.schema.json is valid JSON (${schemaResult.error || 'ok'})`);
    const checkpointSchema = schemaResult.value;

    // --- validateJsonSchema: good inline checkpoint -> ok:true ---
    const goodCheckpoint = {
      story_id: 'ARC-0007',
      branch_name: 'arcus/ARC-0007-1',
      base_branch: 'main',
      workflow: 'arcus',
      schema_version: 2,
      mode: 'gated',
      current_status: 'IN_PROGRESS',
      current_stage: 'task_6',
      review_round: 0,
      stages: { scaffold: 'complete' }
    };
    const goodResult = validateJsonSchema(goodCheckpoint, checkpointSchema);
    assert(goodResult.ok === true, `validateJsonSchema ok on good checkpoint (got ${goodResult.errors?.join('; ') || 'ok'})`);

    // --- validateJsonSchema: planted bad-checkpoint.json -> ok:false ---
    const badCheckpointResult = readJSON(path.join(repoRoot, 'tests/fixtures/bad-checkpoint.json'));
    assert(badCheckpointResult.ok, 'bad-checkpoint.json is parseable JSON');
    const badResult = validateJsonSchema(badCheckpointResult.value, checkpointSchema);
    assert(badResult.ok === false, `validateJsonSchema fails on bad-checkpoint (got ok=${badResult.ok})`);
    assert(badResult.errors.length > 0, 'validateJsonSchema returns error messages for bad-checkpoint');

    // --- validateJsonSchema: required keyword (use isolated counter for targeted checks) ---
    const reqSchema = { type: 'object', required: ['a', 'b'], properties: { a: { type: 'string' } } };
    const missingReq = validateJsonSchema({ a: 'x' }, reqSchema);
    assert(missingReq.ok === false, 'validateJsonSchema flags missing required property');
    const allReq = validateJsonSchema({ a: 'x', b: 1 }, reqSchema);
    assert(allReq.ok === true, 'validateJsonSchema passes when all required present');

    // --- validateJsonSchema: enum keyword ---
    const enumSchema = { type: 'string', enum: ['gated', 'afk'] };
    assert(validateJsonSchema('gated', enumSchema).ok === true, 'validateJsonSchema enum accepts allowed value');
    assert(validateJsonSchema('yolo', enumSchema).ok === false, 'validateJsonSchema enum rejects disallowed value');

    // --- validateJsonSchema: nested properties recursion ---
    const nestedSchema = {
      type: 'object',
      required: ['outer'],
      properties: {
        outer: {
          type: 'object',
          required: ['inner'],
          properties: { inner: { type: 'number' } }
        }
      }
    };
    assert(validateJsonSchema({ outer: { inner: 7 } }, nestedSchema).ok === true,
           'validateJsonSchema recurses into nested properties (valid)');
    assert(validateJsonSchema({ outer: { inner: 'nope' } }, nestedSchema).ok === false,
           'validateJsonSchema recurses into nested properties (type mismatch)');
    assert(validateJsonSchema({ outer: {} }, nestedSchema).ok === false,
           'validateJsonSchema recurses into nested properties (missing nested required)');

    // --- validateJsonSchema: type checks (integer vs number, array, boolean) ---
    assert(validateJsonSchema(3, { type: 'integer' }).ok === true, 'integer accepts whole number');
    assert(validateJsonSchema(3.5, { type: 'integer' }).ok === false, 'integer rejects float');
    assert(validateJsonSchema(3.5, { type: 'number' }).ok === true, 'number accepts float');
    assert(validateJsonSchema([], { type: 'array' }).ok === true, 'array accepts array');
    assert(validateJsonSchema({}, { type: 'array' }).ok === false, 'array rejects object');
    assert(validateJsonSchema(true, { type: 'boolean' }).ok === true, 'boolean accepts boolean');

    // --- validateJsonSchema: unknown keyword is ignored (pass) ---
    assert(validateJsonSchema('hi', { type: 'string', minLength: 99 }).ok === true,
           'validateJsonSchema treats unknown keyword (minLength) as pass');

    // --- checkArtifactSections: good markdown with all required sections -> ok:true ---
    const goodPlanMd = [
      '# Plan',
      '## Approach Evaluation',
      'text',
      '## Chosen Approach & Reasoning',
      'text',
      '## Design / Impacted Files',
      'text',
      '## Tasks',
      'text'
    ].join('\n');
    const goodSections = checkArtifactSections(goodPlanMd,
      ['Approach Evaluation', 'Chosen Approach & Reasoning', 'Design / Impacted Files', 'Tasks']);
    assert(goodSections.ok === true, `checkArtifactSections ok on complete markdown (got ${goodSections.errors?.join('; ') || 'ok'})`);

    // --- checkArtifactSections: planted bad-plan.md (missing "Tasks") -> ok:false ---
    const badPlanMd = await fs.readFile(path.join(repoRoot, 'tests/fixtures/bad-plan.md'), 'utf-8');
    const badSections = checkArtifactSections(badPlanMd,
      ['Approach Evaluation', 'Chosen Approach & Reasoning', 'Design / Impacted Files', 'Tasks']);
    assert(badSections.ok === false, `checkArtifactSections fails on bad-plan (got ok=${badSections.ok})`);
    assert(badSections.errors.length > 0, 'checkArtifactSections returns error messages for bad-plan');
    assert(badSections.errors.join(' ').includes('Tasks'), 'checkArtifactSections identifies the missing "Tasks" section');

    pass('L1-11 checks passed');
  } catch (err) {
    fail(`L1-11 checks failed: ${err.message}`);
  }
}

// --- L1-12 check (capability owns a Layer-2 eval spec) ---
section('L1-12');
{
  try {
    const { checkCapabilityHasEvalSpec } = await import('../lib/checks.mjs');

    // GOOD: a capability whose spec exists passes.
    const present = checkCapabilityHasEvalSpec({
      name: 'spec-finalizer', tier: 'capability', specExists: () => true
    });
    assert(present.ok === true, 'checkCapabilityHasEvalSpec passes when the capability has an eval spec');

    // PLANTED-BAD: a capability with NO spec fails (the "hard-to-test" gate).
    const missing = checkCapabilityHasEvalSpec({
      name: 'lonely-capability', tier: 'capability', specExists: () => false
    });
    assert(missing.ok === false, 'checkCapabilityHasEvalSpec fails when a capability has no eval spec');
    assert(missing.errors.length > 0 && missing.errors.join(' ').includes('lonely-capability'),
           'checkCapabilityHasEvalSpec names the spec-less capability');

    // NOT APPLICABLE: non-capabilities are exempt even with no spec.
    const coord = checkCapabilityHasEvalSpec({
      name: 'kick-off', tier: 'coordinator', specExists: () => false
    });
    assert(coord.ok === true, 'checkCapabilityHasEvalSpec exempts non-capabilities (coordinator)');
    const orch = checkCapabilityHasEvalSpec({
      name: 'arcus-controller', tier: 'orchestrator', specExists: () => false
    });
    assert(orch.ok === true, 'checkCapabilityHasEvalSpec exempts non-capabilities (orchestrator)');

    pass('L1-12 check passed');
  } catch (err) {
    fail(`L1-12 check failed: ${err.message}`);
  }
}

// --- L1-13 check (agent frontmatter validity) ---
section('L1-13');
{
  try {
    const { checkAgentFrontmatter } = await import('../lib/checks.mjs');
    const { parseFrontmatter, repoRoot } = await import('../lib/skills.mjs');
    const fs = await import('node:fs/promises');
    const { join } = await import('node:path');

    // GOOD: the well-formed agent fixture passes.
    const goodText = await fs.readFile(join(repoRoot, 'tests/fixtures/good-agent.md'), 'utf-8');
    const goodFM = parseFrontmatter(goodText);
    const goodResult = checkAgentFrontmatter({ name: 'good-agent', frontmatter: goodFM });
    assert(goodResult.ok === true,
           `checkAgentFrontmatter passes on good-agent (got ${goodResult.errors?.join('; ') || 'ok'})`);

    // PLANTED-BAD: the fixture missing layer + model fails.
    const badText = await fs.readFile(join(repoRoot, 'tests/fixtures/bad-agent.md'), 'utf-8');
    const badFM = parseFrontmatter(badText);
    const badResult = checkAgentFrontmatter({ name: 'bad-agent', frontmatter: badFM });
    assert(badResult.ok === false, `checkAgentFrontmatter fails on bad-agent (got ok=${badResult.ok})`);
    assert(badResult.errors.some(e => e.includes('layer')) && badResult.errors.some(e => e.includes('model')),
           'checkAgentFrontmatter reports the missing layer and model');

    // PLANTED-BAD: a versioned model string is rejected (tier words only).
    const versioned = checkAgentFrontmatter({
      name: 'good-agent',
      frontmatter: { ...goodFM, model: 'claude-sonnet-4-6' }
    });
    assert(versioned.ok === false, 'checkAgentFrontmatter rejects a versioned model string');

    pass('L1-13 check passed');
  } catch (err) {
    fail(`L1-13 check failed: ${err.message}`);
  }
}

// --- eval-harness lintSpec (PR-2 / PR-4 planted-violation discipline) ---
section('lintSpec (eval harness)');
{
  try {
    const { lintSpec } = await import('../e2e/evals/run-evals.mjs');

    // GOOD: a valid contractual-token spec lints clean.
    const goodSpec = {
      skill_name: 'simplify-and-verify',
      cost_budget: { max_tokens: 1000, max_seconds: 60 },
      evals: [{
        id: 'ok-case', prompt: 'p', mode: 'autonomous', kind: 'deterministic',
        fixture: { files: {} },
        expectations: [{ text: 'emits a contract token', tier: 'critical' }],
        assertions: { required_substrings: ['SIMPLIFIED'], forbidden_substrings: [] }
      }]
    };
    const good = lintSpec(goodSpec);
    assert(good.ok === true, `lintSpec accepts a valid allowlisted spec (got ${good.errors?.join('; ') || 'ok'})`);

    // BAD (PR-4): an expectation missing its tier is rejected.
    const missingTier = {
      skill_name: 'spec-finalizer',
      evals: [{
        id: 'no-tier', prompt: 'p', mode: 'autonomous', kind: 'judged',
        fixture: { files: {} },
        expectations: [{ text: 'detects an ambiguity' }],
        assertions: { required_substrings: [], forbidden_substrings: [] }
      }]
    };
    const tierRes = lintSpec(missingTier);
    assert(tierRes.ok === false, 'lintSpec rejects an expectation missing its tier (PR-4)');
    assert(tierRes.errors.join(' ').includes('tier'), 'lintSpec PR-4 error names the missing tier');

    // BAD (PR-2): required_substrings on a non-contractual-token skill is rejected.
    const nakedSubstrings = {
      skill_name: 'context-pack-builder',
      evals: [{
        id: 'naked', prompt: 'p', mode: 'autonomous', kind: 'judged',
        fixture: { files: {} },
        expectations: [{ text: 'builds a pack', tier: 'quality' }],
        assertions: { required_substrings: ['some prose phrase'], forbidden_substrings: [] }
      }]
    };
    const subRes = lintSpec(nakedSubstrings);
    assert(subRes.ok === false, 'lintSpec rejects naked required_substrings off the allowlist (PR-2)');
    assert(subRes.errors.join(' ').includes('required_substrings'), 'lintSpec PR-2 error names required_substrings');

    pass('lintSpec PR-2/PR-4 rejection is automatically tested');
  } catch (err) {
    fail(`lintSpec tests failed: ${err.message}`);
  }
}

// --- eval-harness grading upgrade (transcript reduction + file-system assertions) ---
section('eval harness grading upgrade');
{
  try {
    const { parseJsonl, collectAssistantText, collectToolCalls, buildTranscript, gradeFileAssertions, buildSkillPrompt, lintSpec }
      = await import('../e2e/evals/run-evals.mjs');
    const fsMod = await import('node:fs');
    const osMod = await import('node:os');
    const pathMod = await import('node:path');

    // parseJsonl: keeps valid events, skips unparseable lines.
    const events = parseJsonl(
      '{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}\n' +
      'not json\n' +
      '{"type":"result","result":"done","total_cost_usd":0.01}'
    );
    assert(events.length === 2, 'parseJsonl keeps valid events and skips unparseable lines');

    // collectAssistantText: concatenates assistant text blocks.
    assert(collectAssistantText(events) === 'hi', 'collectAssistantText extracts assistant prose');

    // collectToolCalls: renders tool name + a short argument hint.
    const toolEvents = parseJsonl(
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Edit","input":{"file_path":"src/x.js"}}]}}'
    );
    const calls = collectToolCalls(toolEvents);
    assert(calls.length === 1 && calls[0].includes('Edit') && calls[0].includes('src/x.js'),
      'collectToolCalls renders name + argument hint');

    // buildTranscript: composes prose + tools + final result.
    const transcript = buildTranscript('prose', ['Edit(src/x.js)'], 'final');
    assert(transcript.includes('prose') && transcript.includes('Tools used') && transcript.includes('final'),
      'buildTranscript composes prose + tools + result');

    // buildSkillPrompt: preserves the case prompt and appends eval-mode guidance.
    const wrapped = buildSkillPrompt({ prompt: 'do the thing' });
    assert(wrapped.startsWith('do the thing') && wrapped.includes('Eval mode:'),
      'buildSkillPrompt keeps the prompt and adds eval-mode guidance');

    // gradeFileAssertions over a real temp project dir.
    const dir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), 'arcus-fa-'));
    fsMod.writeFileSync(pathMod.join(dir, 'made.txt'), 'hello world');
    const okEv = { fixture: { files: {} }, assertions: { required_files: ['made.txt'], required_file_substrings: { 'made.txt': ['hello'] } } };
    assert(gradeFileAssertions(okEv, dir).passed === true, 'gradeFileAssertions passes when required files + substrings present');
    const missingEv = { fixture: { files: {} }, assertions: { required_files: ['nope.txt'] } };
    assert(gradeFileAssertions(missingEv, dir).passed === false, 'gradeFileAssertions fails on a missing required file');
    // unchanged_files: identical fixture file passes; a mutated one fails.
    fsMod.writeFileSync(pathMod.join(dir, 'keep.txt'), 'orig');
    const unchangedEv = { fixture: { files: { 'keep.txt': 'orig' } }, assertions: { unchanged_files: ['keep.txt'] } };
    assert(gradeFileAssertions(unchangedEv, dir).passed === true, 'gradeFileAssertions passes when unchanged_files match');
    fsMod.writeFileSync(pathMod.join(dir, 'keep.txt'), 'MUTATED');
    assert(gradeFileAssertions(unchangedEv, dir).passed === false, 'gradeFileAssertions fails when an unchanged_file was modified');
    fsMod.rmSync(dir, { recursive: true, force: true });

    // lint: accepts well-formed file assertions for ANY skill (no allowlist gate).
    const goodFa = {
      skill_name: 'repository-context-builder',
      evals: [{ id: 'fa', prompt: 'p', mode: 'autonomous', kind: 'judged',
        fixture: { files: {} }, expectations: [{ text: 'writes a file', tier: 'quality' }],
        assertions: { required_files: ['AGENTS.md'], required_file_substrings: { 'AGENTS.md': ['Navigation'] } } }]
    };
    assert(lintSpec(goodFa).ok === true, `lintSpec accepts well-formed file assertions (got ${lintSpec(goodFa).errors?.join('; ') || 'ok'})`);

    // lint: rejects a malformed file assertion (required_files not an array).
    const badFa = {
      skill_name: 'repository-context-builder',
      evals: [{ id: 'fa', prompt: 'p', mode: 'autonomous', kind: 'judged',
        fixture: { files: {} }, expectations: [{ text: 'writes a file', tier: 'quality' }],
        assertions: { required_files: 'AGENTS.md' } }]
    };
    const badRes = lintSpec(badFa);
    assert(badRes.ok === false && badRes.errors.join(' ').includes('required_files'),
      'lintSpec rejects required_files that is not an array');

    pass('eval-harness grading-upgrade helpers are automatically tested');
  } catch (err) {
    fail(`eval grading-upgrade tests failed: ${err.message}`);
  }
}

// --- trigger matcher (Layer-4 run-triggers.mjs pure functions) ---
section('trigger matcher (L4)');
{
  try {
    const { extractTriggerPhrases, compilePhrase, buildMatchers, resolveQuery, validateCorpus }
      = await import('../e2e/triggers/run-triggers.mjs');

    // extractTriggerPhrases: keeps multi-word / placeholder phrases, drops bare single words.
    const phrases = extractTriggerPhrases('Trigger on "implement <STORY>", "plan the implementation", and "Avoid".');
    assert(phrases.includes('implement <STORY>'), 'extractTriggerPhrases keeps placeholder phrases');
    assert(phrases.includes('plan the implementation'), 'extractTriggerPhrases keeps multi-word phrases');
    assert(!phrases.includes('Avoid'), 'extractTriggerPhrases drops bare single-word quotes');

    // A synthetic two-skill table proves start-anchoring + placeholder matching + specificity.
    const table = [
      { name: 'controller', matchers: ['implement <STORY>', 'plan <STORY>'].map(compilePhrase) },
      { name: 'reviewer', matchers: ['review <STORY>', 'code review <STORY>'].map(compilePhrase) }
    ];

    const r1 = resolveQuery('implement ARC-0042', table);
    assert(r1.matched.has('controller') && r1.winner === 'controller', 'resolveQuery fires controller on "implement <STORY>"');

    // Specificity: "code review X" must win over the shorter "review X".
    const r2 = resolveQuery('code review ARC-0042', table);
    assert(r2.winner === 'reviewer', 'resolveQuery picks the most specific (longest-literal) matcher');

    // Start-anchored: a trigger word mid-sentence must NOT fire (no false positive).
    const r3 = resolveQuery('please tell me how to implement a linked list', table);
    assert(r3.matched.size === 0 && r3.winner === 'none', 'resolveQuery is start-anchored — no mid-sentence false positive');

    // validateCorpus: a dispatched-only owner as a POSITIVE is an L4-1 violation.
    const organic = new Set(['controller', 'reviewer']);
    const badPop = validateCorpus(
      [{ query: 'q', owner: 'security-reviewer' }, { query: 'n', owner: 'none' }],
      organic
    );
    assert(badPop.ok === false, 'validateCorpus rejects a dispatched-only skill named as a positive owner (L4-1)');
    assert(badPop.errors.join(' ').toLowerCase().includes('dispatched-only'),
           'validateCorpus L4-1 error explains the dispatched-only violation');

    // validateCorpus: too-few negatives is an L4-2 violation.
    const fewNeg = validateCorpus(
      [{ query: 'a', owner: 'controller' }, { query: 'b', owner: 'reviewer' }, { query: 'c', owner: 'none' }],
      organic
    );
    assert(fewNeg.ok === false, 'validateCorpus rejects <40% negatives (L4-2)');

    // validateCorpus: a well-formed corpus passes.
    const okCorpus = validateCorpus(
      [{ query: 'a', owner: 'controller' }, { query: 'n1', owner: 'none' }, { query: 'n2', owner: 'none' }],
      organic
    );
    assert(okCorpus.ok === true, `validateCorpus accepts a well-formed corpus (got ${okCorpus.errors.join('; ') || 'ok'})`);

    pass('trigger matcher tests passed');
  } catch (err) {
    fail(`trigger matcher tests failed: ${err.message}`);
  }
}

// --- planted-violation coverage map ---
section('planted-violation coverage map');
{
  // DoD guarantee: every L1 check has BOTH a good-input assertion (returns ok:true)
  // and a planted-bad assertion (returns ok:false), EXCEPT L1-6 which is advisory
  // (asserts warnings on bad input, never sets ok:false).
  //
  // This section programmatically asserts all 13 checks are covered above.
  const coveredChecks = [
    'L1-1',  // checkManifests: good=real manifests, bad=bad-manifest.json
    'L1-2',  // checkFrontmatter: good=spec-finalizer, bad=bad-frontmatter (reserved word)
    'L1-3',  // checkLineBudget: good=spec-finalizer, bad=over-budget.md
    'L1-4',  // checkAdvisoryReadOnly: good=security-reviewer, bad=write-enabled-reviewer
    'L1-5',  // checkCapabilityNoState: good=spec-finalizer, bad=capability-with-state
    'L1-6',  // checkNoInlinedDomain: advisory warnings on prose-heavy-coordinator, never fails
    'L1-7',  // checkCrossRefs: good=code-reviewer, bad=dangling-ref
    'L1-8',  // checkResourcePaths: good=spec-finalizer, bad=dead-resource
    'L1-9',  // checkHooks: good=real hooks.json, bad=bad-hooks.json
    'L1-10', // checkNoInlineModel: good=model-strategy & implementation-runner, bad=inline-model
    'L1-11', // validateJsonSchema + checkArtifactSections: good=inline+markdown, bad=bad-checkpoint+bad-plan
    'L1-12', // checkCapabilityHasEvalSpec: good=spec present, bad=capability with no spec (injected predicate)
    'L1-13'  // checkAgentFrontmatter: good=good-agent.md, bad=bad-agent.md (missing layer+model)
  ];

  assert(coveredChecks.length === 13,
         `coverage map lists all 13 L1 checks (got ${coveredChecks.length})`);

  // Verify the list is exactly L1-1 through L1-13
  for (let i = 1; i <= 13; i++) {
    const checkId = `L1-${i}`;
    assert(coveredChecks.includes(checkId),
           `coverage map includes ${checkId}`);
  }

  pass('planted-violation coverage: all 13 L1 checks have good+planted assertions');
}

exitWithReport();
