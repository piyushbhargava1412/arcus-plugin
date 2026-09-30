# Lean Context Sync + Closure (profile: lean)

Used instead of [`context-sync.md`](context-sync.md) and [`closure.md`](closure.md) when the
checkpoint's `profile` is `lean`. `<DIR>` = `.arcus/specs/<STORY_ID>`.

## Context Sync: only when drift is real
```
node .arcus/bin/gate.mjs drift --story <STORY_ID>
```
- `drift: false` → `.arcus/bin/checkpoint.sh complete <STORY_ID> context_sync` and emit
  `[Context] no material drift`. **Do not dispatch anything.**
- `drift: true` → run the thorough procedure in [`context-sync.md`](context-sync.md) (the
  `context-drift-sync` agent), passing the `reasons` list as the drift hint.

## Closure: PR body in-thread, no agent
Write `<DIR>/PR_DESCRIPTION.md` yourself from `plan.md`, `review.md` and
`git diff --stat <base_branch>...HEAD`. The budget is **≤ 40 lines**, written for the reviewer about to
read the diff. Reference the artifacts; never restate them. Omit empty sections.

```markdown
## <STORY_ID>: <title>

<2–3 sentences: what changed and why.>

### Changes
- <area>: <one line> (`path`, …)

### Decisions worth a look
- <only the 1–2 a reviewer could reasonably disagree with, from plan.md → Decisions>

### Verification
- Gate: <checks and results from gate.json>. Review: <verdict>, round <n>.
```

Then run `.arcus/bin/pr.sh <STORY_ID>`, then `.arcus/bin/checkpoint.sh complete <STORY_ID> closure`, and emit
`[Complete] PR deployed: <link>`.
