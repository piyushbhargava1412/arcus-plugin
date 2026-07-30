#!/usr/bin/env bash
# ==============================================================================
# NAME: checkpoint.sh
# DESCRIPTION: Manages session-checkpoint.json for story execution state.
#              Schema v2 tracks each stage with a status enum
#              (pending | in_progress | awaiting_handoff | complete | needs_rework)
#              to support human-gated, resumable, multi-session workflows.
# USAGE:
#   scripts/checkpoint.sh init       <STORY_ID> [<BRANCH_NAME>] [<BASE_BRANCH>] [<MODE>]
#   scripts/checkpoint.sh read       <STORY_ID>
#   scripts/checkpoint.sh complete   <STORY_ID> <stage>
#   scripts/checkpoint.sh set-status <STORY_ID> <stage> <status>
#   scripts/checkpoint.sh reopen     <STORY_ID> <stage>        # -> needs_rework, bumps review_round
#   scripts/checkpoint.sh set-mode   <STORY_ID> <gated|afk>
#   scripts/checkpoint.sh set-branch <STORY_ID> <branch> <base>
#   scripts/checkpoint.sh set-tasks  <STORY_ID> <N>             # seed/prune task_1..task_N slots
#   scripts/checkpoint.sh set-cursor <STORY_ID> <COMMENT_ID>    # highest ingested comment id
#   scripts/checkpoint.sh set-issue  <STORY_ID> <ISSUE_NUMBER>
#   scripts/checkpoint.sh await-handoff <STORY_ID>              # -> current_status AWAITING_HANDOFF
#   scripts/checkpoint.sh fail       <STORY_ID> <stage> <reason>
#
# Stage status values: pending | in_progress | awaiting_handoff | complete | needs_rework
# Modes: gated (default, human handoff between stages) | afk (autonomous, auto-confirm)
# current_status values: IN_PROGRESS | AWAITING_HANDOFF | COMPLETE | FAILED
#   (AWAITING_INPUT is reserved for the async/cloud channel; no local code path sets it yet.)
#
# `current_stage` is the stage the pipeline is AT — never the last one that finished.
# `complete` advances it to the next stage still to be done; `set-status` points it at
# whatever stage it just touched; `set-tasks` recomputes it, since splicing task slots in
# can insert work BEFORE the stage it currently names. Key order in `stages` IS the
# pipeline order, which is why `set-tasks` splices task_1..N in at their canonical
# position rather than appending.
# ==============================================================================

set -eo pipefail

ACTION="$1"
STORY_ID="$2"

