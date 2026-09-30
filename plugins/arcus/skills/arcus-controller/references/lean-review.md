# Lean Review (profile: lean)

Used instead of Steps 1–5 of the `arcus:code-reviewer` skill when the checkpoint's `profile` is `lean`. The gate is code.
There is one LLM reviewer, and specialists are added only when the diff's risk classifier flags them.

`<DIR>` = `.arcus/specs/<STORY_ID>`. `R` = `review_round` from the checkpoint.

## 1. Gate (code, not judgment)
```
node .arcus/bin/gate.mjs run --story <STORY_ID>
```
It writes `<DIR>/change.diff` and `<DIR>/gate.json`, and prints a compact decision.

- **`test` is `unresolved`** → take the test command from `plan.md` → `## Context` (or
  `.context/testing-patterns.md`), run it yourself, and treat a failure as a block.
- **`lint` failed** → fix the lint errors yourself (mechanical). Commit with
  `.arcus/bin/commit.sh <STORY_ID> "chore: gate autofix (lint/format)"`, then re-run the gate once.
  Lint never costs a review round.
- **`blocked: true`** → skip the reviewers. Write `<DIR>/review.md` in the change-reviewer format with one
  `critical` row per `blockReasons` entry (quote the failing output tail from `gate.json`), and put the
  verdict `CHANGES_REQUESTED`. Go to step 3.

## 2. Review
Resolve each agent's model with
`node .arcus/bin/models.mjs resolve --complexity medium --stage <agent> --checkpoint <DIR>/session-checkpoint.json`
(`dispatch:false` → omit the model parameter; `model` → use it verbatim; `models` → your host's key).

1. **Only if** the gate's `reviewers` list includes `security-reviewer` and/or `performance-reviewer`,
   dispatch those in parallel first. Prompt: "Review the branch diff at `<DIR>/change.diff` (read it
   in ≤1500-line pages). Plan: `<DIR>/plan.md`. Return findings only as `severity | file:line |
   description`, or `none`." Description `"Review: <agent>"`.
2. Dispatch **`change-reviewer`**. Prompt: "story_dir=`<DIR>`, output_path=`<DIR>/review.md`,
   review_round=`R`", plus `specialist_findings=<their raw returns>` when step 1 ran.
   Description `"Review: change-reviewer"`.
3. Verify `<DIR>/review.md` exists. The verdict is the agent's `VERDICT:` line.

## 3. Return
Normalise `APPROVE` → `approved` and `CHANGES_REQUESTED` → `changes_requested`. Run
`.arcus/bin/checkpoint.sh complete <STORY_ID> code_review`, emit
`[Review] <verdict>: critical <C>, warning <W>, suggestion <S>`, and end with
`VERDICT: approved | changes_requested`.
