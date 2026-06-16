#!/usr/bin/env bash
# Minimal Story ID extractor used by the orchestrator.
# Usage: scripts/extract_story_id.sh path/to/story.md
# Outputs exactly: STORY_ID: <ID>  (to stdout) and exits 0 on success, 1 on failure.

set -euo pipefail

STORY_FILE="${1:-}"
if [ -z "$STORY_FILE" ] || [ ! -f "$STORY_FILE" ]; then
  echo "Usage: $0 <story.md>" >&2
  exit 2
fi

trim() { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' ; }

# 1) YAML frontmatter (story_id, id, story)
front_id=$(awk 'BEGIN{f=0} /^---/ { if (f==0) {f=1; next} else {exit}} f==1{print}' "$STORY_FILE" 2>/dev/null \
  | awk -F: '/^(story_id|id|story)[[:space:]]*:/ { $1=""; sub(/^:\s*/, ""); print; exit }' \
  | tr -d '\r' | trim || true)

if [ -n "$front_id" ]; then
  method="frontmatter"
  echo "STORY_ID: $(echo "$front_id" | tr '[:lower:]' '[:upper:]')"
  echo "STORY_METHOD: $method"
  exit 0
fi

# 2) First JIRA-like ID anywhere in the file
header_id=$(grep -m1 -Eo '[A-Z]{2,}-[0-9]+' "$STORY_FILE" || true)
if [ -n "$header_id" ]; then
  method="header"
  echo "STORY_ID: $(echo "$header_id" | tr '[:lower:]' '[:upper:]')"
  echo "STORY_METHOD: $method"
  exit 0
fi

# 3) Look for explicit inline label like 'Story ID: ABC-123'
inline_id=$(grep -m1 -Ei 'Story[[:space:]]*ID[[:space:]]*[:\-]' "$STORY_FILE" | sed -E 's/.*[Ss]tory[[:space:]]*[Ii][Dd][[:space:]]*[:\-][[:space:]]*([A-Za-z0-9._-]+).*/\1/' | trim || true)
if [ -n "$inline_id" ]; then
  method="inline"
  echo "STORY_ID: $(echo "$inline_id" | tr '[:lower:]' '[:upper:]')"
  echo "STORY_METHOD: $method"
  exit 0
fi

# 4) Optional: LLM fallback (only if copilot is available). Keep strict output contract.
if command -v copilot >/dev/null 2>&1; then
  # Use a temp file to avoid very long single-line arguments
  tmp=$(mktemp)
  cat "$STORY_FILE" > "$tmp"
  llm_out=$(copilot -p "Read the following story and output exactly: STORY_ID: [ID]. Only output that line if you can identify a primary story ID. Story content follows." --yolo < "$tmp" 2>/dev/null || true)
  rm -f "$tmp"
  llm_id=$(echo "$llm_out" | grep -m1 -E 'STORY_ID:' | sed 's/STORY_ID:[[:space:]]*//' | tr -d '[][:space:]*') || true
  if [ -n "$llm_id" ]; then
    method="llm"
    echo "STORY_ID: $(echo "$llm_id" | tr '[:lower:]' '[:upper:]')"
    echo "STORY_METHOD: $method"
    exit 0
  fi
fi

# Nothing found
exit 1


