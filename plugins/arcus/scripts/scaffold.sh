#!/usr/bin/env bash
# ==============================================================================
# NAME: scaffold.sh
# DESCRIPTION: Scaffolds the .arcus/specs/<STORY_ID>/ workspace and initializes
#              the session checkpoint with the PLANNED branch fields. Branch
#              creation is DEFERRED to Implementation (see branch.sh); this
#              script creates NO git branch.
# USAGE: scripts/scaffold.sh <STORY_FILE|STORY_ID> [--base <branch>] [--mode <gated|afk>]
# ==============================================================================

set -eo pipefail

ARG1="$1"
BASE_BRANCH=""
MODE=""

if [ -z "$ARG1" ]; then
    echo "[ERROR] Usage: scaffold.sh <STORY_FILE|STORY_ID> [--base <branch>] [--mode <gated|afk>]" >&2
    exit 1
fi

# Parse optional flags.
shift
while [[ $# -gt 0 ]]; do
    case "$1" in
        --base) BASE_BRANCH="$2"; shift 2 ;;
        --mode) MODE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# Resolve sibling script paths using the documented convention: the caller's
# own directory first (works in both the source-tree layout scripts/... and the
# staged flat layout .arcus/bin/...), then fall back to $ARCUS_HOME/scripts.
_SCRIPT_DIR="$(dirname "$0")"

_extract="$_SCRIPT_DIR/extract_story_id.sh"
[ -f "$_extract" ] || _extract="${ARCUS_HOME:-}/scripts/extract_story_id.sh"

_checkpoint="$_SCRIPT_DIR/checkpoint.sh"
[ -f "$_checkpoint" ] || _checkpoint="${ARCUS_HOME:-}/scripts/checkpoint.sh"

# Source the shared branch-name library (same convention).
_lib="$_SCRIPT_DIR/lib/branch_name.sh"
[ -f "$_lib" ] || _lib="${ARCUS_HOME:-}/scripts/lib/branch_name.sh"
# shellcheck source=/dev/null
. "$_lib"

# Resolve STORY_ID. If arg1 is a readable file, run extract_story_id.sh and
# parse its `STORY_ID:` line; otherwise treat arg1 as the STORY_ID directly.
STORY_FILE=""
if [ -f "$ARG1" ]; then
    STORY_FILE="$ARG1"
    STORY_ID="$(bash "$_extract" "$STORY_FILE" | awk -F': ' '/^STORY_ID:/ {print $2; exit}')"
    if [ -z "$STORY_ID" ]; then
        echo "[ERROR] Could not extract STORY_ID from $STORY_FILE" >&2
        exit 1
    fi
else
    STORY_ID="$ARG1"
fi

# Compute the PLANNED branch name.
BRANCH_NAME="$(compute_branch_name "$STORY_ID")"

# Determine base branch.
if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH="${ARCUS_BASE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
fi

# Determine mode.
if [ -z "$MODE" ]; then
    MODE="gated"
fi

# Scaffold the workspace folder.
WORKSPACE_DIR=".arcus/specs/$STORY_ID"
mkdir -p "$WORKSPACE_DIR"

# Copy the story file into the workspace (if a file was supplied and it is not
# already at the destination). Do not fail if it is already there.
if [ -n "$STORY_FILE" ]; then
    DEST="$WORKSPACE_DIR/story.md"
    if [ "$(cd "$(dirname "$STORY_FILE")" && pwd)/$(basename "$STORY_FILE")" != "$(cd "$WORKSPACE_DIR" && pwd)/story.md" ]; then
        cp "$STORY_FILE" "$DEST"
    fi
fi

# Ensure .arcus/ is gitignored.
if ! grep -q "^\.arcus" .gitignore 2>/dev/null; then
    printf "\n# --- ARCUS Artifacts ---\n.arcus/\n" >> .gitignore
fi

# Initialize the checkpoint with the PLANNED branch fields (creates NO branch).
bash "$_checkpoint" init "$STORY_ID" "$BRANCH_NAME" "$BASE_BRANCH" "$MODE"

# Output for the calling agent to parse.
echo "STORY_ID: $STORY_ID"
echo "BRANCH_NAME: $BRANCH_NAME"
echo "BASE_BRANCH: $BASE_BRANCH"
echo "WORKSPACE_DIR: $WORKSPACE_DIR"
