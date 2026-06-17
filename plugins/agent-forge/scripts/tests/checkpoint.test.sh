#!/usr/bin/env bash
# ==============================================================================
# NAME: checkpoint.test.sh
# DESCRIPTION: Self-contained test harness for checkpoint.sh. Exercises the
#              schema-v2 status-enum model plus the new set-status / reopen /
#              set-mode actions and legacy-boolean migration. No external test
#              framework required — pure bash assertions.
# USAGE: scripts/tests/checkpoint.test.sh
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CHECKPOINT="$SCRIPT_DIR/../checkpoint.sh"
STORY_ID="TEST-1"

PASS=0
FAIL=0

fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }

# Read a JSON path from the checkpoint via node.
jget() {
    node -e "
        const fs = require('fs');
        const cp = JSON.parse(fs.readFileSync('.aforge/specs/$STORY_ID/session-checkpoint.json', 'utf8'));
        const path = '$1'.split('.');
        let v = cp;
        for (const k of path) { v = v?.[k]; }
        console.log(v === undefined ? '' : v);
    "
}

assert_eq() {
    local actual="$1" expected="$2" name="$3"
    if [ "$actual" = "$expected" ]; then pass "$name"; else fail "$name (expected '$expected', got '$actual')"; fi
}

# Isolated sandbox.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"

echo "== init =="
bash "$CHECKPOINT" init "$STORY_ID" "agent-forge/$STORY_ID-1" "main" >/dev/null
assert_eq "$(jget schema_version)" "2" "schema_version is 2"
assert_eq "$(jget mode)" "gated" "default mode is gated"
assert_eq "$(jget review_round)" "0" "review_round starts at 0"
assert_eq "$(jget stages.init)" "pending" "stages use status strings (pending)"
assert_eq "$(jget stages.code_review)" "pending" "code_review stage exists"
assert_eq "$(jget stages.closure)" "pending" "closure stage exists"
assert_eq "$(jget base_branch)" "main" "base_branch captured"

echo "== init with afk mode =="
rm -rf .aforge
bash "$CHECKPOINT" init "$STORY_ID" "agent-forge/$STORY_ID-1" "main" "afk" >/dev/null
assert_eq "$(jget mode)" "afk" "init honors mode arg"

echo "== complete =="
bash "$CHECKPOINT" complete "$STORY_ID" init >/dev/null
assert_eq "$(jget stages.init)" "complete" "complete sets status to complete"

echo "== set-status =="
bash "$CHECKPOINT" set-status "$STORY_ID" test_plan in_progress >/dev/null
assert_eq "$(jget stages.test_plan)" "in_progress" "set-status sets arbitrary status"
# Dynamic key creation (fix-tasks from loopback).
bash "$CHECKPOINT" set-status "$STORY_ID" task_9 pending >/dev/null
assert_eq "$(jget stages.task_9)" "pending" "set-status creates new task keys"

echo "== set-status rejects invalid status =="
if bash "$CHECKPOINT" set-status "$STORY_ID" test_plan bogus >/dev/null 2>&1; then
    fail "invalid status should be rejected"
else
    pass "invalid status rejected"
fi

echo "== set-mode =="
bash "$CHECKPOINT" set-mode "$STORY_ID" gated >/dev/null
assert_eq "$(jget mode)" "gated" "set-mode updates mode"

echo "== reopen (loopback) =="
bash "$CHECKPOINT" complete "$STORY_ID" code_review >/dev/null
bash "$CHECKPOINT" reopen "$STORY_ID" code_review >/dev/null
assert_eq "$(jget stages.code_review)" "needs_rework" "reopen sets needs_rework"
assert_eq "$(jget review_round)" "1" "reopen bumps review_round"

echo "== legacy boolean migration =="
# Hand-write an old schema-v1 checkpoint and verify complete still works.
mkdir -p ".aforge/specs/LEGACY-1"
cat > ".aforge/specs/LEGACY-1/session-checkpoint.json" <<'EOF'
{
  "story_id": "LEGACY-1",
  "workflow": "afk",
  "stages": { "init": true, "context_pack": false }
}
EOF
bash "$CHECKPOINT" complete "LEGACY-1" context_pack >/dev/null
LEGACY_CTX="$(node -e "console.log(JSON.parse(require('fs').readFileSync('.aforge/specs/LEGACY-1/session-checkpoint.json','utf8')).stages.context_pack)")"
assert_eq "$LEGACY_CTX" "complete" "legacy boolean schema upgraded on write"

echo
echo "RESULTS: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
