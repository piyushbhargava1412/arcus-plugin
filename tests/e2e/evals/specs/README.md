# Eval Specs (`specs/<skill>/evals.json`)

Each ARCUS capability owns ONE eval spec at `specs/<skill-name>/evals.json`. A spec
declares a set of behavioural eval cases for that single skill. The harness
(`../run-evals.mjs`) discovers, lints, and grades these specs.

> **Layer-2 status: SCAFFOLD ONLY.** Only one seed spec exists today
> (`simplify-and-verify/`). Authoring the remaining specs, and running them for
> real against an LLM judge, is **deferred** — see
> [`ARCUS-TESTING-DEFERRED.md`](../../../ARCUS-TESTING-DEFERRED.md) at the repo root.

## Spec shape

```jsonc
{
  "skill_name": "<skill>",
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
        "required_substrings": [],   // contractual-token skills ONLY (PR-2)
        "forbidden_substrings": []
      }
    }
  ]
}
```

- **PR-4** — every expectation MUST carry a `tier`. `critical` gates hard (~100%);
  `quality` is averaged against `ARCUS_EVAL_SCORE_THRESHOLD` (default 70).
- **PR-2** — `assertions.required_substrings` may be non-empty ONLY for
  contractual-token skills (`simplify-and-verify`, `spec-compliance-reviewer`).
  Naked substrings on any other skill are a lint error.

## Authoring priority order

One spec per capability, authored in this order (highest value first):

1. `simplify-and-verify` — contractual token (SIMPLIFIED / REVERTED) — **seed (done)**
2. `spec-compliance-reviewer` — contractual token (VERDICT: PASS / FAIL)
3. `spec-finalizer` — ambiguity resolution + boundary
4. `implementation-planner` — atomic task decomposition
5. `context-pack-builder` — story-to-code correlation
6. `test-spec-compiler` — test matrix
7. the four specialist reviewers (security / performance / code-quality / history-context)
8. `pull-request-builder`, `review-consolidator`, the four discovery skills, `context-drift-sync`

Use the `arcus:write-evals` capability to scaffold each new spec red-first.
