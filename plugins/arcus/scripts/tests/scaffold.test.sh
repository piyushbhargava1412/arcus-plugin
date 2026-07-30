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

# Commit identity must be supplied explicitly: a CI runner has no global git
# identity and cannot derive one from the account's (empty) GECOS name, so
# `git commit` dies with "empty ident name". Every case below is built on the
# sandbox commit, so without this the whole suite degrades into an unborn/
# detached HEAD instead of testing branch planning. Environment variables rather
# than `git config` so they cover every repository and worktree created here.
export GIT_AUTHOR_NAME="ARCUS Test"
export GIT_AUTHOR_EMAIL="test@arcus.invalid"
export GIT_COMMITTER_NAME="ARCUS Test"
export GIT_COMMITTER_EMAIL="test@arcus.invalid"

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

echo "== branch.sh no-ops when the story branch is already realized =="
OUT="$(bash "$BRANCH" WT-1)"
assert_eq "$(field BRANCH_MODE "$OUT")" "existing" "branch.sh reports that nothing was realized"
assert_eq "$(field BRANCH_NAME "$OUT")" "session-branch" "branch.sh echoes the adopted branch"
assert_eq "$(git rev-parse --abbrev-ref HEAD)" "session-branch" "branch.sh did not switch branches"
assert_eq "$(git branch --list 'arcus/WT-1-*' | wc -l | tr -d ' ')" "0" "branch.sh created no arcus/ branch"
assert_eq "$(field BASE_BRANCH "$(bash "$BRANCH" WT-1 --base release/9.x)")" "release/9.x" \
    "an explicit --base wins over the recorded base on the no-op path"

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

echo "== ARCUS_USE_CURRENT_BRANCH is parsed by VALUE, not presence =="
# `${VAR:+1}` maps every non-empty value to "adopt", so =0 opted IN — and then
# hard-failed on the base==branch guard. Run this inside the worktree, where
# auto-detection WOULD adopt, so =0 has to actually override it.
cd "$TMP/worktree"
git checkout -q session-branch   # the detached-HEAD case above left it detached
OUT="$(ARCUS_USE_CURRENT_BRANCH=0 bash "$SCAFFOLD" ENV-1)"
assert_eq "$(field BRANCH_MODE "$OUT")" "new" "=0 disables adoption instead of forcing it"
OUT="$(ARCUS_USE_CURRENT_BRANCH=false bash "$SCAFFOLD" ENV-2)"
assert_eq "$(field BRANCH_MODE "$OUT")" "new" "=false disables adoption"
OUT="$(ARCUS_USE_CURRENT_BRANCH=yes bash "$SCAFFOLD" ENV-3)"
assert_eq "$(field BRANCH_MODE "$OUT")" "adopted" "=yes still adopts"
set +e
ERR="$(ARCUS_USE_CURRENT_BRANCH=maybe bash "$SCAFFOLD" ENV-4 2>&1)"
RC=$?
set -e
assert_eq "$RC" "1" "an uninterpretable value is rejected, not guessed"
if printf '%s' "$ERR" | grep -q 'ARCUS_USE_CURRENT_BRANCH'; then
    pass "the rejection names the offending variable"
else
    fail "the rejection names the offending variable (got: $ERR)"
fi

echo "== an unknowable repo default does not silently disable adoption =="
# repo_default_branch used to fall back to the CURRENT branch, making
# `current != default` false by construction — so a worktree never auto-adopted
# in any repo whose default is neither main nor master.
cd "$TMP"
git init -q -b develop odd && cd odd && git commit -q --allow-empty -m init
git worktree add -q ../odd-wt -b odd-session
cd "$TMP/odd-wt"
OUT="$(bash "$SCAFFOLD" ODD-1 --base develop)"
assert_eq "$(field BRANCH_MODE "$OUT")" "adopted" "a worktree still auto-adopts when the default is unknowable"
assert_eq "$(field BRANCH_NAME "$OUT")" "odd-session" "adopts the session branch"
assert_ne "$(jget ODD-1 branch_name)" "$(jget ODD-1 base_branch)" "ODD-1: base_branch != branch_name"
# With no --base to fall back on, it must ask rather than invent one.
set +e
ERR="$(bash "$SCAFFOLD" ODD-2 2>&1)"
RC=$?
set -e
assert_eq "$RC" "1" "an unresolvable base is an error, not a self-targeting PR"
if printf '%s' "$ERR" | grep -q -- '--base'; then
    pass "the error tells you to pass --base"
else
    fail "the error tells you to pass --base (got: $ERR)"
fi

echo "== re-running scaffold never asserts a branch it did not record =="
# checkpoint.sh init is a no-op when the checkpoint exists, so the stored branch
# fields are NOT ours. Completing the branch stage anyway claimed the STORED
# branch was realized, Implementation then skipped branch.sh, and closure opened
# a PR whose base equalled its own head.
cd "$TMP"
git init -q -b main reinit && cd reinit && git commit -q --allow-empty -m init
git worktree add -q ../reinit-wt -b reinit-session
cd "$TMP/reinit-wt"
OUT="$(bash "$SCAFFOLD" RE-1 --new-branch)"
assert_eq "$(field BRANCH_MODE "$OUT")" "new" "first run plans a new branch"
OUT="$(bash "$SCAFFOLD" RE-1)"   # would auto-adopt if the checkpoint were fresh
assert_eq "$(field BRANCH_MODE "$OUT")" "existing" "a re-run reports the stored state, not a new decision"
assert_eq "$(field BRANCH_NAME "$OUT")" "arcus/RE-1-1" "a re-run echoes the PERSISTED branch"
assert_eq "$(field BASE_BRANCH "$OUT")" "reinit-session" "a re-run echoes the PERSISTED base"
assert_eq "$(jget RE-1 stages.branch)" "pending" "a re-run does not complete a branch stage it did not record"
assert_eq "$(jget RE-1 branch_name)" "arcus/RE-1-1" "the stored branch is left untouched"

echo ""
echo "== Results =="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
