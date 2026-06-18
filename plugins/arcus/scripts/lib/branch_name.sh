#!/usr/bin/env bash
# ==============================================================================
# NAME: branch_name.sh
# DESCRIPTION: Sourced library providing the ARCUS branch-name auto-increment
#              logic. Defines `compute_branch_name <STORY_ID>` which echoes the
#              next free `arcus/<STORY_ID>-N` branch name by scanning local and
#              remote refs.
# USAGE: Source this file, then call: compute_branch_name <STORY_ID>
#
# SOURCE-RESOLUTION CONVENTION (for callers):
#   Resolve this lib relative to the caller's own directory first, then fall
#   back to $ARCUS_HOME/scripts/lib/. This makes both the source-tree layout
#   (scripts/lib/branch_name.sh) and the staged layout (.arcus/bin/lib/
#   branch_name.sh) work. Example:
#
#     _lib="$(dirname "$0")/lib/branch_name.sh"
#     [ -f "$_lib" ] || _lib="${ARCUS_HOME:-}/scripts/lib/branch_name.sh"
#     # shellcheck source=/dev/null
#     . "$_lib"
#
# This file is SOURCE-SAFE: it sets no shell options, runs no top-level code,
# and invokes no git commands merely by being sourced. It only defines a
# function.
# ==============================================================================

# Guard against double-sourcing.
if [ -n "${_ARCUS_BRANCH_NAME_SH_SOURCED:-}" ]; then
    return 0 2>/dev/null || true
fi
_ARCUS_BRANCH_NAME_SH_SOURCED=1

# compute_branch_name <STORY_ID>
#   Echoes `arcus/<STORY_ID>-N`, where N is one greater than the highest
#   existing index across local and remote `arcus/<STORY_ID>-<int>` branches
#   (or 1 if none exist).
compute_branch_name() {
    local STORY_ID="$1"
    local max_run=0
    local ref idx
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
    echo "arcus/${STORY_ID}-$(( max_run + 1 ))"
}
