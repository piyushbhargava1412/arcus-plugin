---
name: write-evals
description: >
  Author a behavioural eval spec for one target ARCUS skill. Given a skill name,
  locate or scaffold its eval spec folder, draft one case per observable behaviour
  (fixture, prompt, tiered expectations, and contractual-token assertions where the
  skill emits fixed tokens), then run ONLY the new case to confirm it is red for the
  right reason, and stop. Trigger on "write evals for <skill>", "scaffold evals", or
  "author eval spec".
layer: capability
standalone: true
---

# Write Evals (Eval-Spec Authoring)

## Overview

Atomic **eval-authoring** capability. Given a single target skill, it produces a
valid eval spec — `specs/<skill>/evals.json` for the Layer-2 eval harness — with one
case per observable behaviour of that skill, then proves the new case is **red-first**
by running only it. It writes the spec and stops; it never runs the full suite, never
edits the target skill, and never touches pipeline state.

The harness this authors for grades each case in one of three ways:

- **deterministic** — graded purely by required/forbidden substrings. Used by
  *contractual-token* skills that emit fixed tokens (`arcus:simplify-and-verify`
  emits `SIMPLIFIED`/`REVERTED`; `arcus:spec-compliance-reviewer` emits
  `VERDICT: PASS`/`VERDICT: FAIL`).
- **routing** — code-graded expect/forbid over which route/decision was taken.
- **judged** — an LLM judge scores tiered expectations (deferred execution).

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one
> output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `target_skill` | string | The skill to author evals for (e.g. `simplify-and-verify`) | the caller names it; standalone user supplies it |
| `skill_contract` | markdown | *(optional)* The target skill's `SKILL.md` — its inputs, outputs, modes, and any contractual tokens | read at runtime from the target skill's `SKILL.md` if not supplied |
| `observed_behaviours` | text | *(optional)* A list of behaviours to cover; if absent, derive them from the skill contract | the caller passes known behaviours; otherwise derived |

### Outputs
- **`eval_spec`** (JSON) — a valid `specs/<target_skill>/evals.json` containing one
  case per observable behaviour, each with a fixture, a prompt, tiered expectations,
  and (for contractual-token skills only) substring assertions.
  Output convention: the harness expects the spec at
  `tests/e2e/evals/specs/<target_skill>/evals.json`; a standalone caller may point
  elsewhere. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to
   `tests/e2e/evals/specs/<target_skill>/evals.json`; callers may override.
2. **Optional inputs** (`skill_contract`, `observed_behaviours`) — never ask. Source
   the contract from the target skill's `SKILL.md` and derive behaviours; note any
   gap in the spec comments.
3. **Required input with no sensible default** (`target_skill`) — ask once, clearly.

## Spec shape

```jsonc
{
  "skill_name": "<target_skill>",
  "cost_budget": { "max_tokens": N, "max_seconds": N },
  "evals": [
    {
      "id": "<unique-case-id>",
      "prompt": "<what the skill is asked to do>",
      "mode": "autonomous | dialogue",
      "kind": "judged | deterministic | routing",
      "fixture": { "files": { "<path>": "<contents>" } },
      "expectations": [
        { "text": "<observable behaviour>", "tier": "critical | quality" }
      ],
      "assertions": {
        "required_substrings": [],
        "forbidden_substrings": []
      }
    }
  ]
}
```

## Authoring rules

These rules are enforced by the harness lint; honour them while drafting so the new
spec passes immediately.

- **W-2a (PR-4: tier every expectation).** Every expectation MUST carry a `tier`:
  - `critical` — gates hard (~100%): the case fails if any critical expectation fails.
  - `quality` — averaged against a mean-score threshold (default 70).
  Choose `critical` for the skill's core contract (correct token, preserved
  behaviour, correct route) and `quality` for nice-to-have refinements.
- **W-2b (PR-2: no naked substrings off the allowlist).** Populate
  `assertions.required_substrings` **only** when the target skill is a
  contractual-token skill (`simplify-and-verify`, `spec-compliance-reviewer`). For
  every other skill, leave it empty and express the behaviour as tiered expectations
  instead. `forbidden_substrings` may be used to forbid leaked tokens regardless.
