# Loopback Protocol (Code Review → Implementation)

On a `changes_requested` verdict, loop the findings back into Implementation. **Loopback never
confirms, in any mode**: it runs automatically whether the controller is `afk`, `intelligent`, or
`gated`, with no user prompt either way — the findings are the reviewer's, the fix-tasks are
mechanical, and a human who disagrees reviews the result at the PR.

Use `node .arcus/bin/arcus-controller.mjs loopback --review-round <N>` as the authoritative cap
check. The loop itself is delegated to `arcus:implementation-runner`:

1. **Re-enter `arcus:implementation-runner`** for the loopback (Story ID: `<STORY_ID>`), which turns
   the `changes_requested` findings into fix-tasks and runs them.
2. After the fix-tasks complete, **re-run Code Review** on the updated diff.
3. **Loopback cap**: stop auto-looping once `review_round` reaches **3**. Beyond that, the controller
   stops and **reports** the remaining findings instead of looping a 4th round — **no additional gate
   is inserted here**. A `changes_requested` verdict is never a phase boundary, capped or not.
