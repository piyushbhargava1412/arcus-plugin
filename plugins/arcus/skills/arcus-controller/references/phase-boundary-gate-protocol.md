# Phase-Boundary Gate Protocol (between phase groups, `gated` only)

Commit `38c3acc` removed phase-boundary gates entirely because mandatory stops trained teams to type
"yes" without reading. ARC-0042 reinstated them as **per-boundary, developer-configurable stops**:
`afk` never stops, `intelligent` stops only for open questions, and `gated` stops at whichever of the
three named boundaries the checkpoint's `stop_after` set retains.

Use `node .arcus/bin/arcus-controller.mjs gate --mode <mode> --stop-after <csv> --phase-group <key>`
as the authoritative membership test once you have loaded `mode` + `stop_after` from the checkpoint.

It applies at **exactly three transitions**, and nowhere else:

| Transition | Phase-group key | Call site |
|---|---|---|
| Test Plan → Implementation | `test_plan` | [`test-plan.md`](test-plan.md) step 2 |
| Implementation → Code Review | `implementation` | `SKILL.md` → **Implementation** |
| Code Review (`approved`) → Context Sync | `code_review` | `SKILL.md` → **Code Review** |

Run this at each of the three transitions:

1. **Membership test — is this boundary gated?** Read `stop_after` from the checkpoint
   (`.arcus/bin/checkpoint.sh read <STORY_ID>`), never from `.arcus/config.json` — that file is
   scaffold-time input and is not consulted again. If the transition's phase-group key is **not in**
   the set, return immediately and continue into the next phase group. `stop_after` is an unordered
   set: order is ignored, duplicates collapse, and an absent/empty list means no phase-boundary gate
   ever fires, even in `gated` mode.
2. **Raise the gate — in exactly this order**, then stop:
   1. Ensure the just-finished **checkpoint stage** is already `complete`. For `test_plan` and
      `code_review` that is done in the stage instructions; for `implementation` there is no extra
      call here because `arcus:implementation-runner` already marked `branch` and every `task_i`
      complete.
   2. Emit `[Gate] <Phase group> complete — say "resume <STORY_ID>" to continue.`
   3. `.arcus/bin/checkpoint.sh await-handoff <STORY_ID>`, then **stop**. Do not begin the next phase
      group; the story continues on `resume <STORY_ID>`.

> **Why that order is load-bearing.** `complete` sets the top-level `current_status` to
> `IN_PROGRESS`. Running it *after* `await-handoff` would clobber the status back from
> `AWAITING_HANDOFF` to `IN_PROGRESS`, and the gate would vanish on the next resume.
>
> **Never use `set-status <STORY_ID> <stage> awaiting_handoff` here.** That marks a *finished* stage
> incomplete, so the next resume re-runs work that already succeeded. `await-handoff` is correct
> precisely because it sets the top-level status only and touches no per-stage status.

This is the deliberate inverse of the Open-Questions Protocol:

| | Open-Questions Protocol | Phase-Boundary Gate Protocol |
|---|---|---|
| Stage state | **Never mark the stage `complete`** — it is genuinely unfinished | Stage **is** `complete` — the work genuinely finished |
| Call to use | `set-status <stage> awaiting_handoff` | `await-handoff` (top-level only) |
| Waiting on | an answer that still changes the artifact | a human look at finished work |

**Constraint — live transitions only.** This protocol is invoked only from the three call sites
above, immediately after the controller itself finished that phase group in the **current** run. It is
never evaluated by the Resumption Protocol's stage walk, and never fires for a stage that was already
`complete` when the run started.
