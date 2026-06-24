# Layer-3 Pipeline Tests (L3-6, L3-7)

End-to-end tests that drive the **whole ARCUS pipeline** against a throwaway fixture
repository, asserting that a story flows from spec to pull request.

> **Status: DEFERRED.** No pipeline tests exist yet. See
> [`ARCUS-TESTING-DEFERRED.md`](../../../ARCUS-TESTING-DEFERRED.md).

## Intended scope

- **L3-6 — full AFK e2e.** Run `arcus-controller` in autonomous mode end-to-end on a
  fixture repo: `scaffold → context_pack → spec_finalizer → plan → test_plan →
  branch → task_1..N → code_review → context_sync → closure`. Assert a branch is
  created, commits land, and a pull-request artifact is produced — no gates.
- **L3-7 — gated smoke.** Run the interactive (gated) flow on the same fixture repo,
  scripting the handoff-gate responses, and assert the controller pauses at each
  phase-group gate and resumes correctly.

Both run on a **disposable fixture repo** (git-initialised in a temp dir) so no real
project state is touched. LLM-driven stages are stubbed where a live judge is not
required; the assertions target checkpoint progression, branch/commit side effects,
and artifact production.
