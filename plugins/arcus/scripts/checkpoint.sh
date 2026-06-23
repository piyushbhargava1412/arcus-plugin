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
#
# Stage status values: pending | in_progress | awaiting_handoff | complete | needs_rework
# Modes: gated (default, human handoff between stages) | afk (autonomous, auto-confirm)
# ==============================================================================

set -eo pipefail

ACTION="$1"
STORY_ID="$2"

if [ -z "$ACTION" ] || [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: checkpoint.sh <init|read|complete|set-status|reopen|set-mode> <STORY_ID> [args]" >&2
    exit 1
fi

WORKSPACE_DIR=".arcus/specs/$STORY_ID"
CHECKPOINT_FILE="$WORKSPACE_DIR/session-checkpoint.json"

VALID_STATUSES="pending in_progress awaiting_handoff complete needs_rework"

# Apply a node mutation to the checkpoint file in place. $1 = JS body operating
# on `cp` (the parsed object). Legacy boolean stage values are migrated to
# status strings on every write (true -> complete, false -> pending).
mutate_json() {
    local body="$1"
    if [ ! -f "$CHECKPOINT_FILE" ]; then
        echo "[ERROR] No checkpoint file found at $CHECKPOINT_FILE" >&2
        exit 1
    fi
    local temp_json
    temp_json=$(mktemp)
    node -e "
        const fs = require('fs');
        const cp = JSON.parse(fs.readFileSync('$CHECKPOINT_FILE', 'utf8'));
        // Migrate legacy boolean stages -> status strings.
        if (cp.stages) {
            for (const k of Object.keys(cp.stages)) {
                const v = cp.stages[k];
                if (v === true)  cp.stages[k] = 'complete';
                if (v === false) cp.stages[k] = 'pending';
            }
        }
        $body
        console.log(JSON.stringify(cp, null, 2));
    " > "$temp_json"
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
    "task_1": "pending",
    "task_2": "pending",
    "task_3": "pending",
    "task_4": "pending",
    "task_5": "pending",
    "task_6": "pending",
    "task_7": "pending",
    "task_8": "pending",
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
        mutate_json "cp.stages['$STAGE'] = 'complete'; cp.current_stage = '$STAGE';"
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
        mutate_json "cp.stages['$STAGE'] = '$STATUS'; cp.current_stage = '$STAGE';"
        echo "STAGE_STATUS: $STAGE = $STATUS"
        ;;

    reopen)
        STAGE="$3"
        if [ -z "$STAGE" ]; then
            echo "[ERROR] Usage: checkpoint.sh reopen <STORY_ID> <stage>" >&2
            exit 1
        fi
        mutate_json "cp.stages['$STAGE'] = 'needs_rework'; cp.current_stage = '$STAGE'; cp.review_round = (cp.review_round || 0) + 1;"
        echo "STAGE_REOPENED: $STAGE"
        ;;

    set-mode)
        MODE="$3"
        if [ "$MODE" != "gated" ] && [ "$MODE" != "afk" ]; then
            echo "[ERROR] Usage: checkpoint.sh set-mode <STORY_ID> <gated|afk>" >&2
            exit 1
        fi
        mutate_json "cp.mode = '$MODE';"
        echo "MODE_SET: $MODE"
        ;;

    set-branch)
        BRANCH="$3"
        BASE="$4"
        if [ -z "$BRANCH" ] || [ -z "$BASE" ]; then
            echo "[ERROR] Usage: checkpoint.sh set-branch <STORY_ID> <branch> <base>" >&2
            exit 1
        fi
        mutate_json "cp.branch_name = '$BRANCH'; cp.base_branch = '$BASE';"
        echo "BRANCH_SET: $BRANCH (base: $BASE)"
        ;;

    *)
        echo "[ERROR] Unknown action: $ACTION. Use init|read|complete|set-status|reopen|set-mode|set-branch." >&2
        exit 1
        ;;
esac
