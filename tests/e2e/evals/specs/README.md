# Eval Specs (`specs/<skill>/evals.json`)

Each ARCUS capability owns ONE eval spec at `specs/<skill-name>/evals.json`. A spec
declares a set of behavioural eval cases for that single skill. The harness
(`../run-evals.mjs`) discovers, lints, and grades these specs.

> **Layer-2 status: AUTHORED & LINT-CLEAN.** All 18 capabilities have an authored eval
> spec (43 cases total), all lint clean. Grading is done by the **live `claude` CLI**
>  — its only precondition is the `claude` binary on PATH, and per-eval cost
> is bounded by a dollar budget. Lint the specs with zero model calls via
> `pnpm test:evals:lint`; grade them live (costs money) with `pnpm test:evals`.

## Spec shape

```jsonc
{
  "skill_name": "<skill>",
  "cost_budget": { "max_usd": N },
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
  `quality` is averaged against `ARCUS_EVAL_SCORE_THRESHOLD` (default 70). Tiers are
  graded by the live `claude` CLI judge when you run `pnpm test:evals`.
- **PR-2** — `assertions.required_substrings` may be non-empty ONLY for
  contractual-token skills (`simplify-and-verify`, `spec-compliance-reviewer`).
  Naked substrings on any other skill are a lint error.
- **`cost_budget`** — the supported field is `max_usd` (a dollar budget for the case).
  This complements the global `ARCUS_EVAL_MAX_BUDGET_USD` (default `$0.50`) and judge
  `ARCUS_EVAL_JUDGE_BUDGET_USD` (default `$0.10`) passed to the CLI via `--max-budget-usd`.
  (The seed `simplify-and-verify/evals.json` may still show a token-based budget; treat
  `max_usd` as the field going forward.)

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

Use the `arcus:write-evals` capability to scaffold each new spec. Lint it with
`pnpm test:evals:lint` (zero tokens); grade it live with `pnpm test:evals`.
