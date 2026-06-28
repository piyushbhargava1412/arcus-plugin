# The Capability Library

How ARCUS is built as a three-tier library of reusable capabilities, thin coordinators, and a stateful orchestrator

---

::: tip The mindset shift
ARCUS is no longer a single-threaded pipeline of bespoke stage skills. It is a **three-tier
capability library**: small, stateless **capabilities** that anyone can run standalone, **coordinators**
that sequence them, and one **orchestrator** that owns the stateful pipeline. See
[The ARCUS Pipeline](/concepts/pipeline) for how the orchestrator strings these capabilities into the
full Spec → Code → Pull Request flow.
:::

## Two Surfaces: Skills vs Agents

Orthogonal to the tier (role) axis below, every ARCUS capability lives on one of **two surfaces**:

| Surface | Lives in | Invocation | Slash command |
|---------|----------|-----------|---------------|
| **Skill** | `plugins/arcus/skills/<name>/SKILL.md` | user **and** model invocable; injected into the main context | `/arcus:<name>` |
| **Agent** | `plugins/arcus/agents/<name>.md` (flat file) | model-only; dispatched **by name** from a skill/orchestrator, never user-facing | none |

An item is an **agent** when no human would type a trigger for it, it already runs as an isolated
subagent, and it needs no main-thread dialogue. The reviewers, the per-task dispatcher, the refactor
engine, and the pipeline-internal context builders/sync — including the four repo-context discovery
agents (`repo-overview-discovery`, `flow-discovery`, `test-pattern-discovery`, `design-pattern-discovery`)
— are agents (17); the user-facing entry points
and dialogue-driven steps are skills (12). Two capabilities — `test-spec-compiler` and
`pull-request-builder` — are **split**: a thin user-facing *skill wrapper* dispatches an *execution
agent* of the same name. The surface axis is independent of the tier axis: an orchestrator can be a
skill (`arcus-controller`) or an agent (`subagent-task-dispatcher`).

## The Three Tiers

ARCUS skills **and agents** fall into exactly three tiers, distinguished by **how much state they own**:

| Tier | What it is | State ownership | Examples |
|------|------------|-----------------|----------|
| **Capability** | An atomic, stateless, **plug-n-play** unit: given its declared inputs, it produces **one** output. No checkpoint, no branch ops, no ARCUS-specific paths. | None — pure input → output | `spec-finalizer`, `implementation-planner` *(skills)*; `context-pack-builder`, the specialist reviewers (`security-reviewer`, `performance-reviewer`, `code-quality-reviewer`, `spec-compliance-reviewer`, `history-context-reviewer`), `review-consolidator`, `simplify-and-verify`, `context-drift-sync`, the four repo-context discovery agents (`repo-overview-discovery`, `flow-discovery`, `test-pattern-discovery`, `design-pattern-discovery`), the `test-spec-compiler`/`pull-request-builder` execution agents *(agents)* |
| **Coordinator** | A thin, stateless **sequencer** of capabilities — fan-out/consolidate or chain. Owns no pipeline state. | None — orchestrates capabilities but holds nothing | `kick-off` (context-pack-builder → spec-finalizer), `code-reviewer`, `repo-agentifier`, the `test-spec-compiler`/`pull-request-builder` skill wrappers *(skills)*; `code-simplifier` *(agent)* |
| **Orchestrator** | The stateful **pipeline driver**. Owns the session checkpoint, branch creation, and stage gates; resolves every path and passes capabilities explicit inputs. | All of it — checkpoint, branch, stage gates | `arcus-controller`, `implementation-runner` *(skills)*; `subagent-task-dispatcher` *(agent)* |

The rule of thumb: **only the orchestrator knows it is ARCUS.** Capabilities and coordinators are
written so they could be lifted out and used in a completely different workflow.

## Plug-n-Play Capabilities

A capability is a reusable building block. The defining property is that its **contract takes domain
inputs, not ARCUS files**:

- Inputs and outputs are named in domain terms — `story`, `change_set`, `implementation_plan`,
  `spec_grounding`, `acceptance_criteria` — **never** ARCUS artifact filenames like
  `plan.md` or `session-checkpoint.json`.
- A capability does **no** checkpoint reads/writes, **no** branch operations, and resolves **no**
  ARCUS-specific paths. Those concerns belong to the orchestrator.
- As a result, a developer who has **never used ARCUS** can invoke a single capability standalone,
  supplying their own inputs, and get a useful, self-contained output.

This is what makes the library composable: the orchestrator wires capabilities together by feeding
one capability's output as the next one's input, but each capability neither knows nor cares that a
pipeline exists around it.

## A Standalone Example

Suppose you have a rough user story and you just want it sharpened — you have no `.context/` snapshot,
no checkpoint, no branch, and you have never run the ARCUS pipeline. You can invoke the
`spec-finalizer` **capability** directly:

**Input** (what you supply — plain domain values):

```yaml
capability: spec-finalizer
inputs:
  story: |
    As a user, I want to reset my password from the login screen
    so that I can regain access if I forget it.
  # optional grounding hints, if you have them:
  spec_grounding: "Auth flows live in src/auth; we use email-based reset links."
```

**Output** (what you get back — a finalized spec, no ARCUS plumbing):

```yaml
finalized_spec:
  summary: "Email-based password reset initiated from the login screen."
  resolved_ambiguities:
    - question: "Token expiry window?"
      decision: "30 minutes (matches existing session-token TTL)."
    - question: "Rate limiting on reset requests?"
      decision: "Max 3 requests / 15 min per account."
  acceptance_criteria:
    - "A 'Forgot password?' link is present on the login screen."
    - "Submitting a registered email sends a single-use reset link valid 30 min."
    - "Invalid/expired tokens show a clear error and offer to resend."
```

The same pattern holds for any specialist reviewer — e.g. invoke `security-reviewer` directly with a
`change_set` (a diff) and get back severity-tagged findings, with no checkpoint, no branch, and no PR
in sight. The capability does exactly one job over the inputs you hand it.

## The Hybrid Output Convention

Because a capability can be driven either by the orchestrator **or** standalone, it follows a simple
hybrid rule for where its output lands:

- **Driven by a coordinator/orchestrator:** the caller passes an explicit output path, and the
  capability writes there. The orchestrator resolves all ARCUS-specific paths (e.g. into
  `.arcus/specs/<STORY-ID>/`).
- **Run standalone:** with no path supplied, the capability defaults to writing under
  `.arcus/outputs/<capability-name>/`, so its result is easy to find without any pipeline state.

This keeps capabilities free of ARCUS path knowledge while still producing a predictable, discoverable
output when used on their own.

## How the Tiers Fit the Pipeline

In the full pipeline, the **orchestrator** (`arcus-controller`, with the
`implementation-runner` and `subagent-task-dispatcher` for the Implementation loop) owns the
checkpoint and branch, decides which stage runs next, and hands each capability its explicit inputs.
**Coordinators** like `kick-off` and `code-reviewer` group capabilities into a single logical step.
**Capabilities** do the actual work — finalizing the spec, planning the implementation, compiling the
test matrix, reviewing the diff.

For the stage-by-stage map, see [The ARCUS Pipeline](/concepts/pipeline). For the two ways the
orchestrator runs that pipeline, see [Interactive vs Autonomous Mode](/concepts/modes).
