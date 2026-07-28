#!/usr/bin/env bash
# ==============================================================================
# NAME: cloud.test.sh
# DESCRIPTION: Self-contained tests for the cloud helper scripts —
#              state_sync.sh (arcus-state orphan branch) and
#              questions_comment.sh (Open Questions -> issue comment body).
#              Pure bash assertions, a real local bare repo, no network, no gh.
# USAGE: scripts/tests/cloud.test.sh
# ==============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
STATE_SYNC="$SCRIPT_DIR/../state_sync.sh"
QUESTIONS="$SCRIPT_DIR/../questions_comment.sh"

PASS=0
FAIL=0
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
assert_eq() {
    local actual="$1" expected="$2" name="$3"
    if [ "$actual" = "$expected" ]; then pass "$name"; else fail "$name (expected '$expected', got '$actual')"; fi
}
assert_contains() {
    local haystack="$1" needle="$2" name="$3"
    case "$haystack" in *"$needle"*) pass "$name" ;; *) fail "$name (missing '$needle')" ;; esac
}
assert_not_contains() {
    local haystack="$1" needle="$2" name="$3"
    case "$haystack" in *"$needle"*) fail "$name (unexpectedly found '$needle')" ;; *) pass "$name" ;; esac
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ------------------------------------------------------------------ state_sync
echo "== state_sync: orphan branch lifecycle =="
BARE="$TMP/origin.git"
git init -q --bare "$BARE"
WORK="$TMP/work"
mkdir -p "$WORK" && cd "$WORK"
git init -q . && git config user.email t@t && git config user.name t
echo readme > README.md && git add -A && git commit -qm init
git remote add origin "$BARE" && git push -q -u origin HEAD

OUT="$(bash "$STATE_SYNC" pull ISSUE-42 2>&1)"
assert_contains "$OUT" "does not exist yet" "pull is a no-op before the branch exists"

mkdir -p .arcus/specs/ISSUE-42
echo "cp v1" > .arcus/specs/ISSUE-42/session-checkpoint.json
echo "spec v1" > .arcus/specs/ISSUE-42/grounded-spec.md
OUT="$(bash "$STATE_SYNC" push ISSUE-42 --message "first" 2>&1)"
assert_contains "$OUT" "STATE_PUSHED:" "push creates the branch on first use"

# The branch must share NO history with main, or it could be merged by accident
# and would pollute `git log main`.
git fetch -q origin arcus-state
if git merge-base HEAD origin/arcus-state >/dev/null 2>&1; then
    fail "arcus-state is a true orphan (shares history with main)"
else
    pass "arcus-state is a true orphan (no shared history with main)"
fi

# The whole point: a fresh runner has no .arcus/ and must recover it.
rm -rf .arcus
OUT="$(bash "$STATE_SYNC" pull ISSUE-42 2>&1)"
assert_contains "$OUT" "STATE_PULLED: specs/ISSUE-42" "pull restores the workspace on a fresh runner"
assert_eq "$(cat .arcus/specs/ISSUE-42/grounded-spec.md)" "spec v1" "restored artifact content matches"

OUT="$(bash "$STATE_SYNC" push ISSUE-42 2>&1)"
assert_contains "$OUT" "no changes" "a push with nothing changed is a no-op, not an empty commit"

echo "spec v2" > .arcus/specs/ISSUE-42/grounded-spec.md
OUT="$(bash "$STATE_SYNC" push ISSUE-42 2>&1)"
assert_contains "$OUT" "STATE_PUSHED:" "a changed artifact pushes a new commit"

echo "== state_sync: stories are isolated on one branch =="
mkdir -p .arcus/specs/ISSUE-99 && echo "other story" > .arcus/specs/ISSUE-99/story.md
bash "$STATE_SYNC" push ISSUE-99 >/dev/null 2>&1
git fetch -q origin arcus-state
TREE="$(git ls-tree -r --name-only origin/arcus-state | tr '\n' ' ')"
assert_contains "$TREE" "specs/ISSUE-42/grounded-spec.md" "pushing a second story leaves the first intact"
assert_contains "$TREE" "specs/ISSUE-99/story.md" "the second story is present"

echo "== state_sync: rejects a story id that could escape the path =="
# STORY_ID becomes a filesystem path and a git ref component, so it must be
# constrained regardless of where it came from.
OUT="$(bash "$STATE_SYNC" pull "../../etc" 2>&1)"
assert_contains "$OUT" "Invalid STORY_ID" "path-traversal story id is rejected"

# ----------------------------------------------------------- questions_comment
echo "== questions_comment: renders unanswered questions =="
QW="$TMP/qw"
mkdir -p "$QW/.arcus/specs/ISSUE-7" && cd "$QW"
cat > .arcus/specs/ISSUE-7/grounded-spec.md <<'EOF'
## Open Questions

```yaml
- id: SF-1
  gap: How long should exports be retained?
  reason: low-confidence
  options:
    - {key: A, text: Delete after 7 days, recommended: true, rationale: Matches existing retention}
    - {key: B, text: Delete after 30 days}
  tentative: A
- id: SF-2
  gap: What should an empty export return?
  reason: low-confidence
  options:
    - {key: A, text: Empty CSV with headers, recommended: true, rationale: Stable response shape}
  tentative: A
```

