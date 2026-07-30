#!/usr/bin/env bash
# ==============================================================================
# NAME: scaffold.test.sh
# DESCRIPTION: Self-contained test harness for scaffold.sh branch planning and
#              branch.sh realization, covering the two paths:
#                new     — plan arcus/<STORY_ID>-N, create nothing yet
#                adopted — the current branch IS the story branch
#              Adoption exists for linked worktrees: the host already checked the
#              workspace out on a dedicated branch and bound PR tracking to it,
#              so planning a fresh branch off it strands the work.
#              No external test framework — pure bash assertions.
# USAGE: scripts/tests/scaffold.test.sh
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$(cd "$SCRIPT_DIR/.." && pwd)"
SCAFFOLD="$SCRIPTS/scaffold.sh"
BRANCH="$SCRIPTS/branch.sh"
CHECKPOINT="$SCRIPTS/checkpoint.sh"

PASS=0
FAIL=0

fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }

assert_eq() {
    local actual="$1" expected="$2" name="$3"
    if [ "$actual" = "$expected" ]; then pass "$name"; else fail "$name (expected '$expected', got '$actual')"; fi
}

assert_ne() {
    local a="$1" b="$2" name="$3"
    if [ "$a" != "$b" ]; then pass "$name"; else fail "$name (both were '$a')"; fi
}

# Parse a `KEY: value` line out of scaffold.sh / branch.sh output.
field() { printf '%s\n' "$2" | awk -F': ' -v k="$1" '$1 == k {print $2; exit}'; }

