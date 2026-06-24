# Judge Validation (PR-5)

Before the LLM judge can be trusted to grade evals, it must be validated against a
human-labelled gold set. This directory holds that gold set and the validation
harness (`../validate-judge.mjs`).

> **Status: DEFERRED.** No transcripts or labels exist yet. Judge validation runs
> only once Layer-2 lands real execution. See
> [`ARCUS-TESTING-DEFERRED.md`](../../../../ARCUS-TESTING-DEFERRED.md).

## Intended scope

- **~15–20 human-labelled transcripts.** Each transcript is a (prompt, output,
  expectation, human verdict) tuple covering the full pass/fail spectrum, including
  near-boundary cases.
- **≥90% agreement gate.** `validate-judge.mjs` runs the judge over every labelled
  transcript and computes agreement with the human labels. If agreement falls below
  **90%**, the judge is NOT trusted and the eval suite must not gate on judged
  scores until the judge prompt is recalibrated.

The stub `../validate-judge.mjs` currently prints that judge-validation is deferred
and exits 0.
