#!/usr/bin/env bash
# ==============================================================================
# NAME: git_context.sh
# DESCRIPTION: Sourced library providing the git-workspace facts ARCUS branches
#              on. Defines `is_linked_worktree`, `repo_default_branch` and
#              `current_branch`.
# USAGE: Source this file, then call the functions.
#
# SOURCE-RESOLUTION CONVENTION (for callers):
#   Resolve this lib relative to the caller's own directory first, then fall
#   back to $ARCUS_HOME/scripts/lib/. This makes both the source-tree layout
#   (scripts/lib/git_context.sh) and the staged layout (.arcus/bin/lib/
#   git_context.sh) work. Example:
#
#     _lib="$(dirname "$0")/lib/git_context.sh"
#     [ -f "$_lib" ] || _lib="${ARCUS_HOME:-}/scripts/lib/git_context.sh"
#     # shellcheck source=/dev/null
#     . "$_lib"
#
# This file is SOURCE-SAFE: it sets no shell options and runs no top-level code.
# It only defines functions.
# ==============================================================================

# Guard against double-sourcing.
if [ -n "${_ARCUS_GIT_CONTEXT_SH_SOURCED:-}" ]; then
    return 0 2>/dev/null || true
fi
_ARCUS_GIT_CONTEXT_SH_SOURCED=1

# is_linked_worktree
#   Succeeds when the workspace is a LINKED worktree (`git worktree add`) rather
#   than the main checkout. In a linked worktree the per-worktree git dir
#   (.git/worktrees/<name>) differs from the shared common dir (.git); in the
#   main checkout the two are the same path.
#
#   Both are normalized to absolute paths first: git returns `--git-dir` relative
#   to the cwd in a main checkout (".git") but absolute in a linked worktree, so
#   comparing the raw strings reports every main checkout as a worktree.
is_linked_worktree() {
    local gitdir commondir
    gitdir="$(git rev-parse --absolute-git-dir 2>/dev/null)" || return 1
    commondir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 1
    [ -n "$gitdir" ] && [ -n "$commondir" ] && [ "$gitdir" != "$commondir" ]
}

# current_branch
#   Echoes the checked-out branch name, or "" on a detached HEAD.
current_branch() {
    local b
    b="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" || return 0
    [ "$b" = "HEAD" ] && return 0   # detached
    echo "$b"
}

# repo_default_branch
#   Echoes the repository's default branch. Tries, in order:
#     1. origin/HEAD  — authoritative when set, but frequently absent on clones
#                       made with --single-branch and on `git init` repos;
#     2. a local or remote `main`, then `master`.
#
#   Echoes NOTHING and returns 1 when the default is genuinely unknowable
#   (`git init -b develop`, a remote wired up by hand with `git remote add`
#   rather than `git clone`, any repo whose default is not main/master).
#
#   It deliberately does NOT fall back to the current branch. Callers ask this
#   question precisely to compare the current branch against the default or to
#   pick a base that is not the current branch; answering "the current branch"
#   makes both of those silently wrong instead of visibly unknown. Callers must
#   handle the empty answer explicitly.
repo_default_branch() {
    local ref candidate
    ref="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
    if [ -n "$ref" ]; then
        echo "${ref#origin/}"
        return 0
    fi
    for candidate in main master; do
        if git show-ref --verify --quiet "refs/heads/$candidate" 2>/dev/null \
        || git show-ref --verify --quiet "refs/remotes/origin/$candidate" 2>/dev/null; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}