# Read a dotted path out of a story checkpoint in the current directory.
jget() {
    node -e "
        const fs = require('fs');
        const cp = JSON.parse(fs.readFileSync('.arcus/specs/$1/session-checkpoint.json', 'utf8'));
        let v = cp;
        for (const k of '$2'.split('.')) { v = v?.[k]; }
        console.log(v === undefined ? '' : v);
    "
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"

git init -q -b main main-repo
cd main-repo
git commit -q --allow-empty -m init

echo "== normal checkout on the default branch =="
OUT="$(bash "$SCAFFOLD" ABC-1)"
assert_eq "$(field BRANCH_MODE "$OUT")" "new" "plans a new branch"
assert_eq "$(field BRANCH_NAME "$OUT")" "arcus/ABC-1-1" "planned name is arcus/<STORY_ID>-1"
assert_eq "$(field BASE_BRANCH "$OUT")" "main" "base is the working branch"
assert_eq "$(jget ABC-1 stages.branch)" "pending" "branch stage stays pending (creation is deferred)"
assert_eq "$(git rev-parse --abbrev-ref HEAD)" "main" "no git branch was created"

echo "== normal checkout on a feature branch: base stays the WORKING branch =="
# Deliberate stacking must keep working — ARCUS bases the story on wherever you
# actually are, default branch or not. Only the adopt path departs from this.
git checkout -q -b feature/stacked
OUT="$(bash "$SCAFFOLD" ABC-2)"
assert_eq "$(field BRANCH_MODE "$OUT")" "new" "a feature branch alone does not trigger adoption"
assert_eq "$(field BASE_BRANCH "$OUT")" "feature/stacked" "base is the feature branch, not the repo default"

echo "== --use-current-branch adopts anywhere =="
OUT="$(bash "$SCAFFOLD" ABC-3 --use-current-branch)"
assert_eq "$(field BRANCH_MODE "$OUT")" "adopted" "explicit flag forces adoption in a normal checkout"
assert_eq "$(field BRANCH_NAME "$OUT")" "feature/stacked" "adopted branch is the current branch"
assert_eq "$(field BASE_BRANCH "$OUT")" "main" "adopted base falls back to the repo default"
assert_eq "$(jget ABC-3 stages.branch)" "complete" "adoption pre-completes the branch stage"

echo "== ARCUS_USE_CURRENT_BRANCH is the env equivalent =="
OUT="$(ARCUS_USE_CURRENT_BRANCH=1 bash "$SCAFFOLD" ABC-4)"
assert_eq "$(field BRANCH_MODE "$OUT")" "adopted" "env var forces adoption"

echo "== --base wins over the adopted default =="
OUT="$(bash "$SCAFFOLD" ABC-5 --use-current-branch --base release/1.x)"
assert_eq "$(field BASE_BRANCH "$OUT")" "release/1.x" "--base overrides the resolved default"
assert_eq "$(jget ABC-5 base_branch)" "release/1.x" "the override is persisted to the checkpoint"

echo "== an adopted branch is never its own base =="
# base == branch would produce a self-targeting PR at closure.
for story in ABC-3 ABC-4 ABC-5; do
    assert_ne "$(jget "$story" branch_name)" "$(jget "$story" base_branch)" "$story: base_branch != branch_name"
done
git checkout -q main

echo "== linked worktree on a non-default branch: auto-adopt =="
git worktree add -q ../worktree -b session-branch
cd "$TMP/worktree"
OUT="$(bash "$SCAFFOLD" WT-1)"
assert_eq "$(field BRANCH_MODE "$OUT")" "adopted" "a linked worktree auto-adopts its session branch"
assert_eq "$(field BRANCH_NAME "$OUT")" "session-branch" "adopts the branch the host checked out"
assert_eq "$(field BASE_BRANCH "$OUT")" "main" "base resolves to the repo default, not the session branch"
assert_eq "$(jget WT-1 stages.branch)" "complete" "branch stage is pre-completed in a worktree"

echo "== --new-branch opts back out inside a worktree =="
OUT="$(bash "$SCAFFOLD" WT-2 --new-branch)"
assert_eq "$(field BRANCH_MODE "$OUT")" "new" "--new-branch restores the planning path"
assert_eq "$(field BRANCH_NAME "$OUT")" "arcus/WT-2-1" "--new-branch plans arcus/<STORY_ID>-1"
assert_eq "$(jget WT-2 stages.branch)" "pending" "--new-branch leaves the branch stage pending"

echo "== branch.sh no-ops on an adopted branch =="
OUT="$(bash "$BRANCH" WT-1)"
assert_eq "$(field BRANCH_MODE "$OUT")" "adopted" "branch.sh reports the adopted mode"
assert_eq "$(field BRANCH_NAME "$OUT")" "session-branch" "branch.sh echoes the adopted branch"
assert_eq "$(git rev-parse --abbrev-ref HEAD)" "session-branch" "branch.sh did not switch branches"
assert_eq "$(git branch --list 'arcus/WT-1-*' | wc -l | tr -d ' ')" "0" "branch.sh created no arcus/ branch"

echo "== set-tasks re-points current_stage past the pre-completed branch stage =="
# Adoption completes `branch` BEFORE task slots exist, so current_stage advances
# to code_review. Seeding tasks must pull it back to real work.
bash "$CHECKPOINT" complete WT-1 scaffold >/dev/null
assert_eq "$(jget WT-1 current_stage)" "context_pack" "current_stage tracks the first incomplete stage"
for stage in context_pack spec_finalizer plan test_plan; do
    bash "$CHECKPOINT" complete WT-1 "$stage" >/dev/null
done
assert_eq "$(jget WT-1 current_stage)" "code_review" "with branch pre-completed, current_stage overshoots to code_review"
bash "$CHECKPOINT" set-tasks WT-1 3 >/dev/null
assert_eq "$(jget WT-1 current_stage)" "task_1" "set-tasks re-points current_stage at the first task"
assert_eq "$(jget WT-1 current_status)" "IN_PROGRESS" "set-tasks keeps current_status IN_PROGRESS"

echo "== detached HEAD cannot be adopted =="
git checkout -q --detach
ERR="$(bash "$SCAFFOLD" WT-3 --use-current-branch 2>&1)"
assert_eq "$?" "1" "adopting a detached HEAD exits non-zero"
if printf '%s' "$ERR" | grep -q 'detached'; then
    pass "the detached-HEAD error says so"
else
    fail "the detached-HEAD error says so (got: $ERR)"
fi

echo "== repo default branch falls back when origin/HEAD is unset =="
# `git init` repos have no origin/HEAD at all, so every case above already
# exercised the fallback chain. Assert the master-named variant too.
cd "$TMP"
git init -q -b master legacy && cd legacy && git commit -q --allow-empty -m init
git worktree add -q ../legacy-wt -b legacy-session
cd "$TMP/legacy-wt"
OUT="$(bash "$SCAFFOLD" LEG-1)"
assert_eq "$(field BASE_BRANCH "$OUT")" "master" "falls back to master when there is no origin/HEAD and no main"

echo ""
echo "== Results =="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
