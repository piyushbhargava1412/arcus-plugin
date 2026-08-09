# Resumption Protocol

When a checkpoint already exists, the deterministic state machine is authoritative in
`.arcus/bin/arcus-controller.mjs`.

1. Run `bash "$ARCUS_HOME"/scripts/locate.sh` first — a resume is exactly when a stale `.arcus/bin/`
   from an earlier session (or an earlier host) is most likely.
2. Read the checkpoint with `.arcus/bin/checkpoint.sh read <STORY_ID>`. Read the **persisted `mode`**
   from the checkpoint (`afk`/`intelligent`/`gated`) and use it directly; do **not** re-infer the mode
   from the resume phrase.
3. Run `node .arcus/bin/arcus-controller.mjs decide --checkpoint .arcus/specs/<STORY_ID>/session-checkpoint.json`.
   Treat its JSON result as authoritative for:
   - checking top-level `current_status` before the per-stage walk
   - distinguishing unanswered open questions from a phase-gate handoff
   - reconciling already-written artifacts back onto `pending`/`in_progress` stages
   - selecting the next incomplete stage in canonical order
4. The load-bearing `AWAITING_HANDOFF` rule has **two distinct causes** — an unanswered
   open-questions question **or a phase gate** — and both resolve the same way whenever nothing is
   actually left unanswered. In practice that means:
   - if the `current_stage` artifact **does not exist**, treat that as **nothing unanswered**
   - if the artifact exists but has **no `## Open Questions` section**, also treat that as
     **nothing unanswered**
   - only a real unanswered id still missing from `## Dialogue Answers` keeps the run stopped
5. Follow the result:
   - `stop_failed` → report `failure.stage` / `failure.reason` and wait for explicit user direction
   - `complete` → report that the story is already complete and do nothing further
   - `await_questions` → re-emit the batched `[Questions]` block and **stop**
   - `loopback` → re-enter Implementation on the review findings, bounded by the Loopback Protocol
   - `run_stage` → read the relevant existing artifacts (`context-pack.md`, `grounded-spec.md`,
     `plan.md`, `test-plan.md`, `review.md`) to restore context, then run that stage

The helper's reconciliation rule is load-bearing: a run can die between writing an artifact and
recording it, leaving a stage `pending` whose output is already on disk. The next resume must not redo
finished work.
