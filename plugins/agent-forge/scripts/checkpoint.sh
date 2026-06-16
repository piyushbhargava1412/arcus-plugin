#!/usr/bin/env bash
# ==============================================================================
# NAME: checkpoint.sh
# DESCRIPTION: Manages session-checkpoint.json for story execution state.
#              Tracks fine-grained sub-stages for resume support.
# USAGE:
#   scripts/checkpoint.sh init <STORY_ID> [<BRANCH_NAME>] [<BASE_BRANCH>]
#   scripts/checkpoint.sh read <STORY_ID>
#   scripts/checkpoint.sh complete <STORY_ID> <stage>
# ==============================================================================

set -eo pipefail

ACTION="$1"
STORY_ID="$2"

if [ -z "$ACTION" ] || [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: checkpoint.sh <init|read|complete> <STORY_ID> [stage]" >&2
    exit 1
fi

WORKSPACE_DIR=".aforge/specs/$STORY_ID"
CHECKPOINT_FILE="$WORKSPACE_DIR/session-checkpoint.json"

case "$ACTION" in
    init)
        mkdir -p "$WORKSPACE_DIR"

        # Parse optional flags
        BRANCH_NAME="${3:-$(git rev-parse --abbrev-ref HEAD)}"
        BASE_BRANCH="${4:-main}"

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
  "workflow": "afk",
  "current_status": "IN_PROGRESS",
  "stages": {
    "init": false,
    "context_pack": false,
    "spec_finalizer": false,
    "blueprint": false,
    "test_plan": false,
    "task_1": false,
    "task_2": false,
    "task_3": false,
    "task_4": false,
    "task_5": false,
    "task_6": false,
    "task_7": false,
    "task_8": false,
    "pr": false
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

        if [ ! -f "$CHECKPOINT_FILE" ]; then
            echo "[ERROR] No checkpoint file found at $CHECKPOINT_FILE" >&2
            exit 1
        fi

        # Update the stage to completed using node
        temp_json=$(mktemp)
        node -e "
            const fs = require('fs');
            const cp = JSON.parse(fs.readFileSync('$CHECKPOINT_FILE', 'utf8'));
            cp.stages['$STAGE'] = true;
            console.log(JSON.stringify(cp, null, 2));
        " > "$temp_json"
        mv "$temp_json" "$CHECKPOINT_FILE"

        echo "STAGE_COMPLETED: $STAGE"
        ;;

    *)
        echo "[ERROR] Unknown action: $ACTION. Use init|read|complete." >&2
        exit 1
        ;;
esac
