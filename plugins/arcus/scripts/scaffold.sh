#!/usr/bin/env bash
# ==============================================================================
# NAME: scaffold.sh
# DESCRIPTION: Scaffolds the .arcus/specs/<STORY_ID>/ workspace and initializes
#              the session checkpoint with the PLANNED branch fields. Branch
#              creation is DEFERRED to Implementation (see branch.sh); this
#              script creates NO git branch.
#
#              EXCEPT when it ADOPTS the current branch. In a linked git
#              worktree the workspace already sits on a dedicated feature branch
#              that the host has bound its PR tracking to, so planning a fresh
#              arcus/<id>-N off it would detach the story from that branch. In
#              that case the current branch IS the story branch: it is recorded
#              as branch_name and the `branch` stage is pre-completed, so
#              Implementation skips branch.sh entirely.
# USAGE: scripts/scaffold.sh <STORY_FILE|STORY_ID> [--base <branch>] [--mode <gated|afk>]
#                            [--use-current-branch | --new-branch]
# ==============================================================================

set -eo pipefail

ARG1="$1"
BASE_BRANCH=""
MODE=""
# "" = auto-detect (adopt only inside a linked worktree), 1 = always adopt,
# 0 = never adopt. ARCUS_USE_CURRENT_BRANCH=1 is the env-var equivalent of the
# --use-current-branch flag, for callers that cannot pass argv.
ADOPT="${ARCUS_USE_CURRENT_BRANCH:+1}"

if [ -z "$ARG1" ]; then
    echo "[ERROR] Usage: scaffold.sh <STORY_FILE|STORY_ID> [--base <branch>] [--mode <gated|afk>] [--use-current-branch|--new-branch]" >&2
    exit 1
fi

# Parse optional flags.
shift
while [[ $# -gt 0 ]]; do
    case "$1" in
        --base) BASE_BRANCH="$2"; shift 2 ;;
        --mode) MODE="$2"; shift 2 ;;
        --use-current-branch) ADOPT=1; shift ;;
        --new-branch) ADOPT=0; shift ;;
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

_gitlib="$_SCRIPT_DIR/lib/git_context.sh"
[ -f "$_gitlib" ] || _gitlib="${ARCUS_HOME:-}/scripts/lib/git_context.sh"
# shellcheck source=/dev/null
. "$_gitlib"

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

# Decide whether to ADOPT the current branch as the story branch, or PLAN a new
# arcus/<id>-N one. Auto-detection is deliberately narrow — a linked worktree on
# a non-default branch — because that is the case where the branch is not
# incidental: the host created it for this session and bound PR tracking to it,
# so cutting a second branch off it strands the work. A normal checkout that
# merely happens to sit on a feature branch is NOT adopted; say so explicitly
# with --use-current-branch if that is what you want.
CURRENT_BRANCH="$(current_branch)"
DEFAULT_BRANCH="$(repo_default_branch)"

if [ -z "$ADOPT" ]; then
    if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ] && is_linked_worktree; then
        ADOPT=1
    else
        ADOPT=0
    fi
fi

# A detached HEAD has no branch to adopt.
if [ "$ADOPT" = "1" ] && [ -z "$CURRENT_BRANCH" ]; then
    echo "[ERROR] Cannot adopt the current branch: HEAD is detached." >&2
    exit 1
fi

if [ "$ADOPT" = "1" ]; then
    BRANCH_MODE="adopted"
    BRANCH_NAME="$CURRENT_BRANCH"
    # The working branch has BECOME the story branch, so it cannot also be its
    # own base — that would produce a self-targeting PR at closure. Fall back to
    # the repo default rather than the current HEAD used by the planning path.
    if [ -z "$BASE_BRANCH" ]; then
        BASE_BRANCH="${ARCUS_BASE_BRANCH:-$DEFAULT_BRANCH}"
    fi
    if [ "$BASE_BRANCH" = "$BRANCH_NAME" ]; then
        echo "[ERROR] Adopted branch '$BRANCH_NAME' cannot also be its own base branch." >&2
        echo "        Pass --base <branch> to name the branch this PR should target." >&2
        exit 1
    fi
else
    BRANCH_MODE="new"
    # Compute the PLANNED branch name (no git branch is created here).
    BRANCH_NAME="$(compute_branch_name "$STORY_ID")"
    # Base defaults to the current working branch — whether that is the default
    # branch or a feature branch being deliberately stacked on.
    if [ -z "$BASE_BRANCH" ]; then
        BASE_BRANCH="${ARCUS_BASE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
    fi
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

# On the adopt path the branch already exists and is checked out, so the `branch`
# stage has nothing left to do — pre-complete it. This is what keeps branch.sh
# from cutting a second branch off the session branch during Implementation.
if [ "$BRANCH_MODE" = "adopted" ]; then
    bash "$_checkpoint" complete "$STORY_ID" branch >/dev/null
fi

# Output for the calling agent to parse.
echo "STORY_ID: $STORY_ID"
echo "BRANCH_NAME: $BRANCH_NAME"
echo "BASE_BRANCH: $BASE_BRANCH"
echo "BRANCH_MODE: $BRANCH_MODE"
echo "WORKSPACE_DIR: $WORKSPACE_DIR"
