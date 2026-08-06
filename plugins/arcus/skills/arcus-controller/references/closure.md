# Stage: Closure (one-shot + script, terminal)

Stage instructions for the `closure` checkpoint key. The controller reads this file in-thread when it
reaches Closure; the **Dispatching an ARCUS agent** rules are in `SKILL.md` and apply here unchanged —
they are not restated below.

1. **Build PR description** — dispatch a subagent:
   - **Agent**: `pull-request-builder`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/PR_DESCRIPTION.md`."
   - **Description**: "Closure: pull-request-builder"
   - **Model**: resolve complexity `light` via the `arcus:model-strategy` skill.
   - Verify the file exists.
2. **Create PR**: run `.arcus/bin/pr.sh <STORY_ID>`.
3. **Mark complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> closure`.
4. **Output**: `[Complete] PR deployed: <link from pr.sh output>`.
