# Docs-Only Predicate

Single source of truth for the docs-only predicate shared across the coordinator layer
(`code-reviewer`'s Step 1.5 fast path) and the agent layer (`history-context-reviewer`'s Skip
Criteria Condition 1). This is a plain reference document, not a skill — it is read directly (by
file path) by whichever skill or agent body needs it; it is never dispatched or loaded via the
`Skill` tool.

## Docs-Only Predicate

A diff is **docs-only** when all changed files match `*.md` OR are comment-only diffs OR are
test-data fixtures (no logic code changed).

## Secret-Pattern Carve-Out

If any changed file's diff content matches one of the patterns below, the predicate returns "not
docs-only" regardless of file extension — the carve-out overrides the docs-only result.

All patterns below are matched **case-insensitively** (e.g. `apiToken`, `ApiKey`, and `API_KEY` all
match the generic key/token row, not just literal lowercase `key`/`token`).

| Pattern | Catches |
| --- | --- |
| `-----BEGIN[ A-Z]*PRIVATE KEY-----` | PEM private-key header |
| `AKIA[0-9A-Z]{16}` | AWS access-key-ID shape |
| `AIza[0-9A-Za-z_-]{35}` | Google API-key shape |
| `(api\|access\|secret)[_-]?(key\|token)['"]?\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}` (case-insensitive) | Generic key/token assignment, any casing |
| `gh[pousr]_[A-Za-z0-9]{36,}` | GitHub token shapes |

## Mechanical vs. Judgment-Requiring Clauses

Not all three docs-only categories carry the same evaluation guarantee:

- **Mechanical, regex-only**: the `*.md`-extension check and the secret-pattern carve-out above are
  pure pattern matches (applied case-insensitively) — no LLM judgment is involved, and their result
  is reproducible from the changed-file list and diff text alone.
- **Judgment-requiring**: the "comment-only diff" and "test-data fixture, no logic code changed"
  categories require the invoking model to read the diff and judge intent (e.g. distinguishing a
  comment-only edit from a comment change that also touches an adjacent statement, or recognizing
  that a fixture file is genuinely inert). This is the same judgment call `history-context-reviewer`
  already relies on for its own docs-only check (Skip Criteria Condition 1) — this predicate does
  not add a stronger guarantee on top of it, it names the same one consistently.

This predicate is still safe for coordinator-layer use ahead of any specialist dispatch decision:
the secret-pattern carve-out acts as a deterministic backstop that overrides a docs-only
misjudgment whenever secret-shaped content is present, bounding the risk of the judgment-requiring
clauses rather than eliminating the need for them.

## Consumers

- `code-reviewer/SKILL.md` — Step 1.5 (coordinator fast path over the whole changed-file set).
- `history-context-reviewer.md` — Skip Criteria Condition 1 (per-agent, standalone-safe skip).

Any future skill or agent needing the same docs-only judgment should read this file directly
rather than re-deriving the predicate.
