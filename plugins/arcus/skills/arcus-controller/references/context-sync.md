# Stage: Context Sync (one-shot, runs only after final approval)

Stage instructions for the `context_sync` checkpoint key. The controller reads this file in-thread
when it reaches Context Sync; the **Dispatching an ARCUS agent** rules are in `SKILL.md` and apply
here unchanged — they are not restated below.

Runs **only after** a final `approved` verdict — the diff is now stable and approved. Reconciles any
shared `.context/` artifact that the approved change set materially drifted.

1. **Run the drift sync** — dispatch a one-shot subagent:
   - **Agent**: `context-drift-sync`, resolved per **Agent Resolution** in `arcus:model-strategy`.
   - **Prompt**: "Inputs: `sync_scope=branch`,
     `base_ref=`merge-base(HEAD, `<base_branch>`), `apply_mode=auto`, `commit_label=<STORY_ID>`."
   - **Description**: "Context Sync: context-drift-sync"
   - **Model**: resolve complexity `medium` via the `arcus:model-strategy` skill.
   - Then `.arcus/bin/checkpoint.sh complete <STORY_ID> context_sync`.
2. **Output**: `[Context] <K artifacts updated, J skipped — or "no material drift">`. Continue to
   Closure.
