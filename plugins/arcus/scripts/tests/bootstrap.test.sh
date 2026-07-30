#!/usr/bin/env bash
# ==============================================================================
# NAME: bootstrap.test.sh
# DESCRIPTION: Self-contained test harness for bootstrap.sh and locate.sh. The
#              headline case is a git WORKTREE: there `.git` is a FILE, not a
#              directory, so the original `[ ! -d .git ]` guard exited 0 without
#              staging anything and locate.sh reported success over an empty
#              workspace. Every helper-script call then failed with "No such
#              file or directory" and nothing pointed back at the cause.
#              No external test framework — pure bash assertions.
# USAGE: scripts/tests/bootstrap.test.sh
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ARCUS_SRC="$(cd "$SCRIPT_DIR/../.." && pwd)"
BOOTSTRAP="$ARCUS_SRC/scripts/bootstrap.sh"
LOCATE="$ARCUS_SRC/scripts/locate.sh"

PASS=0
FAIL=0

fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }

assert_eq() {
    local actual="$1" expected="$2" name="$3"
    if [ "$actual" = "$expected" ]; then pass "$name"; else fail "$name (expected '$expected', got '$actual')"; fi
}

assert_file() {
    if [ -f "$1" ]; then pass "$2"; else fail "$2 (missing: $1)"; fi
}

assert_no_path() {
    if [ ! -e "$1" ]; then pass "$2"; else fail "$2 (unexpectedly present: $1)"; fi
}

# Isolated sandbox. HOME is redirected so locate.sh's install probe cannot find
# the developer's real plugin caches and resolve to something other than the
# ARCUS_SRC under test.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home"
mkdir -p "$HOME"
cd "$TMP"

# Commit identity must be supplied explicitly. Redirecting HOME above also
# discards the developer's ~/.gitconfig, and a CI runner has no global identity
# at all — there git cannot derive one from the account's (empty) GECOS name and
# `git commit` dies with "empty ident name". The sandbox commit below is a
# precondition for `git worktree add`, so without this every worktree case
# silently degrades into "directory does not exist" instead of testing anything.
# Environment variables rather than `git config` so they cover every repository
# and worktree created in this sandbox.
export GIT_AUTHOR_NAME="ARCUS Test"
export GIT_AUTHOR_EMAIL="test@arcus.invalid"
export GIT_COMMITTER_NAME="ARCUS Test"
export GIT_COMMITTER_EMAIL="test@arcus.invalid"

# A main checkout plus a linked worktree, shared by the cases below.
git init -q -b main main-repo
(cd main-repo && git commit -q --allow-empty -m init && git worktree add -q ../worktree -b session-branch)

echo "== main checkout =="
(cd main-repo && bash "$BOOTSTRAP" >/dev/null 2>&1)
assert_eq "$?" "0" "bootstrap exits 0 in a normal checkout"
assert_file "$TMP/main-repo/.arcus/bin/checkpoint.sh" "helper scripts staged in a normal checkout"
assert_file "$TMP/main-repo/.arcus/bin/lib/branch_name.sh" "sourced libs staged in a normal checkout"
assert_file "$TMP/main-repo/.arcus/env" ".arcus/env written in a normal checkout"

echo "== linked worktree (regression: .git is a FILE, not a directory) =="
# Guard the premise: if .git ever stops being a file here, the regression this
# whole suite exists for is no longer being exercised.
if [ -f "$TMP/worktree/.git" ] && [ ! -d "$TMP/worktree/.git" ]; then
    pass "worktree .git is a file, not a directory (premise holds)"
else
    fail "worktree .git is a file, not a directory (premise holds)"
fi
(cd worktree && bash "$BOOTSTRAP" >/dev/null 2>&1)
assert_eq "$?" "0" "bootstrap exits 0 in a linked worktree"
assert_file "$TMP/worktree/.arcus/bin/checkpoint.sh" "helper scripts staged in a LINKED WORKTREE"
assert_file "$TMP/worktree/.arcus/bin/lib/git_context.sh" "sourced libs staged in a linked worktree"
assert_file "$TMP/worktree/.arcus/env" ".arcus/env written in a linked worktree"

