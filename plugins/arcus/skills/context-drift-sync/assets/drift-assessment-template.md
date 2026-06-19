<!--
SHARED FILE — RENDERED ONLY IN GATED MODE.
This is the gated Drift Assessment the `context-drift-sync` skill renders AFTER code review,
when at least one `.context/` artifact crosses its sync trigger. It presents a per-artifact
assessment and ONE consolidated yes/no confirmation before any edits are applied.

NO-OP RULE: if NO artifact is flagged (no triggers crossed), the skill does NOT render this
template at all — it reports "No material context drift" and proceeds to the next stage.

CONFIRMATION RULE (finalized in plan.md, authoritative): the gated confirmation is a SINGLE
CONSOLIDATED yes/no. It is NOT per-artifact prompts and NOT a deselect UI — one `yes` applies
ALL flagged edits; one `no` skips them all. The per-artifact "one-line change summary" exists
so the user can read what each edit does BEFORE answering that single prompt.
-->

# Drift Assessment: [STORY-ID]

The Code Review stage completed for **[STORY-ID]**. Below is the assessment of `.context/`
artifact drift introduced by this story's changes. Review the per-artifact summaries, then
answer the single consolidated confirmation at the bottom — `yes` applies all flagged updates,
`no` skips them.

## Per-Artifact Assessment

| Artifact | Signals from diff | Trigger crossed? | One-line change summary | Confidence |
|----------|-------------------|------------------|-------------------------|------------|
| [repo_map.md] | [new helper script added under .arcus/bin/] | [yes] | [Add `context_sync.sh` to the Scripts & Automation listing] | [high] |
| [repo_scope.md] | [no change to business capabilities or ownership] | [no] | [No change — not flagged] | [high] |

*(One row per `.context/` artifact assessed. A row with "Trigger crossed? = no" is a no-op and
is excluded from the flagged list below.)*

## Flagged Artifacts — What Changes

These are the artifacts that crossed their sync trigger. Each line is the same one-line change
summary from the table above, restated here as the per-artifact summary you read before
confirming:

- **[repo_map.md]** — [Add `context_sync.sh` to the Scripts & Automation listing.]
- **[<next flagged artifact>]** — [<one-line what-changes summary>]

*(If a flagged artifact has multiple distinct edits, keep the summary to one line covering the
net effect; the full edits are applied on `yes`.)*

## Confirmation

Apply these context updates? (yes / no)

> **Note — this is a SINGLE consolidated confirmation.** There is exactly one yes/no prompt.
> It is NOT per-artifact prompts and NOT a deselect UI. Answering `yes` applies every flagged
> edit listed above; answering `no` skips them all and proceeds without modifying `.context/`.

<!--
REMINDER: When NO artifact is flagged, do NOT render this template. Report
"No material context drift" and proceed to the next stage.
-->
