# Stage: Brainstorm (context-pack-builder, spec-finalizer, then implementation-planner)

Stage instructions for the `context_pack`, `spec_finalizer` and `plan` checkpoint keys. The
controller reads this file in-thread when it reaches Brainstorm; the **Dispatching an ARCUS agent**
rules and the **Open-Questions Protocol** are in `SKILL.md` and apply here unchanged — they are not
restated below.

1. **Context pack** — dispatch a one-shot subagent:
   - **Agent**: `context-pack-builder`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Story: `<STORY>`. Repo context: `<repo_context>`. Write the context pack to `<context_pack_path>`."
   - **Description**: "Brainstorm: context-pack-builder"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - It produces a `context_pack` describing the story-relevant slice of the repository, resolved to
     the workspace file `.arcus/specs/<STORY_ID>/context-pack.md`.
   - `context-pack.md` exists → `.arcus/bin/checkpoint.sh complete <STORY_ID> context_pack`. Mark
     this stage **now, before spec-finalizer runs** — never batched after both agents have run.
2. **Spec finalization** — dispatch a one-shot subagent:
   - **Agent**: `spec-finalizer`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Story: `<STORY>`. Context pack: `<context_pack_path>`. Write the grounded spec to `<spec_grounding_path>`." — appending, only when the caller supplied one, "The user has answered the previously emitted Open Questions; `answers`: `<answers>`."
   - **Description**: "Brainstorm: spec-finalizer"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - It analyzes the story for completeness and resolves every ambiguity, producing a
     `spec_grounding`, resolved to the workspace file `.arcus/specs/<STORY_ID>/grounded-spec.md`.
   - `grounded-spec.md` exists → run the **Open-Questions Protocol** against it. **Only if that
     protocol returns without halting** may you run
     `.arcus/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`. If it halted, the stage is
     `awaiting_handoff` and you are done for this turn — see the prohibition in that protocol.
3. **Create implementation plan** — dispatch a one-shot subagent (identical in all three modes; the agent
   never interviews):
   - **Agent**: `implementation-planner`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Story ID: `<STORY_ID>`. Write the plan to `.arcus/specs/<STORY_ID>/plan.md`."
   - **Description**: "Brainstorm: implementation-planner"
   - **Model**: resolve complexity `heavy` via the `arcus:model-strategy` skill.
   - Verify `plan.md` exists, then run the **Open-Questions Protocol** against `plan.md`. **Only if
     it returns without halting** may you run `.arcus/bin/checkpoint.sh complete <STORY_ID> plan`.
4. **Record the task count**: run `.arcus/bin/checkpoint.sh set-tasks <STORY_ID> <N>` (N = `### Task`
   headings in `plan.md`) so the checkpoint reflects every planned task slot immediately, instead of
   relying on per-task keys appearing only as `implementation-runner` starts each one.
5. **Output**: emit `[Brainstorm] Complete: <N> tasks, <M> decisions` (M = resolved decisions in
   `grounded-spec.md`) and continue into Test Plan. There is no gate here: the human's input for this
   phase was the Open-Questions Protocol above, and it has already happened.
