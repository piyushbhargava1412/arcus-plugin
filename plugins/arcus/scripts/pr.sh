#!/usr/bin/env bash
# ==============================================================================
# NAME: pr.sh
# DESCRIPTION: Pushes the current branch to origin and creates a pull request
#              using the PR_DESCRIPTION.md from the story workspace.
# USAGE: scripts/pr.sh <STORY_ID>
# EXIT:  0 = PR created or updated
#        3 = branch pushed, but this repo forbids Actions from opening PRs —
#            a prefilled compare link is printed as PR_MANUAL_URL
#        1 = anything else
# ==============================================================================

set -eo pipefail

STORY_ID="$1"

if [ -z "$STORY_ID" ]; then
    echo "[ERROR] Usage: pr.sh <STORY_ID>" >&2
    exit 1
fi

WORKSPACE_DIR=".arcus/specs/$STORY_ID"
PR_BODY_FILE="$WORKSPACE_DIR/PR_DESCRIPTION.md"
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Determine base branch from checkpoint or default
if [ -f "$WORKSPACE_DIR/session-checkpoint.json" ]; then
    BASE_BRANCH=$(node -e "const cp=require('./$WORKSPACE_DIR/session-checkpoint.json'); process.stdout.write(cp.base_branch||'main');" 2>/dev/null || echo "main")
else
    BASE_BRANCH="main"
fi

# Push to origin
echo "Pushing $BRANCH_NAME to origin..."
git push origin "$BRANCH_NAME" --force-with-lease

# Create PR, or update it if one already exists for this branch (e.g. a resumed
# run after context_sync/closure re-ran, or a re-run of an already-closed stage).
if [ -f "$PR_BODY_FILE" ]; then
    EXISTING_PR_URL=$(gh pr view "$BRANCH_NAME" --json url -q .url 2>/dev/null || true)
    if [ -n "$EXISTING_PR_URL" ]; then
        gh pr edit "$BRANCH_NAME" --body-file="$PR_BODY_FILE" >/dev/null 2>&1 || {
            echo "[ERROR] gh pr edit failed for existing PR $EXISTING_PR_URL" >&2
            exit 1
        }
        echo "PR_URL: $EXISTING_PR_URL"
    else
        TITLE="[ARCUS] $STORY_ID: Spec-to-Code Implementation"
        if PR_URL=$(gh pr create \
            --title "$TITLE" \
            --body-file="$PR_BODY_FILE" \
            --base "$BASE_BRANCH" \
            --draft=false 2>&1); then
            echo "PR_URL: $PR_URL"
        else
            # A repo/org can forbid Actions from opening PRs ("Allow GitHub
            # Actions to create and approve pull requests"). The work is done and
            # pushed at this point, so failing outright would strand it. Emit a
            # prefilled compare link instead: one click finishes the job.
            case "$PR_URL" in
                *"not permitted to create or approve pull requests"*|*"GraphQL"*"createPullRequest"*)
                    SLUG=$(git remote get-url origin \
                             | sed -E 's#^.*github\.com[:/]##; s#\.git$##; s#^.*@##')
                    ENC_TITLE=$(printf '%s' "$TITLE" \
                                  | node -e 'process.stdout.write(encodeURIComponent(require("fs").readFileSync(0,"utf8")))' 2>/dev/null \
                                  || printf '%s' "$TITLE")
                    echo "PR_BLOCKED: Actions is not permitted to create pull requests in this repository." >&2
                    echo "PR_MANUAL_URL: https://github.com/${SLUG}/compare/${BASE_BRANCH}...${BRANCH_NAME}?expand=1&title=${ENC_TITLE}"
                    echo "PR_BODY_FILE: $PR_BODY_FILE"
                    exit 3
                    ;;
            esac
            echo "[ERROR] gh pr create failed: $PR_URL" >&2
            exit 1
        fi
    fi
else
    echo "[ERROR] $PR_BODY_FILE not found. Cannot create PR." >&2
    exit 1
fi
