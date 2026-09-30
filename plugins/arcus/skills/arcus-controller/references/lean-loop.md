# Lean Implementation Loop (profile: lean)

Used instead of Steps 4–5 of the `arcus:implementation-runner` skill when the checkpoint's `profile` is `lean`. No
dispatcher agent, per-task refactor gate, or per-task spec check. The code-review gate runs the
full suite and one holistic review over the whole branch, which covers those.

`<DIR>` = `.arcus/specs/<STORY_ID>`.

## 1. Branch
If the `branch` stage is not `complete`: `.arcus/bin/branch.sh <STORY_ID>`, then
`.arcus/bin/checkpoint.sh complete <STORY_ID> branch`.

## 2. Choose where the tasks run
Read `<DIR>/plan.md`. Pending tasks = `### Task N:` headings whose stage is not `complete`.

- **In-thread** (default): ≤ 3 pending tasks and none is `heavy`. You implement them yourself, here.
  This is the cheapest path. Nothing is re-read, and you already hold the plan.
- **Subagent per task**: otherwise. Each task goes to one fresh **general-purpose** subagent (the
  host's built-in generic agent type, never `subagent-task-dispatcher`), run synchronously, one at a
  time.

## 3. Per task (in plan order, one at a time)
Finish each task, including its commit and `checkpoint complete`, before starting the next.
Never run tasks in parallel, and never batch commits. The per-task commit is what makes a failed
run resumable.

**TDD, in-thread.** Write the task's `- Test:` cases first and run them to see them fail
(RED). Implement the minimum to pass (GREEN). Tidy only what you touched. Run the task's tests
plus the test command from `plan.md` → `## Context` scoped to the touched module. Then:

```
.arcus/bin/commit.sh <STORY_ID> "Task N: <title>"
.arcus/bin/checkpoint.sh complete <STORY_ID> task_N
```

**Subagent.** Resolve the model with
`node .arcus/bin/models.mjs resolve --complexity <task complexity> --checkpoint <DIR>/session-checkpoint.json`
(`dispatch:false` → omit the model parameter; `model` → use it verbatim; `models` → your host's key).
Description `"Task N: <title>"`. Prompt (fill the `<>`s; do **not** paste plan content, since the child reads it):

```
Implement Task N of the plan at <DIR>/plan.md (read `## Context`, `## Decisions`, and `### Task N:`).
Strict TDD: write the task's `- Test:` cases first and confirm they fail, implement the minimum to
pass, then run the tests for the touched module; no regressions. Follow the patterns named in
`## Context`. Touch only this task's files unless unavoidable. Do not commit.
Reply with ONLY:
STATUS: DONE | BLOCKED
FILES: <paths>
TESTS: <command> → <pass/fail summary>
NOTES: <one line, or none>
```

On `DONE`, verify the tests pass by running `TESTS` yourself, then commit and complete as above.
If it fails, re-dispatch once with the failure output appended. On `BLOCKED`, or a second failure,
run `.arcus/bin/checkpoint.sh fail <STORY_ID> task_N "<reason>"` and stop.

## 4. Loopback (after `changes_requested`)
`.arcus/bin/checkpoint.sh reopen <STORY_ID> code_review`. For each **critical** and **warning** finding in
`<DIR>/review.md`, append a `### Task N:` to `plan.md` (continue numbering, `Complexity: light` unless the
finding says otherwise, one `- Test:` that would have caught it). Run `.arcus/bin/checkpoint.sh set-tasks <STORY_ID> <total>`,
then run step 3 for the new tasks only. The cap is **2** review rounds
(`node .arcus/bin/arcus-controller.mjs loopback --review-round <N> --profile lean`). Past it, hand the
remaining findings to the user.

## 5. Done
Emit `[Code] Complete: <N> tasks, <M> files changed` (M from `git diff --stat <base>...HEAD`) and return.
