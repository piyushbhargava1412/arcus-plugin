// Zero-dependency assertion helper for the ARCUS Layer-1 static suite.
// Mirrors the discipline of plugins/arcus/scripts/tests/checkpoint.test.sh:
// explicit PASS/FAIL counters and a non-zero process exit on any failure.
//
// Two ways to use it:
//   - the module-level default counter (import { assert, report, ... }) — what
//     the real unit/integration suites use, sharing one process-wide tally;
//   - an isolated counter via makeCounter() — used to self-test the helpers
//     (and any check) WITHOUT polluting the suite's own tally.

/**
 * Create an isolated counter with its own assert/pass/fail/report closures.
 * Nothing it records touches the module-level default counter.
 */
function makeCounter() {
  let passes = 0;
  let failures = 0;

  function assert(cond, msg) {
    if (cond) {
      passes++;
    } else {
      failures++;
      console.error(`FAIL: ${msg}`);
    }
  }

  function pass(msg) {
    passes++;
    if (msg) console.log(`PASS: ${msg}`);
  }

  function fail(msg) {
    failures++;
    console.error(`FAIL: ${msg}`);
  }

  function section(name) {
    console.log(`\n=== ${name} ===`);
  }

  /** Counts snapshot — handy for self-tests. */
  function counts() {
    return { passes, failures };
  }

  /** Print a summary line; return the failure count (does NOT exit). */
  function report() {
    console.log(`PASS: ${passes}  FAIL: ${failures}`);
    return failures;
  }

  return { assert, pass, fail, section, counts, report };
}

// The module-level default counter used by the real suites.
const _default = makeCounter();

const assert = _default.assert;
const pass = _default.pass;
const fail = _default.fail;
const section = _default.section;
const counts = _default.counts;
const report = _default.report;

/** Print the default counter's report and exit non-zero if any failures. */
function exitWithReport() {
  const failureCount = report();
  process.exit(failureCount > 0 ? 1 : 0);
}

export { makeCounter, assert, pass, fail, section, counts, report, exitWithReport };
