# Regression Corpus — append-only

This directory is an **append-only folder** for regression eval cases. There is no
dedicated runner: cases here are graded by `pnpm test:evals` (the live `claude` CLI),
exactly like any other capability eval spec.

Use it when a skill misbehaves in a way that doesn't map cleanly to a single capability's
spec, or when you simply want to park the failing case here. Otherwise, prefer adding the
case directly to the responsible skill's spec at `specs/<skill>/evals.json`.

## Rules

- **Append-only.** Cases are added, never edited or removed. A case captures the exact
  failure that motivated it, so the regression can never silently return.
- **One file per regression**, named `<skill>__<short-slug>.json`, in the same per-case
  shape as a `specs/<skill>/evals.json` eval entry (prompt + fixture + tiered expectations
  + optional assertions), plus optional regression metadata (`regression: true`,
  `story_id`, `discovered`, `summary`).

## Runbook

When a skill misbehaves in real use:

1. **Capture the repro as an eval case** — add it under the responsible skill's spec, or
   here as `<skill>__<slug>.json` if it doesn't fit one capability.
2. **Prove it fails** — run `pnpm test:evals` and confirm the case grades RED for the right
   reason (the skill produces the buggy output). This proves the case captures the real
   defect.
3. **Fix the skill** (edit the `SKILL.md` prompt, adjust capability contracts, etc.).
4. **Re-run `pnpm test:evals`** and confirm the case now grades GREEN.
5. **Commit the case alongside the fix.** Never delete it; future runs guard against the
   regression returning.
