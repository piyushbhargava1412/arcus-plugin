---
name: pull-request-builder
description: Finalize the development workflow by summarizing changes and creating a pull request. Use when all tasks in the plan are completed and verified. Trigger on "finalize workflow", "create pull request", or "submit changes".
layer: coordinator
standalone: true
---

# Pull Request Builder (thin wrapper)

This skill is the **user-facing entry point** for finalizing a change set into a pull request.
It owns the user trigger only; the actual PR-description execution lives in the
**`pull-request-builder` agent** (`plugins/arcus/agents/pull-request-builder.md`), which holds
the full summarize-and-build workflow and its bundled PR template.

## Behaviour

On activation (a user "create pull request" / "finalize workflow" / "submit changes" request,
or an orchestrator dispatch):

1. **Dispatch the execution agent** — read and follow the `arcus:pull-request-builder` agent.
   Pass it the story's change set and the output path for the PR description.
2. **Relay** the agent's produced PR description back to the caller (Closure then runs `pr.sh`).

This wrapper holds **no** execution logic of its own — it is a thin trigger + dispatch shell so
that "raise a PR" remains a first-class, user-invocable capability while the build runs in the
isolated agent.
