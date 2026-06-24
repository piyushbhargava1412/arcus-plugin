// Master test runner: executes unit tests then integration tests as separate
// child processes (keeping their counters isolated), aggregates exit codes,
// and exits non-zero if either fails.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const unitPath = join(__dirname, 'unit.mjs');
const integrationPath = join(__dirname, 'integration.mjs');

console.log('='.repeat(60));
console.log('ARCUS Plugin Layer-1 Test Suite');
console.log('='.repeat(60));

// Run unit tests
console.log('\n--- Running unit tests ---');
const unitResult = spawnSync('node', [unitPath], {
  stdio: 'inherit',
  encoding: 'utf-8'
});

const unitExitCode = unitResult.status ?? 1;
console.log(`\nUnit tests exit code: ${unitExitCode}`);

// Run integration tests
console.log('\n--- Running integration tests ---');
const integrationResult = spawnSync('node', [integrationPath], {
  stdio: 'inherit',
  encoding: 'utf-8'
});

const integrationExitCode = integrationResult.status ?? 1;
console.log(`\nIntegration tests exit code: ${integrationExitCode}`);

// Aggregate results
console.log('\n' + '='.repeat(60));
if (unitExitCode === 0 && integrationExitCode === 0) {
  console.log('✓ All tests passed');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  console.log(`  Unit: ${unitExitCode === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  Integration: ${integrationExitCode === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(1);
}
