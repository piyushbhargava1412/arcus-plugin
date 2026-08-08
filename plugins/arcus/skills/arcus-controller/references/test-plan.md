# Stage: Test Plan (one-shot)

Stage instructions for the `test_plan` checkpoint key. The controller reads this file in-thread when
it reaches Test Plan; the **Dispatching an ARCUS agent** rules are in `SKILL.md` and apply here
unchanged — they are not restated below.

1. **Compile test spec** — dispatch a subagent:
   - **Agent**: `test-spec-compiler`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Story ID: `<STORY_ID>`. Produce `.arcus/specs/<STORY_ID>/test-plan.md`."
   - **Description**: "TestPlan: test-spec-compiler"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Verify the file exists, then `.arcus/bin/checkpoint.sh complete <STORY_ID> test_plan`.
2. **Output**: emit `[TestPlan] Complete: <N> test cases`, then run the
   **Phase-Boundary Gate Protocol** in `SKILL.md` for the `test_plan` phase-group key. If it does not
   gate, continue into Implementation.
