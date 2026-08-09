# Stage 0: Scaffold (deterministic, no gate, no branch)

This stage is the cold-start entry point. The mechanical checkpoint walk now lives in
`.arcus/bin/arcus-controller.mjs`; use it rather than re-deriving resume behavior from prose.

1. **Stage the helper scripts**: run `bash "$ARCUS_HOME"/scripts/locate.sh` from the repo root
   (idempotent; see Helper Scripts). Do this before any other script call, on every run — including
   resumes — so a stale or missing `.arcus/bin/` can never silently serve old logic.
2. **Extract Story ID**: run `.arcus/bin/extract_story_id.sh <STORY_FILE>` and capture `STORY_ID`.
   If the script is missing, derive the ID from the filename (strip path and `.md`).
3. **Check checkpoint**: run `.arcus/bin/checkpoint.sh read <STORY_ID>`. If it already exists, run
   `node .arcus/bin/arcus-controller.mjs decide --checkpoint .arcus/specs/<STORY_ID>/session-checkpoint.json`
   and jump to [`resumption-protocol.md`](resumption-protocol.md) instead of re-scaffolding.
4. **Resolve the mode** from the activation trigger per the Activation table in `SKILL.md`:
   default/`plan` → checkpoint value `gated`; `--intelligent` → checkpoint value `intelligent`;
   `forge`/`afk`/`run afk on`/`--afk` → checkpoint value `afk`.
5. **Scaffold the workspace**: run `.arcus/bin/scaffold.sh <STORY_FILE> --mode <afk|intelligent|gated>`.
   `--mode` is **always passed explicitly** by the controller for all three modes — leaving it to the
   script's own default could land a cloud run at `AWAITING_HANDOFF` with no human to resume it. This
   creates `.arcus/specs/<STORY_ID>/`, copies `story.md`, and initializes the checkpoint with the
   **planned** `branch_name`/`base_branch` and the persisted `mode`. Capture `STORY_ID`,
   `BRANCH_NAME`, `BASE_BRANCH`, and `BRANCH_MODE` from its output. (If scaffold cannot persist the
   mode, call `.arcus/bin/checkpoint.sh set-mode <STORY_ID> <afk|intelligent|gated>`.)
6. **Interpret `BRANCH_MODE`**:
   - **`new`** — a branch name was planned and **no git branch created**. Realization is deferred to
     the `branch` stage at the start of Implementation.
   - **`adopted`** — the workspace is a linked git worktree already checked out on a dedicated session
     branch, so that branch **is** the story branch: it is recorded as `branch_name`, the base
     resolves to the repo default, and the `branch` stage is already `complete`.
   - **`existing`** — a checkpoint for this story was already on disk, so scaffold wrote nothing and
     the echoed branch/base are the stored ones. Treat this as resume, not new scaffold.
7. **Mark scaffold complete**: `.arcus/bin/checkpoint.sh complete <STORY_ID> scaffold`.
8. **Output**: emit `[Story] <STORY_ID> (<mode>)` with the persisted mode (`afk`/`intelligent`/`gated`),
   then flow into Brainstorm.
