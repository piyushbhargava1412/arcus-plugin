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

WORKSPACE_DIR=".aforge/specs/$STORY_ID"
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

# Create PR
if [ -f "$PR_BODY_FILE" ]; then
    PR_URL=$(gh pr create \
        --title "[AFK] $STORY_ID: Spec-to-Code Implementation" \
        --body-file="$PR_BODY_FILE" \
        --base "$BASE_BRANCH" \
        --draft=false 2>&1) || {
        echo "[ERROR] gh pr create failed: $PR_URL" >&2
        exit 1
    }
    echo "PR_URL: $PR_URL"
else
    echo "[ERROR] $PR_BODY_FILE not found. Cannot create PR." >&2
    exit 1
fi
