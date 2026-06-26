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
  *contractual-token* agents that emit fixed tokens (`arcus:simplify-and-verify`
  emits `SIMPLIFIED`/`REVERTED`; `arcus:spec-compliance-reviewer` emits
  `VERDICT: PASS`/`VERDICT: FAIL`).
- **routing** — code-graded expect/forbid over which route/decision was taken.
- **judged** — an LLM judge scores tiered expectations (deferred execution).

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `target_skill` | yes | string | The skill to author evals for (e.g. `simplify-and-verify`) |
| `skill_contract` | no | markdown | The target skill's `SKILL.md`; read at runtime from the skill directory if not supplied |
| `observed_behaviours` | no | text | Behaviours to cover; derived from the skill contract if absent |

### Outputs
- **`eval_spec`** (JSON) — a valid `specs/<target_skill>/evals.json` containing one
  case per observable behaviour, each with a fixture, a prompt, tiered expectations,
  and (for contractual-token capabilities only) substring assertions.
  Output convention: the harness expects the spec at
  `tests/e2e/evals/specs/<target_skill>/evals.json`; a standalone caller may point
  elsewhere. The capability never asks the user where to write.

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
        "forbidden_substrings": [],
        "required_files": [],
        "required_file_substrings": { "<path>": ["<substring>"] },
        "unchanged_files": []
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
  `assertions.required_substrings` **only** when the target is a
  contractual-token agent (`simplify-and-verify`, `spec-compliance-reviewer`). For
  every other capability, leave it empty and express the behaviour as tiered expectations
  instead. `forbidden_substrings` may be used to forbid leaked tokens regardless.
- **W-2c (file-system assertions, any skill).** When a skill's contract is a *file effect*
  (creates/edits/leaves-untouched files), assert it directly against the throwaway project
  the skill runs in — these are allowed for every skill, no allowlist:
  - `required_files` — paths that MUST exist after the run.
  - `required_file_substrings` — `{ path: [substring, …] }`; each substring must be present in that file.
  - `unchanged_files` — paths the skill MUST leave byte-identical to their `fixture.files` seed.
  Use these for skills whose value is observable on disk (e.g. context/AGENTS.md generation,
  file refactors) rather than only in prose.
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
contractual-token capability (emits fixed tokens). Enumerate its observable behaviours
(from `observed_behaviours` if supplied, else derive from the contract).

**Step 2 — Locate or scaffold the spec folder.**
Determine the spec path `specs/<target_skill>/evals.json`. If the folder exists, load
the current spec to append to; if not, scaffold a fresh spec object with
`skill_name`, a conservative `cost_budget`, and an empty `evals` array.

**Step 3 — Draft one case per behaviour.**
For EACH behaviour, write a case: a unique `id`, a `prompt` that asks the skill to
exhibit the behaviour, a tiny `fixture.files` map, tiered `expectations` (W-2a), and —
only for contractual-token capabilities — `assertions.required_substrings` (W-2b). Add the
case(s) to `evals`.

**Step 4 — Self-lint against the authoring rules.**
Before writing, verify each new case: every expectation has a `tier`; `mode` ∈
{autonomous, dialogue}; `kind` ∈ {judged, deterministic, routing}; and
`required_substrings` is empty unless the skill is on the contractual-token
allowlist. Fix any violation inline.

**Step 5 — Write the spec.**
Write the updated `specs/<target_skill>/evals.json`.

**Step 6 — Prove the new case is RED for the right reason (W-1).**
Run the eval harness in lint-only mode (`pnpm test:evals:lint`, or filter to the target
skill/id). Confirm the spec lints clean (PR-2 / PR-4). The case is red-first by
construction: it asserts a behaviour the current skill does not yet exhibit, so it would
FAIL when graded live against the `claude` CLI. A lint error here means the draft is
malformed, not red-first — go back to Step 4. (Live grading is `pnpm test:evals`; that
costs money and is not part of authoring.)

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
- **W-3 (self-meta-eval).** As a category capability, `write-evals` has its own
  meta-eval (does it author good red-first specs?) at
  `tests/e2e/evals/specs/write-evals/evals.json`, graded like any other capability.

