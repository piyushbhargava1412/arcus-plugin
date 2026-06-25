// Master test runner: executes every zero-token tier (unit, integration,
// triggers, eval-spec lint) as separate child processes — keeping each suite's
// module-level assert counter isolated — aggregates their exit codes, and exits
// non-zero if any tier fails. The full (token-costing) eval run is intentionally
// excluded here; invoke it explicitly via `pnpm test:evals`.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Each tier runs in its own process so the shared counter in lib/assert.mjs
// never collides across suites.
const tiers = [
  { name: 'unit', args: [join(__dirname, 'unit', 'unit.mjs')] },
  { name: 'integration', args: [join(__dirname, 'integration', 'integration.mjs')] },
  { name: 'triggers', args: [join(__dirname, 'e2e', 'triggers', 'run-triggers.mjs')] },
  { name: 'evals:lint', args: [join(__dirname, 'e2e', 'evals', 'run-evals.mjs'), '--lint-only'] }
];

console.log('='.repeat(60));
console.log('ARCUS Plugin Test Suite (zero-token tiers)');
console.log('='.repeat(60));

const results = [];
for (const tier of tiers) {
  console.log(`\n--- Running ${tier.name} tests ---`);
  const result = spawnSync('node', tier.args, { stdio: 'inherit', encoding: 'utf-8' });
  const exitCode = result.status ?? 1;
  console.log(`\n${tier.name} tests exit code: ${exitCode}`);
  results.push({ name: tier.name, exitCode });
}

// Aggregate results
console.log('\n' + '='.repeat(60));
const failed = results.filter((r) => r.exitCode !== 0);
if (failed.length === 0) {
  console.log('✓ All tests passed');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  for (const r of results) {
    console.log(`  ${r.name}: ${r.exitCode === 0 ? 'PASS' : 'FAIL'}`);
  }
  process.exit(1);
}
