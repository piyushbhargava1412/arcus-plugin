#!/usr/bin/env bash
# ==============================================================================
# NAME: state_sync.sh
# DESCRIPTION: Syncs a story's ARCUS workspace to/from the `arcus-state` orphan
#              branch, so a pipeline can resume on a fresh runner.
#
# USAGE:
#   state_sync.sh pull <STORY_ID> [--branch arcus-state]
#   state_sync.sh push <STORY_ID> [--branch arcus-state] [--message "..."]
#
# WHY AN ORPHAN BRANCH: `.arcus/` is gitignored and CI runners are ephemeral, so
# state must live on the remote. It is deliberately NOT the story branch:
# artifacts keep changing after the PR opens (context_sync, closure), which would
# push commits onto a branch under review and invalidate approvals. An orphan
# branch shares no history with main, so it can never be merged by accident and
# never pollutes `git log main`.
#
# Verified 2026-07-27: a GITHUB_TOKEN push to this branch does NOT trigger
# workflows (tested against a deliberately unfiltered `on: push` canary), so
# checkpoint writes cannot spam a target repo's CI.
#
# NEVER FORCE-PUSHES. A non-fast-forward means a concurrent run holds newer
# state; this one's in-memory view is stale, so it aborts rather than clobbering.
# ==============================================================================

set -euo pipefail

ACTION="${1:-}"
STORY_ID="${2:-}"
STATE_BRANCH="arcus-state"
MESSAGE=""

if [ -z "$ACTION" ] || [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: state_sync.sh <pull|push> <STORY_ID> [--branch <name>] [--message <msg>]" >&2
    exit 2
fi
shift 2 || true
while [ $# -gt 0 ]; do
    case "$1" in
        --branch)  STATE_BRANCH="$2"; shift 2 ;;
        --message) MESSAGE="$2"; shift 2 ;;
        *) echo "[ERROR] Unknown option: $1" >&2; exit 2 ;;
    esac
done

# Story ids are `ISSUE-<n>` or `ABC-123`; reject anything that could escape the
# path or reach a shell.
if ! printf '%s' "$STORY_ID" | grep -qE '^[A-Za-z0-9_-]+$'; then
    echo "[ERROR] Invalid STORY_ID '$STORY_ID' (expected [A-Za-z0-9_-]+)" >&2
    exit 2
fi

WORKSPACE_DIR=".arcus/specs/$STORY_ID"
REMOTE_PATH="specs/$STORY_ID"
WT_DIR=".arcus/.state-wt" # inside the gitignored dir; ephemeral

cleanup() { git worktree remove --force "$WT_DIR" >/dev/null 2>&1 || true; }
trap cleanup EXIT

git rev-parse --git-dir >/dev/null 2>&1 || { echo "[ERROR] Not a git repository." >&2; exit 1; }

remote_branch_exists() {
    git ls-remote --exit-code --heads origin "$STATE_BRANCH" >/dev/null 2>&1
}

prepare_worktree() {
    cleanup
    rm -rf "$WT_DIR"
    mkdir -p "$(dirname "$WT_DIR")"
    if remote_branch_exists; then
        git fetch --quiet --depth 1 origin "$STATE_BRANCH"
        # Resolve to a SHA in the MAIN repo first: FETCH_HEAD is not resolvable
        # from inside a freshly-added worktree. Detached is fine — the push below
        # uses `HEAD:<branch>`, so no local branch ref is needed.
        state_sha="$(git rev-parse FETCH_HEAD)"
        git worktree add --quiet --detach "$WT_DIR" "$state_sha"
    else
        # First story in this repo: start the branch with NO history.
        git worktree add --quiet --detach "$WT_DIR" HEAD
        git -C "$WT_DIR" checkout --quiet --orphan "$STATE_BRANCH"
        git -C "$WT_DIR" rm -rqf . 2>/dev/null || true
    fi
}

case "$ACTION" in
    pull)
        if ! remote_branch_exists; then
            echo "STATE_PULLED: none (branch $STATE_BRANCH does not exist yet)"
            exit 0
        fi
        prepare_worktree
        if [ -d "$WT_DIR/$REMOTE_PATH" ]; then
            mkdir -p "$WORKSPACE_DIR"
            # -a preserves the tree; the trailing /. copies contents not the dir.
            cp -a "$WT_DIR/$REMOTE_PATH/." "$WORKSPACE_DIR/"
            echo "STATE_PULLED: $REMOTE_PATH -> $WORKSPACE_DIR"
        else
            echo "STATE_PULLED: none (no $REMOTE_PATH on $STATE_BRANCH)"
        fi
        ;;

    push)
        [ -d "$WORKSPACE_DIR" ] || { echo "[ERROR] No workspace at $WORKSPACE_DIR to push." >&2; exit 1; }
        prepare_worktree
        mkdir -p "$WT_DIR/$REMOTE_PATH"
        # Mirror exactly: a deleted artifact upstream should disappear here too.
        rm -rf "${WT_DIR:?}/$REMOTE_PATH"
        mkdir -p "$WT_DIR/$REMOTE_PATH"
        cp -a "$WORKSPACE_DIR/." "$WT_DIR/$REMOTE_PATH/"

        git -C "$WT_DIR" add -A
        if git -C "$WT_DIR" diff --cached --quiet; then
            echo "STATE_PUSHED: no changes"
            exit 0
        fi
        git -C "$WT_DIR" -c user.name="${GIT_AUTHOR_NAME:-arcus[bot]}" \
                         -c user.email="${GIT_AUTHOR_EMAIL:-arcus@users.noreply.github.com}" \
            commit --quiet -m "${MESSAGE:-chore(arcus-state): sync $STORY_ID}"

        if git -C "$WT_DIR" push --quiet origin "HEAD:$STATE_BRANCH" 2>/dev/null; then
            echo "STATE_PUSHED: $(git -C "$WT_DIR" rev-parse --short HEAD)"
        else
            echo "[ERROR] Push to $STATE_BRANCH was rejected — another run likely holds newer state." >&2
            echo "[ERROR] Aborting rather than force-pushing: this run's state is stale." >&2
            exit 1
        fi
        ;;

    *)
        echo "[ERROR] Unknown action: $ACTION. Use pull|push." >&2
        exit 2
        ;;
esac
