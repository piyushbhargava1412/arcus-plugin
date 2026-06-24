# Layer-3 Seam / Contract Tests (L3-1 .. L3-5)

This directory holds **seam tests** for coordinators and orchestrators: tests that
exercise the *contracts between* skills (the inputs/outputs each layer passes), not
the behaviour of any single capability (that is Layer-2 evals) nor the static
invariants (Layer-1).

> **Status: DEFERRED.** No seam tests exist yet. See
> [`ARCUS-TESTING-DEFERRED.md`](../../../ARCUS-TESTING-DEFERRED.md).

## Intended scope

- **L3-1** — `kick-off` coordinator: context-pack-builder → spec-finalizer handoff
  passes the context pack as a named input and produces a grounded spec.
- **L3-2** — `code-reviewer` coordinator: fans out to the specialist reviewers and
  consolidates into a single verdict via `review-consolidator`.
- **L3-3** — `arcus-controller` orchestrator: drives the canonical stage sequence
  from the checkpoint, emitting handoff gates (interactive) or running stages
  back-to-back (autonomous).
- **L3-4** — `implementation-runner` orchestrator: branch creation at entry
  (deferred-branch), per-task TDD/spec-check/commit via `subagent-task-dispatcher`.
- **L3-5** — `subagent-task-dispatcher`: the per-task dispatch protocol contract.

Seam tests stub the LLM-driven steps and assert on the **shape and routing** of the
data passed across each seam — they do not require a live judge.
