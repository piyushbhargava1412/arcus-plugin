#!/usr/bin/env bash
# ==============================================================================
# NAME: branch.sh
# DESCRIPTION: Creates the isolated git branch for a story at Implementation
#              time. Branch creation is DEFERRED from scaffolding to here: this
#              script reads the PLANNED branch/base from the session checkpoint
#              (written by scaffold.sh), re-verifies for collisions created
#              since scaffold, creates the branch, and updates the checkpoint if
#              the realized name differs from the plan. Workspace scaffolding and
#              .gitignore mutation live in scaffold.sh.
# USAGE: scripts/branch.sh <STORY_ID> [--base <branch>]
# ==============================================================================

set -eo pipefail

STORY_ID="$1"
BASE_BRANCH=""

if [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: branch.sh <STORY_ID> [--base <branch>]" >&2
    exit 1
fi

# Parse optional --base flag.
shift
while [[ $# -gt 0 ]]; do
    case "$1" in
        --base) BASE_BRANCH="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# Resolve sibling script + lib paths using the documented convention: caller's
# own dir first (source-tree and staged flat layouts), then $ARCUS_HOME/scripts.
_SCRIPT_DIR="$(dirname "$0")"

_checkpoint="$_SCRIPT_DIR/checkpoint.sh"
[ -f "$_checkpoint" ] || _checkpoint="${ARCUS_HOME:-}/scripts/checkpoint.sh"

_lib="$_SCRIPT_DIR/lib/branch_name.sh"
[ -f "$_lib" ] || _lib="${ARCUS_HOME:-}/scripts/lib/branch_name.sh"
# shellcheck source=/dev/null
. "$_lib"

# Safety: refuse to proceed with a dirty working tree.
if [ -n "$(git status --porcelain)" ]; then
    echo "[ERROR] Uncommitted changes present. Please stash or commit first." >&2
    exit 1
fi

# Read the PLANNED branch_name/base_branch from the checkpoint. The checkpoint
# may not exist if branch.sh is invoked directly without scaffolding first;
# handle that gracefully by falling back to computed values.
PLANNED_BRANCH=""
CHECKPOINT_BASE=""
HAVE_CHECKPOINT=0

CHECKPOINT_OUT="$(bash "$_checkpoint" read "$STORY_ID" 2>/dev/null || true)"
if printf '%s\n' "$CHECKPOINT_OUT" | grep -q '^CHECKPOINT_EXISTS: true'; then
    HAVE_CHECKPOINT=1
    # Strip the leading CHECKPOINT_EXISTS line, parse the JSON body with node.
    CHECKPOINT_JSON="$(printf '%s\n' "$CHECKPOINT_OUT" | sed '1d')"
    PLANNED_BRANCH="$(printf '%s' "$CHECKPOINT_JSON" | node -e \
        "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);process.stdout.write(o.branch_name||'')}catch(e){}})")"
    CHECKPOINT_BASE="$(printf '%s' "$CHECKPOINT_JSON" | node -e \
        "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);process.stdout.write(o.base_branch||'')}catch(e){}})")"
fi

# Determine base: --base wins, then checkpoint base, then env/current HEAD.
if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH="$CHECKPOINT_BASE"
fi
if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH="${ARCUS_BASE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
fi

# Re-verify / bump for collisions created since scaffold. The realized name is
# the actual branch to create (accounts for any arcus/<id>-N created meanwhile).
REALIZED="$(compute_branch_name "$STORY_ID")"

# Fetch remote refs (best effort).
git fetch --quiet origin 2>/dev/null || true

# Create the branch from origin/<base> if that ref exists, else from <base>.
if git rev-parse --verify --quiet "origin/$BASE_BRANCH" >/dev/null 2>&1; then
    git checkout -b "$REALIZED" "origin/$BASE_BRANCH"
else
    git checkout -b "$REALIZED" "$BASE_BRANCH"
fi

# If the realized name differs from the planned name (and we have a checkpoint),
# record the realized branch/base back into the checkpoint.
if [ "$HAVE_CHECKPOINT" -eq 1 ] && [ "$REALIZED" != "$PLANNED_BRANCH" ]; then
    bash "$_checkpoint" set-branch "$STORY_ID" "$REALIZED" "$BASE_BRANCH"
fi

# Output for the calling agent to parse.
echo "BRANCH_NAME: $REALIZED"
echo "BASE_BRANCH: $BASE_BRANCH"
