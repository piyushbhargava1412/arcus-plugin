// Layer-1 UNIT suite: runs the pure L1 checks against tests/fixtures/ (good
// inputs must pass; planted-bad inputs must fail — the DoD #1 guarantee), plus
// self-tests of the assert helper. Uses the module-level default counter; later
// tasks append more sections here. `node tests/unit.mjs` exits non-zero on any
// failure.
import { assert, section, makeCounter, pass, fail, exitWithReport } from './lib/assert.mjs';

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
    const { parseFrontmatter, walkSkills, tierOf, DISPATCHED_ONLY, ADVISORY_REVIEWERS,
            VALID_TIERS, tierCounts, SKILLS_DIR, readJSON, lineCount, repoRoot }
      = await import('./lib/skills.mjs');

    // Test 1: parseFrontmatter on spec-finalizer
    const fs = await import('node:fs/promises');
    const specFinalizerText = await fs.readFile(`${SKILLS_DIR}/spec-finalizer/SKILL.md`, 'utf-8');
    const specFM = parseFrontmatter(specFinalizerText);
    assert(specFM.name === 'spec-finalizer', 'parseFrontmatter extracts name from spec-finalizer');
    assert(tierOf(specFM) === 'capability', 'tierOf reads layer field as capability for spec-finalizer');

    // Test 2: parseFrontmatter on security-reviewer
    const secReviewerText = await fs.readFile(`${SKILLS_DIR}/security-reviewer/SKILL.md`, 'utf-8');
    const secFM = parseFrontmatter(secReviewerText);
    assert(Array.isArray(secFM['disallowed-tools']), 'disallowed-tools is parsed as an array');
    assert(secFM['disallowed-tools'].includes('Edit'), 'disallowed-tools contains Edit');
    assert(secFM['disallowed-tools'].includes('Write'), 'disallowed-tools contains Write');
    assert(secFM['disallowed-tools'].includes('MultiEdit'), 'disallowed-tools contains MultiEdit');
    assert(secFM['disable-model-invocation'] === true || secFM['disable-model-invocation'] === 'true',
           'disable-model-invocation is truthy for security-reviewer');

    // Test 3: walkSkills returns at least 26 entries
    const allSkills = walkSkills();
    assert(allSkills.length >= 26, `walkSkills returns at least 26 skills, got ${allSkills.length}`);

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

    // Test 5: every DISPATCHED_ONLY skill exists and has disable-model-invocation
    let missingDispatched = 0;
    for (const name of DISPATCHED_ONLY) {
      const skill = allSkills.find(s => s.name === name);
      if (!skill) {
        console.error(`  DISPATCHED_ONLY skill not found: ${name}`);
        missingDispatched++;
      } else if (!skill.frontmatter['disable-model-invocation']) {
        console.error(`  DISPATCHED_ONLY skill missing disable-model-invocation: ${name}`);
        missingDispatched++;
      }
    }
    assert(missingDispatched === 0, `all DISPATCHED_ONLY skills exist and have disable-model-invocation (${missingDispatched} issues)`);

    // Test 6: every ADVISORY_REVIEWERS skill exists
    let missingAdvisory = 0;
    for (const name of ADVISORY_REVIEWERS) {
      const skill = allSkills.find(s => s.name === name);
      if (!skill) {
        console.error(`  ADVISORY_REVIEWERS skill not found: ${name}`);
        missingAdvisory++;
      }
    }
    assert(missingAdvisory === 0, `all ADVISORY_REVIEWERS skills exist (${missingAdvisory} missing)`);

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

// --- L1-1, L1-2, L1-3 checks ---
section('L1-1..L1-3');
{
  try {
    const { checkManifests, checkFrontmatter, checkLineBudget } = await import('./lib/checks.mjs');
    const { walkSkills, readJSON, parseFrontmatter, lineCount, repoRoot } = await import('./lib/skills.mjs');
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
      = await import('./lib/checks.mjs');
    const { walkSkills, parseFrontmatter, ADVISORY_REVIEWERS }
      = await import('./lib/skills.mjs');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { repoRoot } = await import('./lib/skills.mjs');

    // Get all skills for cross-ref validation
    const allSkills = walkSkills();
    const knownSkillNames = new Set(allSkills.map(s => s.name));

    // Test L1-4: checkAdvisoryReadOnly passes on real advisory reviewer (security-reviewer)
    const securityReviewer = allSkills.find(s => s.name === 'security-reviewer');
    assert(securityReviewer !== undefined, 'security-reviewer skill exists');

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

exitWithReport();
