# Regression Corpus (PR-8) — append-only

This directory holds the **append-only regression corpus**: every time a real eval
failure is observed and fixed, the failing case (prompt + fixture + the expectation
it violated) is captured here so the regression can never silently return.

> **Status: DEFERRED.** No regression cases exist yet. The corpus is populated only
> once Layer-2 evals run for real against an LLM judge. See
> [`ARCUS-TESTING-DEFERRED.md`](../../../../ARCUS-TESTING-DEFERRED.md).

## Rules

- **Append-only.** Cases are added, never edited or removed. A case captures the
  exact failure that motivated it.
- **One file per regression**, named `<skill>__<short-slug>.json`, in the same
  per-case shape as a `specs/<skill>/evals.json` eval entry.

## Red-first runbook

When a regression is discovered:

1. Reproduce it as a new eval case and add it here. Run it — it MUST be **RED**
   first (proving it captures the real defect).
2. Fix the skill (or its inputs).
3. Re-run — the case turns **GREEN**. Commit the case alongside the fix.
4. Never delete the case; future runs guard against the regression returning.