if [ -z "$ACTION" ] || [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: checkpoint.sh <init|read|complete|set-status|reopen|set-mode|set-branch|set-tasks|set-cursor|set-issue|await-handoff|fail> <STORY_ID> [args]" >&2
    exit 1
fi

WORKSPACE_DIR=".arcus/specs/$STORY_ID"
CHECKPOINT_FILE="$WORKSPACE_DIR/session-checkpoint.json"

VALID_STATUSES="pending in_progress awaiting_handoff complete needs_rework"

# Apply a fixed, known mutation ("op") to the checkpoint file in place. All
# dynamic values (stage names, statuses, branch names, ...) are passed to node
# via argv and read from process.argv — never string-interpolated into the JS
# source — so no combination of input characters (quotes, backticks, ${...})
# can alter what code runs. `op` itself is always a literal chosen by the case
# statement below, never the raw $ACTION.
run_mutation() {
    local op="$1"; shift
    if [ ! -f "$CHECKPOINT_FILE" ]; then
        echo "[ERROR] No checkpoint file found at $CHECKPOINT_FILE" >&2
        exit 1
    fi
    local temp_json
    temp_json=$(mktemp)
    node -e '
        const fs = require("fs");
        const [, checkpointFile, op, ...rest] = process.argv;
        const cp = JSON.parse(fs.readFileSync(checkpointFile, "utf8"));

        // Migrate legacy boolean stages -> status strings.
        if (cp.stages) {
            for (const k of Object.keys(cp.stages)) {
                const v = cp.stages[k];
                if (v === true)  cp.stages[k] = "complete";
                if (v === false) cp.stages[k] = "pending";
            }
        }

        switch (op) {
            case "complete": {
                const [stage] = rest;
                cp.stages[stage] = "complete";
                // `current_stage` means "the stage the pipeline is AT", not "the last
                // stage that finished" — so completing one advances it to the next
                // stage still to be done, in key order. Leaving it pointing at the
                // just-completed stage made every reader (and every human opening the
                // file) mistake a finished stage for the active one.
                const keys = Object.keys(cp.stages);
                const next = keys.slice(keys.indexOf(stage) + 1)
                                 .find(k => cp.stages[k] !== "complete");
                cp.current_stage = next || stage;
                cp.current_status = next ? "IN_PROGRESS" : "COMPLETE";
                break;
            }
            case "set-status": {
                const [stage, status] = rest;
                cp.stages[stage] = status;
                if (status === "complete") {
                    // Same state as `complete <stage>`, so it must leave the same
                    // current_stage. Otherwise the two paths disagree and
                    // current_stage ends up naming a finished stage — which is
                    // exactly the confusion `complete` was fixed to avoid.
                    const keys = Object.keys(cp.stages);
                    const next = keys.slice(keys.indexOf(stage) + 1)
                                     .find(k => cp.stages[k] !== "complete");
                    cp.current_stage = next || stage;
                    cp.current_status = next ? "IN_PROGRESS" : "COMPLETE";
                } else {
                    cp.current_stage = stage;
                    cp.current_status = (status === "awaiting_handoff") ? "AWAITING_HANDOFF" : "IN_PROGRESS";
                }
                break;
            }
            case "reopen": {
                const [stage] = rest;
                cp.stages[stage] = "needs_rework";
                cp.current_stage = stage;
                cp.review_round = (cp.review_round || 0) + 1;
                cp.current_status = "IN_PROGRESS";
                break;
            }
            case "set-mode": {
                const [mode] = rest;
                cp.mode = mode;
                break;
            }
            case "set-branch": {
                const [branch, base] = rest;
                cp.branch_name = branch;
                cp.base_branch = base;
                break;
            }
            case "set-tasks": {
                const [nStr] = rest;
                const n = Number.parseInt(nStr, 10);
                cp.stages = cp.stages || {};

                // Prune phantom task_N slots above n that were never started —
                // migrates checkpoints created before task seeding was bounded.
                for (const key of Object.keys(cp.stages)) {
                    const m = /^task_(\d+)$/.exec(key);
                    if (m && Number(m[1]) > n && cp.stages[key] === "pending") {
                        delete cp.stages[key];
                    }
                }

                // Rebuild the stages object so task_1..task_n sit in CANONICAL
                // PIPELINE POSITION (after `branch`, before `code_review`) rather
                // than appended at the end. Key order is the pipeline order any
                // reader walks, so appending after `closure` would misrepresent
                // the sequence. Existing task statuses are preserved.
                const existing = cp.stages;
                const isTask = k => /^task_\d+$/.test(k);
                const tasks = {};
                for (let i = 1; i <= n; i++) {
                    const key = `task_${i}`;
                    tasks[key] = Object.prototype.hasOwnProperty.call(existing, key)
                        ? existing[key]
                        : "pending";
                }
                const rebuilt = {};
                let inserted = false;
                for (const key of Object.keys(existing)) {
                    if (isTask(key)) continue; // re-emitted from `tasks` below
                    if (key === "code_review" && !inserted) {
                        Object.assign(rebuilt, tasks);
                        inserted = true;
                    }
                    rebuilt[key] = existing[key];
                }
                if (!inserted) Object.assign(rebuilt, tasks); // no code_review key (legacy)
                cp.stages = rebuilt;

                // Re-point `current_stage`. Task slots are seeded AFTER the plan
                // is compiled, so before this call the stages object had no
                // task_N keys at all — and a `branch` stage completed earlier
                // (which scaffold.sh does whenever it adopts the session branch
                // of a linked worktree) would have advanced current_stage
                // straight past them to `code_review`. Splicing the tasks in
                // without recomputing leaves the checkpoint claiming the
                // pipeline is at review before a single task exists.
                const keys = Object.keys(cp.stages);
                const next = keys.find(k => cp.stages[k] !== "complete");
                cp.current_stage = next || keys[keys.length - 1];
                if (cp.current_status !== "FAILED" && cp.current_status !== "AWAITING_HANDOFF") {
                    cp.current_status = next ? "IN_PROGRESS" : "COMPLETE";
                }
                break;
            }
            case "fail": {
                const [stage, reason] = rest;
                cp.current_status = "FAILED";
                cp.failure = { stage, reason: reason || "" };
                break;
            }
            case "set-cursor": {
                // Highest issue-comment id already folded into this story. Makes a
                // re-delivered webhook, or a second run racing the first, a no-op
                // instead of re-answering questions that were already answered.
                const [cursor] = rest;
                cp.last_processed_comment_id = Number.parseInt(cursor, 10) || 0;
                cp.last_processed_at = new Date().toISOString();
                break;
            }
            case "set-issue": {
                const [num] = rest;
                cp.issue_number = Number.parseInt(num, 10) || 0;
                break;
            }
            case "await-handoff": {
                // Marks a pending handoff gate without touching any per-stage status —
                // deliberately distinct from a stage being incomplete.
                cp.current_status = "AWAITING_HANDOFF";
                break;
            }
            default:
                console.error(`[ERROR] Unknown mutation op: ${op}`);
                process.exit(1);
        }

        console.log(JSON.stringify(cp, null, 2));
    ' "$CHECKPOINT_FILE" "$op" "$@" > "$temp_json"
    mv "$temp_json" "$CHECKPOINT_FILE"
}

case "$ACTION" in
    init)
        mkdir -p "$WORKSPACE_DIR"

        # Parse optional positional args.
        BRANCH_NAME="${3:-$(git rev-parse --abbrev-ref HEAD)}"
        BASE_BRANCH="${4:-main}"
        MODE="${5:-gated}"

        if [ -f "$CHECKPOINT_FILE" ]; then
            echo "CHECKPOINT_EXISTS: true"
            cat "$CHECKPOINT_FILE"
            exit 0
        fi

        cat <<EOF > "$CHECKPOINT_FILE"
{
  "story_id": "$STORY_ID",
  "branch_name": "$BRANCH_NAME",
  "base_branch": "$BASE_BRANCH",
  "workflow": "arcus",
  "schema_version": 2,
  "mode": "$MODE",
  "current_status": "IN_PROGRESS",
  "current_stage": "scaffold",
  "review_round": 0,
  "stages": {
    "scaffold": "pending",
    "context_pack": "pending",
    "spec_finalizer": "pending",
    "plan": "pending",
    "test_plan": "pending",
    "branch": "pending",
    "code_review": "pending",
    "context_sync": "pending",
    "closure": "pending"
  }
}
EOF
        echo "CHECKPOINT_CREATED: $CHECKPOINT_FILE"
        ;;

    read)
        if [ ! -f "$CHECKPOINT_FILE" ]; then
            echo "CHECKPOINT_EXISTS: false"
            exit 0
        fi
        echo "CHECKPOINT_EXISTS: true"
        cat "$CHECKPOINT_FILE"
        ;;

    complete)
        STAGE="$3"
        if [ -z "$STAGE" ]; then
            echo "[ERROR] Usage: checkpoint.sh complete <STORY_ID> <stage>" >&2
            exit 1
        fi
        run_mutation complete "$STAGE"
        echo "STAGE_COMPLETED: $STAGE"
        ;;

    set-status)
        STAGE="$3"
        STATUS="$4"
        if [ -z "$STAGE" ] || [ -z "$STATUS" ]; then
            echo "[ERROR] Usage: checkpoint.sh set-status <STORY_ID> <stage> <status>" >&2
            exit 1
        fi
        if ! printf '%s' " $VALID_STATUSES " | grep -q " $STATUS "; then
            echo "[ERROR] Invalid status '$STATUS'. Valid: $VALID_STATUSES" >&2
            exit 1
        fi
        run_mutation set-status "$STAGE" "$STATUS"
        echo "STAGE_STATUS: $STAGE = $STATUS"
        ;;

    reopen)
        STAGE="$3"
        if [ -z "$STAGE" ]; then
            echo "[ERROR] Usage: checkpoint.sh reopen <STORY_ID> <stage>" >&2
            exit 1
        fi
        run_mutation reopen "$STAGE"
        echo "STAGE_REOPENED: $STAGE"
        ;;

    set-mode)
        MODE="$3"
        if [ "$MODE" != "gated" ] && [ "$MODE" != "afk" ]; then
            echo "[ERROR] Usage: checkpoint.sh set-mode <STORY_ID> <gated|afk>" >&2
            exit 1
        fi
        run_mutation set-mode "$MODE"
        echo "MODE_SET: $MODE"
        ;;

    set-branch)
        BRANCH="$3"
        BASE="$4"
        if [ -z "$BRANCH" ] || [ -z "$BASE" ]; then
            echo "[ERROR] Usage: checkpoint.sh set-branch <STORY_ID> <branch> <base>" >&2
            exit 1
        fi
        run_mutation set-branch "$BRANCH" "$BASE"
        echo "BRANCH_SET: $BRANCH (base: $BASE)"
        ;;

    set-tasks)
        N="$3"
        if [ -z "$N" ] || ! printf '%s' "$N" | grep -qE '^[0-9]+$'; then
            echo "[ERROR] Usage: checkpoint.sh set-tasks <STORY_ID> <N> (N must be a non-negative integer)" >&2
            exit 1
        fi
        run_mutation set-tasks "$N"
        echo "TASKS_SET: $N"
        ;;

    set-cursor)
        CURSOR="$3"
        if [ -z "$CURSOR" ] || ! printf '%s' "$CURSOR" | grep -qE '^[0-9]+$'; then
            echo "[ERROR] Usage: checkpoint.sh set-cursor <STORY_ID> <COMMENT_ID>" >&2
            exit 1
        fi
        run_mutation set-cursor "$CURSOR"
        echo "CURSOR_SET: $CURSOR"
        ;;

    set-issue)
        NUM="$3"
        if [ -z "$NUM" ] || ! printf '%s' "$NUM" | grep -qE '^[0-9]+$'; then
            echo "[ERROR] Usage: checkpoint.sh set-issue <STORY_ID> <ISSUE_NUMBER>" >&2
            exit 1
        fi
        run_mutation set-issue "$NUM"
        echo "ISSUE_SET: $NUM"
        ;;

    await-handoff)
        run_mutation await-handoff
        echo "AWAITING_HANDOFF"
        ;;

    fail)
        STAGE="$3"
        REASON="$4"
        if [ -z "$STAGE" ]; then
            echo "[ERROR] Usage: checkpoint.sh fail <STORY_ID> <stage> <reason>" >&2
            exit 1
        fi
        run_mutation fail "$STAGE" "$REASON"
        echo "STORY_FAILED: $STAGE"
        ;;

    *)
        echo "[ERROR] Unknown action: $ACTION. Use init|read|complete|set-status|reopen|set-mode|set-branch|set-tasks|set-cursor|set-issue|await-handoff|fail." >&2
        exit 1
        ;;
esac