echo "== staged at the repository root, not the cwd =="
rm -rf "$TMP/worktree/.arcus"
mkdir -p "$TMP/worktree/src/deep"
(cd "$TMP/worktree/src/deep" && bash "$BOOTSTRAP" >/dev/null 2>&1)
assert_file "$TMP/worktree/.arcus/bin/checkpoint.sh" "invocation from a subdirectory stages at the repo root"
assert_no_path "$TMP/worktree/src/deep/.arcus" "invocation from a subdirectory leaves no stray .arcus/"

echo "== not a git repository =="
mkdir -p "$TMP/plain"
(cd "$TMP/plain" && bash "$BOOTSTRAP" >/dev/null 2>&1)
assert_eq "$?" "0" "bootstrap exits 0 outside a git repository"
assert_no_path "$TMP/plain/.arcus" "bootstrap stages nothing outside a git repository"

echo "== unresolvable ARCUS_HOME fails loudly =="
# A COPY of the bootstrapper run from elsewhere resolves ARCUS_HOME to that
# copy's parent. Previously that produced an EMPTY .arcus/bin plus an .arcus/env
# pointing at "/" — a workspace that looks bootstrapped and is not.
cp "$BOOTSTRAP" "$TMP/stray-bootstrap.sh"
rm -rf "$TMP/worktree/.arcus"
STRAY_OUT="$(cd "$TMP/worktree" && env -u ARCUS_HOME bash "$TMP/stray-bootstrap.sh" 2>&1)"
assert_eq "$?" "1" "a stray bootstrap copy exits non-zero"
if printf '%s' "$STRAY_OUT" | grep -q 'cannot resolve a valid ARCUS install'; then
    pass "a stray bootstrap copy explains why it refused"
else
    fail "a stray bootstrap copy explains why it refused (got: $STRAY_OUT)"
fi
assert_no_path "$TMP/worktree/.arcus" "a stray bootstrap copy creates no empty .arcus/bin"

echo "== stray copy recovers via an exported ARCUS_HOME =="
(cd "$TMP/worktree" && ARCUS_HOME="$ARCUS_SRC" bash "$TMP/stray-bootstrap.sh" >/dev/null 2>&1)
assert_eq "$?" "0" "a stray copy succeeds when ARCUS_HOME points at a real install"
assert_file "$TMP/worktree/.arcus/bin/checkpoint.sh" "exported ARCUS_HOME is used for staging"

echo "== locate.sh verifies the post-condition =="
rm -rf "$TMP/worktree/.arcus"
LOCATE_OUT="$(cd "$TMP/worktree" && ARCUS_HOME="$ARCUS_SRC" bash "$LOCATE" 2>&1)"
assert_eq "$?" "0" "locate.sh exits 0 in a linked worktree"
assert_eq "$LOCATE_OUT" "$ARCUS_SRC" "locate.sh prints the resolved ARCUS_HOME"
assert_file "$TMP/worktree/.arcus/bin/checkpoint.sh" "locate.sh leaves .arcus/bin staged"

# The silent-success failure mode: bootstrap legitimately no-ops outside a git
# repo, so locate.sh must NOT then report a healthy workspace.
LOCATE_FAIL="$(cd "$TMP/plain" && ARCUS_HOME="$ARCUS_SRC" bash "$LOCATE" 2>&1)"
assert_eq "$?" "1" "locate.sh fails when bootstrap staged nothing"
if printf '%s' "$LOCATE_FAIL" | grep -q 'was not staged'; then
    pass "locate.sh names the unstaged workspace in its error"
else
    fail "locate.sh names the unstaged workspace in its error (got: $LOCATE_FAIL)"
fi

echo ""
echo "== Results =="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
