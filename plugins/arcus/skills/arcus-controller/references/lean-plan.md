# Stage: Plan (profile: lean)

Replaces Brainstorm + Test Plan on the lean path. `<DIR>` = `.arcus/specs/<STORY_ID>`.

1. **Dispatch `planner`** (one-shot). Resolve the model with
   `node .arcus/bin/models.mjs resolve --complexity heavy --stage planner --checkpoint <DIR>/session-checkpoint.json`
   (`dispatch:false` → omit the model parameter; `model` → use it verbatim; `models` → your host's key).
   - Prompt: "story_path=`<DIR>/story.md`, output_path=`<DIR>/plan.md`" — append
     "answers: `<the user's reply verbatim>`" only when resuming after questions.
   - Description: "Plan: planner"
2. **Questions.** Verify `plan.md` exists, then run
   `node .arcus/bin/arcus-controller.mjs questions --artifact <DIR>/plan.md` and follow
   [`open-questions-protocol.md`](open-questions-protocol.md) (stage key `plan`). If it halts, stop here:
   the stage stays `awaiting_handoff`.
3. **Seed the tasks:** `.arcus/bin/checkpoint.sh set-tasks <STORY_ID> <N>` (N = `### Task` headings),
   then `.arcus/bin/checkpoint.sh complete <STORY_ID> plan`.
4. **Milestone:** run `node .arcus/bin/arcus-controller.mjs counts --plan <DIR>/plan.md` and emit
   `[Plan] Complete: <tasks> tasks, <decisions> decisions, <testCases> test cases`.
5. **Gate:** follow [`phase-boundary-gate-protocol.md`](phase-boundary-gate-protocol.md) with
   phase-group key `plan`. This is the lean gated default, so the human reads the plan (cheap) before
   any code is written (expensive). If it does not gate, continue into Implementation.