## Implementation Boundary
EOF
OUT="$(bash "$QUESTIONS" ISSUE-7 7 --dry-run 2>&1)"
assert_contains "$OUT" "QUESTIONS: 2" "both unanswered questions are counted"
assert_contains "$OUT" "SF-1 — How long should exports be retained?" "the gap text is rendered"
assert_contains "$OUT" "✅ **Recommended**" "the recommended option is marked"
assert_contains "$OUT" "Matches existing retention" "the rationale is rendered"
assert_contains "$OUT" "arcus:v1 kind=question" "the machine-readable marker is present"

echo "== questions_comment: answered ids are suppressed =="
# Answered-ness is derived from Dialogue Answers alone — the YAML carries no
# status field, so there is exactly one source of truth.
cat >> .arcus/specs/ISSUE-7/grounded-spec.md <<'EOF'

## Dialogue Answers

### Round 1

| Question | What the user said (verbatim) | Resolved to |
|----------|-------------------------------|-------------|
| SF-1 | "go with 30 days" | B |
EOF
OUT="$(bash "$QUESTIONS" ISSUE-7 7 --dry-run 2>&1)"
assert_contains "$OUT" "QUESTIONS: 1" "an answered question drops out of the count"
assert_not_contains "$OUT" "SF-1 — How long" "the answered question is not re-asked"
assert_contains "$OUT" "SF-2" "the still-open question survives"

echo "== questions_comment: fully answered halts the ask loop =="
cat >> .arcus/specs/ISSUE-7/grounded-spec.md <<'EOF'
| SF-2 | "your call" | A |
EOF
OUT="$(bash "$QUESTIONS" ISSUE-7 7 --dry-run 2>&1)"
assert_eq "$OUT" "QUESTIONS: none" "no comment is posted once everything is answered"

echo "== questions_comment: plan.md PL- questions are collected too =="
printf '## Open Questions\n\n```yaml\n- id: PL-1\n  gap: Which approach?\n  options:\n    - {key: A, text: In-process, recommended: true, rationale: No new queue}\n  tentative: A\n```\n' \
    > .arcus/specs/ISSUE-7/plan.md
OUT="$(bash "$QUESTIONS" ISSUE-7 7 --dry-run 2>&1)"
assert_contains "$OUT" "QUESTIONS: 1" "planner questions are picked up from plan.md"
assert_contains "$OUT" "PL-1" "the PL- id space is rendered"

echo "== questions_comment: no artifacts at all =="
mkdir -p "$TMP/empty/.arcus/specs/ISSUE-1" && cd "$TMP/empty"
OUT="$(bash "$QUESTIONS" ISSUE-1 1 --dry-run 2>&1)"
assert_eq "$OUT" "QUESTIONS: none" "a story with no artifacts asks nothing"

# --------------------------------------------------------------- issue_ingest
echo "== issue_ingest: cursor, bot-skip, and no-op on re-delivery =="
INGEST="$SCRIPT_DIR/../issue_ingest.sh"
IW="$TMP/ingest"
mkdir -p "$IW/bin" "$IW/.arcus/specs/ISSUE-24" && cd "$IW"
cp "$INGEST" "$SCRIPT_DIR/../checkpoint.sh" bin/

# Stub gh so the suite stays offline. Two comments: ours (a Bot, carrying the
# arcus marker) and a human reply.
cat > bin/gh <<'STUB'
#!/usr/bin/env bash
cat <<'JSON'
[{"id":100,"user":{"login":"github-actions","type":"Bot"},"created_at":"2026-07-28T03:00:51Z","body":"<!-- arcus:v1 kind=question story=ISSUE-24 -->\n### ARCUS needs 3 answers"},
 {"id":200,"user":{"login":"maintainer","type":"User"},"created_at":"2026-07-28T03:04:10Z","body":"SF1 - A\nSF2 - A"}]
JSON
STUB
chmod +x bin/gh
export PATH="$IW/bin:$PATH"

cat > .arcus/specs/ISSUE-24/session-checkpoint.json <<'JSON'
{"story_id":"ISSUE-24","current_status":"AWAITING_HANDOFF","current_stage":"spec_finalizer","stages":{"spec_finalizer":"awaiting_handoff"}}
JSON

OUT="$(bash bin/issue_ingest.sh ISSUE-24 24 2>&1)"; RC=$?
assert_eq "$RC" "0" "ingest exits 0 when there are new comments"
assert_contains "$OUT" "cursor -> 200" "the cursor advances to the newest comment id"

INBOX_BODY="$(cat .arcus/specs/ISSUE-24/inbox.md)"
assert_contains "$INBOX_BODY" "SF1 - A" "the human reply is captured"
assert_contains "$INBOX_BODY" "UNTRUSTED USER INPUT" "the inbox frames its contents as data, not instructions"
# Ingesting our own question comment would make the pipeline answer itself.
assert_not_contains "$INBOX_BODY" "ARCUS needs 3 answers" "our own bot comment is skipped"

assert_eq "$(node -p "require('./.arcus/specs/ISSUE-24/session-checkpoint.json').last_processed_comment_id")" \
          "200" "the cursor is persisted on the checkpoint"

# A re-delivered webhook, or a second run racing the first, must not re-answer
# questions that were already answered.
set +e
OUT="$(bash bin/issue_ingest.sh ISSUE-24 24 2>&1)"; RC=$?
set -e
assert_eq "$RC" "3" "a second ingest with nothing new exits 3 (caller stops before paying for an agent run)"
assert_contains "$OUT" "INGESTED: none" "the no-op is reported explicitly"

echo
echo "RESULTS: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
