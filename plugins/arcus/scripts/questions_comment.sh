#!/usr/bin/env bash
# ==============================================================================
# NAME: questions_comment.sh
# DESCRIPTION: Renders a story's unanswered `## Open Questions` as a GitHub issue
#              comment. Reads the machine-readable YAML block the Brainstorm
#              capabilities write into their own artifacts.
#
# USAGE:
#   questions_comment.sh <STORY_ID> <ISSUE_NUMBER> [--repo owner/repo] [--dry-run]
#
# Exit 0 with `QUESTIONS: none` when nothing is unanswered (the caller then
# advances instead of halting).
#
# WHY THIS IS DETERMINISTIC: the questions live at a fixed path in a specified
# format, so transport needs no model involvement. Scraping them from agent
# stdout would be brittle — prose varies run to run, and a cold resume has no
# conversation to scrape at all.
#
# A question is UNANSWERED when its id appears in `## Open Questions` but not in
# `## Dialogue Answers`. `## Dialogue Answers` is the single source of truth for
# answered-ness; the YAML deliberately carries no `status` field to avoid two.
# ==============================================================================

set -euo pipefail

STORY_ID="${1:-}"
ISSUE_NUMBER="${2:-}"
REPO_ARG=""
DRY_RUN=0

if [ -z "$STORY_ID" ] || [ -z "$ISSUE_NUMBER" ]; then
    echo "[ERROR] Usage: questions_comment.sh <STORY_ID> <ISSUE_NUMBER> [--repo owner/repo] [--dry-run]" >&2
    exit 2
fi
shift 2 || true
while [ $# -gt 0 ]; do
    case "$1" in
        --repo)    REPO_ARG="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        *) echo "[ERROR] Unknown option: $1" >&2; exit 2 ;;
    esac
done

printf '%s' "$STORY_ID" | grep -qE '^[A-Za-z0-9_-]+$' || {
    echo "[ERROR] Invalid STORY_ID '$STORY_ID'" >&2; exit 2; }

WORKSPACE_DIR=".arcus/specs/$STORY_ID"
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

# Parse both Brainstorm artifacts. Node, not shell: artifact text is model-authored
# and must never be interpolated anywhere it could be evaluated.
COUNT="$(WORKSPACE_DIR="$WORKSPACE_DIR" STORY_ID="$STORY_ID" BODY_FILE="$BODY_FILE" node -e '
const fs = require("fs"), path = require("path");
const dir = process.env.WORKSPACE_DIR;

// Minimal reader for the documented block shape — one `- id:` record per entry,
// two-space-indented scalars, and inline {key: ..., text: ...} option maps. A
// full YAML parser is a dependency we do not need and cannot assume in CI.
function section(md, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "m");
  const m = md.match(re);
  if (!m) return "";
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}
function parseOpen(md) {
  const sec = section(md, "Open Questions");
  const fence = sec.match(/```(?:yaml)?\s*\n([\s\S]*?)```/);
  if (!fence) return [];
  const out = [];
  let cur = null;
  for (const raw of fence[1].split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const idm = line.match(/^-\s*id:\s*(.+)$/);
    if (idm) { cur = { id: idm[1].trim(), options: [] }; out.push(cur); continue; }
    if (!cur) continue;
    const gap = line.match(/^\s+gap:\s*(.+)$/);          if (gap) { cur.gap = gap[1].trim(); continue; }
    const rsn = line.match(/^\s+reason:\s*(.+)$/);       if (rsn) { cur.reason = rsn[1].trim(); continue; }
    const tnt = line.match(/^\s+tentative:\s*(.+)$/);    if (tnt) { cur.tentative = tnt[1].trim(); continue; }
    const opt = line.match(/^\s*-\s*\{(.+)\}\s*$/);
    if (opt) {
      const o = {};
      for (const kv of opt[1].split(/,\s*(?=[a-z_]+:)/)) {
        const i = kv.indexOf(":");
        if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
      }
      cur.options.push(o);
    }
  }
  return out.filter(q => q.id);
}
const answeredIds = new Set();
const questions = [];
for (const [file, heading] of [["grounded-spec.md","Dialogue Answers"],["plan.md","Design Dialogue Answers"]]) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) continue;
  const md = fs.readFileSync(p, "utf8");
  for (const q of parseOpen(md)) questions.push(q);
  // Any id mentioned anywhere in the answers section counts as answered.
  for (const m of section(md, heading).matchAll(/\b([A-Z]{2}-\d+)\b/g)) answeredIds.add(m[1]);
}
const open = questions.filter(q => !answeredIds.has(q.id));
if (!open.length) { process.stdout.write("0"); process.exit(0); }

const L = [];
L.push(`<!-- arcus:v1 kind=question story=${process.env.STORY_ID} -->`);
L.push(`### ARCUS needs ${open.length} answer${open.length === 1 ? "" : "s"} before it can continue`);
L.push("");
L.push("Each has a recommended option. **Reply in this thread in your own words** — you can answer all of them in one comment, accept the recommendations, or say what you would rather do.");
L.push("");
for (const q of open) {
  L.push(`**${q.id} — ${q.gap || "(no description)"}**`);
  for (const o of q.options) {
    const rec = String(o.recommended) === "true";
    const bits = [`- **${o.key || "?"}** — ${o.text || ""}`];
    if (rec) bits.push("✅ **Recommended**");
    if (o.rationale) bits.push(`— _${o.rationale}_`);
    L.push(bits.join(" "));
  }
  if (q.tentative && q.tentative !== "none") {
    L.push(`- _Applied for now: **${q.tentative}**. Say nothing about this one and it stands._`);
  }
  L.push("");
}
L.push("---");
L.push("_The spec is already complete — these are the calls ARCUS was least confident about, not blanks. Answering changes them; ignoring one keeps the applied choice._");
fs.writeFileSync(process.env.BODY_FILE, L.join("\n") + "\n");
process.stdout.write(String(open.length));
')"

if [ "$COUNT" = "0" ]; then
    echo "QUESTIONS: none"
    exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
    echo "QUESTIONS: $COUNT (dry run — body follows)"
    cat "$BODY_FILE"
    exit 0
fi

command -v gh >/dev/null 2>&1 || { echo "[ERROR] gh CLI not found." >&2; exit 1; }
GH_ARGS=(issue comment "$ISSUE_NUMBER" --body-file "$BODY_FILE")
[ -n "$REPO_ARG" ] && GH_ARGS+=(--repo "$REPO_ARG")
gh "${GH_ARGS[@]}" >/dev/null || { echo "[ERROR] Failed to post comment." >&2; exit 1; }

echo "QUESTIONS: $COUNT"
