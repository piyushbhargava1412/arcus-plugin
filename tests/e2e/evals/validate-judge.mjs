#!/usr/bin/env node
// PR-5 Judge Validation harness — STUB.
//
// INTENDED BEHAVIOUR (deferred — see ARCUS-TESTING-DEFERRED.md):
//   1. Load ~15–20 human-labelled transcripts from ./judge-validation/ — each a
//      (prompt, output, expectation, human_verdict) tuple spanning the full
//      pass/fail spectrum, including near-boundary cases.
//   2. Run the configured LLM judge (ARCUS_EVAL_JUDGE_MODEL) over every transcript,
//      with NO knowledge of the human label.
//   3. Compute agreement (judge verdict == human verdict) across the corpus.
//   4. GATE: agreement must be >= 90%. Below that, the judge is untrusted and the
//      eval suite must not gate on judged scores until the judge prompt is
//      recalibrated. Exit non-zero on a failed gate.
//
// Until the gold set and real judge land, this is a no-op that announces the
// deferral and exits 0. Zero npm dependencies.

console.log('PR-5 judge-validation: DEFERRED.');
console.log('No human-labelled transcripts or LLM judge wired yet.');
console.log('See ARCUS-TESTING-DEFERRED.md for the >=90% agreement gate plan.');
process.exit(0);