- **One case per observable behaviour.** Do not bundle multiple behaviours into one
  case. Prefer small, focused fixtures.
- **Pick `kind` by how the behaviour is checkable.** Fixed emitted token →
  `deterministic`; a routing/selection decision → `routing`; an open-ended quality of
  output → `judged`.
- **Give every case a `cost_budget`-respecting fixture.** Keep fixtures tiny so a
  real run stays well under the spec's `cost_budget`.

## Mechanics — locate → scaffold → draft → prove-red → stop

**Step 1 — Resolve the target skill contract.**
Read the target skill's `SKILL.md` (from `skill_contract` if supplied, else from the
skill directory). Identify: its inputs, its outputs, its modes, and whether it is a
contractual-token skill (emits fixed tokens). Enumerate its observable behaviours
(from `observed_behaviours` if supplied, else derive from the contract).

**Step 2 — Locate or scaffold the spec folder.**
Determine the spec path `specs/<target_skill>/evals.json`. If the folder exists, load
the current spec to append to; if not, scaffold a fresh spec object with
`skill_name`, a conservative `cost_budget`, and an empty `evals` array.

**Step 3 — Draft one case per behaviour.**
For EACH behaviour, write a case: a unique `id`, a `prompt` that asks the skill to
exhibit the behaviour, a tiny `fixture.files` map, tiered `expectations` (W-2a), and —
only for contractual-token skills — `assertions.required_substrings` (W-2b). Add the
case(s) to `evals`.

**Step 4 — Self-lint against the authoring rules.**
Before writing, verify each new case: every expectation has a `tier`; `mode` ∈
{autonomous, dialogue}; `kind` ∈ {judged, deterministic, routing}; and
`required_substrings` is empty unless the skill is on the contractual-token
allowlist. Fix any violation inline.

**Step 5 — Write the spec.**
Write the updated `specs/<target_skill>/evals.json`.

**Step 6 — Prove the new case is RED for the right reason (W-1).**
Run the eval harness in dry-run, filtered to ONLY the new case (the harness honours a
skill/id filter). Confirm: (a) the spec lints clean, and (b) the new case is reported
`red (not yet run)` — i.e. red because it has not yet been executed against a graded
run, not red because the spec is malformed. A lint error here means the draft is
wrong, not red-first — go back to Step 4.

**Step 7 — Stop.**
Report the spec path, the cases added, and the red-first confirmation. Do NOT run the
full suite, do NOT modify the target skill, and do NOT take any follow-on routing
action — authoring one spec is the whole job.

## State markers

- **W-1 (red-first).** A freshly authored case is always confirmed RED before the
  capability returns. A case that is green on first write is suspect (it asserts
  nothing real) and must be tightened.
- **W-2 (lint-honouring).** The spec respects PR-2 (no naked substrings off the
  contractual-token allowlist) and PR-4 (every expectation is tiered) at author time,
  so the harness lint passes on the first run.
- **W-3 (self-meta-eval, deferred).** As a category capability, `write-evals` will
  itself have a meta-eval (does it author good red-first specs?). That meta-eval is
  **deferred** — see `ARCUS-TESTING-DEFERRED.md`.

## Constraints

- **Authors specs only** — never edits the target skill, never runs the full eval
  suite, never performs any pipeline or routing action beyond authoring one spec.
- **Red-first or it is wrong** — a new case must be confirmed red before returning.
- **Lint-clean at author time** — honour PR-2 and PR-4 while drafting.
- **Tiny fixtures** — keep fixtures minimal so real runs respect the `cost_budget`.

## Success Criteria

- The authored `specs/<target_skill>/evals.json` lints clean in the harness.
- Every case has one observable behaviour, a tiny fixture, and tiered expectations.
- Contractual-token assertions appear only for allowlisted skills.
- The new case(s) are confirmed `red (not yet run)` before the capability stops.
