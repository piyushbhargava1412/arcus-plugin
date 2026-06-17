#!/usr/bin/env bash
# ==============================================================================
# NAME: commit.sh
# DESCRIPTION: Stages all changes and creates a conventional commit.
# USAGE: scripts/commit.sh <STORY_ID> <message>
# ==============================================================================

set -eo pipefail

STORY_ID="$1"
MESSAGE="$2"

if [ -z "$STORY_ID" ] || [ -z "$MESSAGE" ]; then
    echo "[ERROR] Usage: commit.sh <STORY_ID> <message>" >&2
    exit 1
fi

# Stage all changes (excluding .arcus artifacts)
git add --all
git reset -- .arcus/ 2>/dev/null || true

# Check if there's anything to commit
if git diff --cached --quiet; then
    echo "[INFO] Nothing to commit."
    exit 0
fi

# Create conventional commit
git commit -m "feat($STORY_ID): $MESSAGE"

echo "COMMITTED: feat($STORY_ID): $MESSAGE"
