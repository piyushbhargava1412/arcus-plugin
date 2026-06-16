---
name: copilot-conversation-search
description: Search past Copilot CLI conversation history. Use when asked to recall, find, or search for anything from previous sessions. Triggers include "what did we do today", "what did we work on yesterday", "how did we fix X", "search history", "recall when we", "what was that solution", "find past session", "what sessions", "previous work".
---

# Conversation Search

Search your Copilot CLI session history using the built-in `sql` tool with `database: "session_store"`.

## How Copilot CLI Stores Conversations

Sessions are stored in `~/.copilot/session-store.db` (SQLite). Key tables:

- **`sessions`** — id, cwd, repository, branch, summary, created_at, updated_at
- **`turns`** — session_id, turn_index, user_message, assistant_response, timestamp
- **`checkpoints`** — detailed session summaries (overview, work_done, technical_details, next_steps)
- **`session_files`** — files read/edited during each session
- **`session_refs`** — git refs (commits, PRs, issues) linked to sessions
- **`search_index`** — FTS5 full-text search across all content

## Query Patterns

### Daily Digest — "What did we work on today/yesterday?"

```sql
SELECT s.id, s.repository, s.branch, s.summary, s.cwd, s.created_at
FROM sessions s
WHERE date(s.created_at) = date('now', '-1 day')   -- or date('now') for today
ORDER BY s.created_at DESC;
```

For richer output, join with checkpoints:
```sql
SELECT s.id, s.summary, c.overview, c.work_done, s.created_at
FROM sessions s
LEFT JOIN checkpoints c ON c.session_id = s.id
WHERE date(s.created_at) >= date('now', '-1 day')
ORDER BY s.created_at DESC;
```

### Keyword Search — "How did we fix X?"

Always expand keywords into synonyms for better recall. Use FTS5 OR syntax:

```sql
SELECT content, session_id, source_type
FROM search_index
WHERE search_index MATCH 'error OR fix OR bug OR crash OR broken'
ORDER BY rank
LIMIT 10;
```

Then fetch the full session context:
```sql
SELECT s.id, s.summary, s.repository, s.branch, s.created_at,
       t.user_message, t.assistant_response
FROM turns t
JOIN sessions s ON t.session_id = s.id
WHERE t.session_id IN (/* ids from above */)
ORDER BY t.turn_index;
```

### Find Files Touched

```sql
SELECT sf.file_path, sf.tool_name, s.summary, s.created_at
FROM session_files sf
JOIN sessions s ON sf.session_id = s.id
WHERE sf.file_path LIKE '%ComponentName%'
ORDER BY s.created_at DESC;
```

### Find by Project / Repository

```sql
SELECT id, branch, summary, created_at
FROM sessions
WHERE repository = 'owner/repo'
ORDER BY created_at DESC
LIMIT 20;
```

### Find Sessions Linked to a PR or Issue

```sql
SELECT s.id, s.summary, sr.ref_type, sr.ref_value
FROM session_refs sr
JOIN sessions s ON sr.session_id = s.id
WHERE sr.ref_type = 'pr' AND sr.ref_value = '42';
```

### Recent Sessions (Last N Days)

```sql
SELECT id, repository, branch, summary, created_at
FROM sessions
WHERE created_at >= datetime('now', '-7 days')
ORDER BY created_at DESC;
```

## Execution Steps

1. **Identify intent**: Is the user asking for a daily digest, searching for a specific solution, or browsing by project/file?

2. **Start broad**: Use FTS5 with expanded synonyms. For "EMFILE error" search `EMFILE OR file OR descriptor OR limit OR ulimit`. For "auth" search `auth OR login OR token OR JWT OR session OR authentication`.

3. **Narrow down**: Once you have session IDs, fetch full turns and checkpoint details.

4. **Present results clearly**:
   - For digests: list sessions with summary, repo, branch, date
   - For searches: show the problem excerpt (user message) and solution excerpt (assistant response or work_done)
   - Always include session ID and date for reference

## Output Format

For **daily digests**:
```
## [Date] — N sessions

### 1. [Session Summary]
   Session: `short-id`
   Repo: owner/repo  Branch: feature-branch
   What happened: [overview or work_done from checkpoint]
```

For **keyword searches**:
```
### Result #1 — [Session Summary]
   Session: `short-id`  Date: YYYY-MM-DD
   Repo: owner/repo  Branch: branch-name

   PROBLEM: [user_message excerpt]
   SOLUTION: [assistant_response or checkpoint work_done excerpt]
```

## Important Notes

- The `search_index` uses **keyword matching, not semantic search**. Always expand queries with synonyms.
- `checkpoints.work_done` and `checkpoints.technical_details` often have the best summaries of what was accomplished.
- Sessions without checkpoints may only have raw `turns` data.
- Use `substr(text, 1, 200)` to keep query output readable.
