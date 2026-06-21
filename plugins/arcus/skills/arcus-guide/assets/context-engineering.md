# 🧠 Context Engineering

How ARCUS gives agents durable, token-efficient knowledge of your repository — built **once**, scoped **per story**, and synced **on drift**.

---

## The idea in one line

**Scan once · scope per story · sync on drift.**

A coding agent that re-reads your whole repository on every task is slow, expensive, and inconsistent.
ARCUS instead captures how the repo is built, run, tested, and structured into a small set of durable,
evidence-grounded artifacts that every pipeline stage reuses.

- **Scan once** — `repo-agentifier` builds the shared `.context/` snapshot a single time per repository.
- **Scope per story** — `context-pack-builder` pulls only the slice each story needs.
- **Sync on drift** — after a change merges, `context-drift-sync` surgically updates only the artifacts
  the diff *materially* changed — never a full rescan.

## The five `.context/` artifacts

| Artifact | Captures |
|----------|----------|
| `repo_scope.md` | Business scope: purpose, responsibilities, boundaries, tech-stack signals |
| `repo_map.md` | Technical map: directory layout, entry surfaces, key modules, config hotspots |
| `flows/*.md` | Business flows — entry points, core path, data touchpoints, integrations |
| `testing-patterns.md` | Test layers, frameworks, conventions, execution commands |
| `design-and-coding-patterns.md` | Design patterns in use, layering/structure, naming/idioms, error-handling + a curated **Avoid** list |

Each artifact carries a `context-meta` header (`verification-commit`, `generated-at`, `confidence`).

> **`design-and-coding-patterns.md` is static by design.** It records the repo's *settled* conventions,
> so `context_sync` updates it **only** when a genuinely new, team-level pattern is adopted (recurring
> in ≥3 places) or an old one is superseded. Its **Avoid** section is prescriptive rules — not a list of
> offending files.

## `AGENTS.md` + `CLAUDE.md`

- **`AGENTS.md`** — an agent-facing **navigation index** generated from `.context/`; points agents at
  the right artifact (tech stack, layout, testing conventions, design & coding patterns, business flows)
  so they load only what they need.
- **`CLAUDE.md`** — a one-line `@AGENTS.md` import so Claude Code inlines the index at session start.

## Re-agentify vs. trust-sync

- **Trust-sync (default).** Per-story, `context-drift-sync` updates only the materially-changed
  artifacts — facts-only, diff-driven, low token cost. This is the normal maintenance path.
- **Re-agentify (rare).** Re-run `repo-agentifier` from scratch only after a **major restructure** or
  **tech-stack change**, when incremental sync would chase too many moving parts.

Prefer trust-sync for everyday work; re-agentify only when the repo's shape fundamentally shifts.

---

**Related:** `artifacts-guide.md` (file-by-file map) · `pipeline-explained.md` (where `context_sync` sits).
