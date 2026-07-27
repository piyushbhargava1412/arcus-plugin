#!/usr/bin/env bash
# ==============================================================================
# NAME: pr.sh
# DESCRIPTION: Pushes the current branch to origin and creates a pull request
#              using the PR_DESCRIPTION.md from the story workspace.
# USAGE: scripts/pr.sh <STORY_ID>
# ==============================================================================

set -eo pipefail

STORY_ID="$1"

if [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: pr.sh <STORY_ID>" >&2
    exit 1
fi

WORKSPACE_DIR=".arcus/specs/$STORY_ID"
PR_BODY_FILE="$WORKSPACE_DIR/PR_DESCRIPTION.md"
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Determine base branch from checkpoint or default
if [ -f "$WORKSPACE_DIR/session-checkpoint.json" ]; then
    BASE_BRANCH=$(node -e "const cp=require('./$WORKSPACE_DIR/session-checkpoint.json'); process.stdout.write(cp.base_branch||'main');" 2>/dev/null || echo "main")
else
    BASE_BRANCH="main"
fi

# Push to origin
echo "Pushing $BRANCH_NAME to origin..."
git push origin "$BRANCH_NAME" --force-with-lease

# Create PR, or update it if one already exists for this branch (e.g. a resumed
# run after context_sync/closure re-ran, or a re-run of an already-closed stage).
if [ -f "$PR_BODY_FILE" ]; then
    EXISTING_PR_URL=$(gh pr view "$BRANCH_NAME" --json url -q .url 2>/dev/null || true)
    if [ -n "$EXISTING_PR_URL" ]; then
        gh pr edit "$BRANCH_NAME" --body-file="$PR_BODY_FILE" >/dev/null 2>&1 || {
            echo "[ERROR] gh pr edit failed for existing PR $EXISTING_PR_URL" >&2
            exit 1
        }
        echo "PR_URL: $EXISTING_PR_URL"
    else
        PR_URL=$(gh pr create \
            --title "[ARCUS] $STORY_ID: Spec-to-Code Implementation" \
            --body-file="$PR_BODY_FILE" \
            --base "$BASE_BRANCH" \
            --draft=false 2>&1) || {
            echo "[ERROR] gh pr create failed: $PR_URL" >&2
            exit 1
        }
        echo "PR_URL: $PR_URL"
    fi
else
    echo "[ERROR] $PR_BODY_FILE not found. Cannot create PR." >&2
    exit 1
fi
