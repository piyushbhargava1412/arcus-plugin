#!/usr/bin/env bash
# ==============================================================================
# NAME: branch.sh
# DESCRIPTION: Creates an isolated git branch for a story and scaffolds the
#              .arcus/specs/<STORY_ID>/ workspace. Auto-increments branch index.
# USAGE: scripts/branch.sh <STORY_ID> [--base <branch>]
# ==============================================================================

set -eo pipefail

STORY_ID="$1"
BASE_BRANCH=""

if [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: branch.sh <STORY_ID> [--base <branch>]" >&2
    exit 1
fi

# Parse optional --base flag
shift
while [[ $# -gt 0 ]]; do
    case "$1" in
        --base) BASE_BRANCH="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# Determine base branch
if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH="${ARCUS_BASE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
fi

# Safety: refuse to proceed with a dirty working tree
if [ -n "$(git status --porcelain)" ]; then
    echo "[ERROR] Uncommitted changes present. Please stash or commit first." >&2
    exit 1
fi

# Auto-increment branch index
max_run=0
while IFS= read -r ref; do
    idx="${ref##*-}"
    if [[ "$idx" =~ ^[0-9]+$ ]] && (( idx > max_run )); then
        max_run=$idx
    fi
done < <(
    { git branch    --format='%(refname:short)' 2>/dev/null
      git branch -r --format='%(refname:short)' 2>/dev/null | sed 's|^origin/||'
    } | sort -u | grep -E "^arcus/${STORY_ID}-[0-9]+$" || true
)
BRANCH_NAME="arcus/${STORY_ID}-$(( max_run + 1 ))"

# Fetch remote refs (best effort)
git fetch --quiet origin 2>/dev/null || true

# Create branch from base
if git rev-parse --verify --quiet "origin/$BASE_BRANCH" >/dev/null 2>&1; then
    git checkout -b "$BRANCH_NAME" "origin/$BASE_BRANCH"
else
    git checkout -b "$BRANCH_NAME" "$BASE_BRANCH"
fi

# Scaffold workspace
WORKSPACE_DIR=".arcus/specs/$STORY_ID"
mkdir -p "$WORKSPACE_DIR"

# Ensure .arcus is in .gitignore
if ! grep -q "^\.arcus" .gitignore 2>/dev/null; then
    printf "\n# --- ARCUS Artifacts ---\n.arcus/\n" >> .gitignore
fi

# Output for the calling agent to parse
echo "BRANCH_NAME: $BRANCH_NAME"
echo "BASE_BRANCH: $BASE_BRANCH"
echo "WORKSPACE_DIR: $WORKSPACE_DIR"
