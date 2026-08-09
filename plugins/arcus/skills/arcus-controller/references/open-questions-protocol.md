# Open-Questions Protocol (mid-stage, Brainstorm only)

`arcus:spec-finalizer` and `arcus:implementation-planner` never converse. Each always writes a
**complete** artifact, then records its least-confident decisions in a `## Open Questions` YAML block
inside that same artifact. Surfacing them is the controller's job.

Use `node .arcus/bin/arcus-controller.mjs questions --artifact <path>` as the authoritative parser
for `## Open Questions` + `## Dialogue Answers`. Follow this protocol immediately after the owning
stage produces its artifact, before marking the stage complete:

1. **Read the question block** from `grounded-spec.md` or `plan.md`. If the helper reports no
   questions, return immediately — there is nothing to ask.
2. **In `afk` mode, return immediately regardless.** The artifact is already fully resolved; the
   questions are informational only. Note the low-confidence decision count in the milestone line and
   move on.
3. **In `intelligent` and `gated` mode**, present **every** unanswered question in a **single** turn,
   not one at a time:

   ```
   [Questions] <n> open before <stage>:

   SF-1 — <gap>
     A — <option> (Recommended) — <rationale>
     B — <option>
     C — or answer in your own words
   ```

   Then run `.arcus/bin/checkpoint.sh set-status <STORY_ID> <stage> awaiting_handoff` and **stop**.

   > **Never mark the stage `complete` on this path.** A stage with unanswered questions is
   > `awaiting_handoff`, not `complete` — marking it complete tells every later resume the human
   > already answered, so the questions are silently dropped and the tentative picks ship unreviewed.
4. **On the user's reply**, re-dispatch the same agent with its `answers` input set to the user's
   reply verbatim, writing to the same output path. The agent maps answers to ids, records the mapping
   in `## Dialogue Answers`, and skips re-deriving what it already resolved. **Now** mark the stage
   complete: `.arcus/bin/checkpoint.sh complete <STORY_ID> <stage>`.
5. **Echo the mapping back** so a mis-parse is visible rather than silent:
   `[Questions] Read your answers as: SF-1→B, SF-2→custom("…")`.
6. **Repeat at most once.** A second `## Open Questions` block (round 2) may only contain gaps the
   round-1 answers newly revealed. Never run a third round — the agents auto-resolve past the cap.

Answers are never written by the controller. The owning agent writes its own `## Dialogue Answers`, so
each artifact keeps exactly one writer.
