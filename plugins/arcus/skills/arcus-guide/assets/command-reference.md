# 📋 Command Reference

Comprehensive list of all ARCUS commands, organized by category.

---

## 🔧 Repository Setup Commands

Initial setup and context management

| Command | What it does | When to use |
|---------|-------------|-------------|
| `agentify this repo` | Full repository scan: context, flows, test patterns | Once per repo, or when repo structure changes significantly |
| `wire me up` | Alias for agentify | Same as above |
| `generate context` | Alias for agentify | Same as above |
| `discover and persist flows` | Business flow mapping only | Update flows without full rescan |
| `discover and persist testing patterns` | Test pattern analysis only | Update test patterns after framework changes |
| `build shared repository context` | Refresh repo_scope.md and repo_map.md | After major codebase refactoring |
| `update the context` | Alias for build shared repository context | Same as above |
| `refresh the context` | Alias for build shared repository context | Same as above |

---

## 🚀 Pipeline Start Commands

Begin the SDLC pipeline. These all belong to **`arcus-controller`**, the single orchestrator —
`implement <STORY>` / `code <STORY>` are **not** in this table; see the callout below.

| Command | What it does | When to use |
|---------|-------------|-------------|
| `arcus <STORY>.md` | Start the pipeline in **`gated`** mode (default) | Begin work on any story (default, recommended) |
| `plan <STORY>.md` | Alias for `gated` mode | Same as above |
| `arcus <STORY>.md --intelligent` | Start the pipeline in **`intelligent`** mode | Question-gating without phase-boundary pauses; this is also cloud's automatic default |
| `run afk on <STORY>.md` | Start the pipeline in **`afk`** mode | High-confidence stories, familiar codebases |
| `forge <STORY>.md` | `afk` trigger | Same as above |
| `afk <STORY>.md` | `afk` trigger | Same as above |
| `arcus <STORY>.md --afk` | `afk` trigger | Same as above |

> **Trigger ownership:** `implement <STORY>` and `code <STORY>` are **not** `arcus-controller`
> triggers — they belong exclusively to `implementation-runner`, which resumes/drives just the
> Implementation loop for a story that already has a `plan.md` (see the note under **Review & Fix
> Commands** below). To start or resume the full Spec → Code → PR pipeline, use `arcus <STORY>`,
> `plan <STORY>`, or an `afk` trigger from the table above.
>
> **Three modes, one orchestrator:** `arcus-controller` runs `gated`, `intelligent`, and `afk` —
> not two. `gated` (default) stops for Brainstorm open questions **and** can pause at configurable
> phase boundaries (see `.arcus/config.json` below). `intelligent` stops only for open questions,
> never at a phase boundary — this is cloud's automatic default. `afk` never stops at all.

---

## ⚙️ `.arcus/config.json`: Narrowing `gated`'s Phase-Boundary Stops

`gated` mode's phase-boundary gates default to pausing after **all three** transitions —
`test_plan`, `implementation`, `code_review`. To pause after fewer of them, create an optional,
developer-authored, **gitignored** `.arcus/config.json` at the repo root **before** scaffolding a
`gated` story:

```json
{ "stop_after": ["test_plan", "implementation", "code_review"] }
```

List only the phase groups you want to pause after — the three valid keys are `test_plan`,
`implementation`, and `code_review`. It only ever **narrows** that default set — it can drop gates,
never add a fourth or reorder the existing three.

- **Opt-in only.** No script creates or seeds this file. If it's absent, `gated` falls back to the
  built-in default of all three gates.
- **Read once, at scaffold time, `gated` mode only.** It is never re-read on `resume <STORY>`, and
  `intelligent`/`afk` never read it at all.
- **Never hard-fails.** Malformed JSON, a non-array `stop_after`, unknown keys, or duplicates log a
  warning and fall back / drop the bad entries — they never abort scaffolding.

---

## ⏭️ Resume Phrases

The orchestrator stops for open questions (all modes) and, in `gated`, optionally at phase
boundaries too. To cold-resume a later stage in a fresh session, use that stage's explicit phrase.

| Command | Resumes / runs | When to use |
|---------|----------------|-------------|
| `arcus <STORY>` | Full pipeline from start (`gated` mode) | Start or resume from beginning |
| `plan <STORY>` | Alias for `arcus <STORY>` | Same as above |
| `generate test plan for <STORY>` | The `test_plan` stage | Resume or restart test planning |
| `review <STORY>` | The `code_review` stage | Resume or restart code review |
| `code review <STORY>` | Alias for review | Same as above |
| `resume <STORY>` | Continue the pipeline | Resume from the first incomplete stage in the persisted mode |
| `sync context` | Ad-hoc `.context/` full sweep | Run a standalone drift sweep (to resume the in-pipeline `context_sync` stage, use `resume <STORY>`) |
| `create pull request for <STORY>` | The `closure` stage | Resume or restart PR creation |

**⚠️ Warning:** Cold-resuming a later stage assumes the earlier artifacts already exist.
Use the resume phrases your last handoff printed.

---

## ↔️ Control Flow Commands

Answer open questions

| Command | What it does | When to use |
|---------|-------------|-------------|
| your answers | Resolve the open questions | When ARCUS surfaces a batch of questions during Brainstorm |
| `proceed` | Alias for yes | Same as above |
| `continue` | Alias for yes | Same as above |
| `go` | Alias for yes | Same as above |
| `resume <STORY>` | Continue from the checkpoint | After stopping, or in a new session |
| `pause` | Alias for no | Same as above |
| `stop` | Alias for no | Same as above |
| `hold` | Alias for no | Same as above |

**💡 Tip:** In `gated` mode, you can pause at any gate and resume hours or days later.

---

## 🔄 Review & Fix Commands

Handle review loops, and drive/resume the Implementation loop directly

| Command | What it does | When to use |
|---------|-------------|-------------|
| `fix <STORY>` | Loopback: feed review findings into the task loop as fix-tasks | After `code_review` returns `changes_requested` verdict |
| `implement <STORY>` | Belongs to **`implementation-runner`**, not `arcus-controller` — realizes the branch and drives the per-task loop for a story that already has a `plan.md` | Resuming/driving just the Implementation stage directly, outside the full pipeline flow |
| `code <STORY>` | Alias for `implement <STORY>` (`implementation-runner`) | Same as above |

**Note:** Review loops are automatic (up to 3 rounds). `fix <STORY>` is for manual intervention.
`implement`/`code <STORY>` do not start or resume the full Spec → Code → PR pipeline — that's
`arcus <STORY>` (`arcus-controller`). `implementation-runner` is reused verbatim by both `gated`
and `afk` for the Implementation stage; these phrases give you a direct handle on it.

---

## 📊 Status & Navigation Commands

Check pipeline position

| Command | What it does | When to use |
|---------|-------------|-------------|
| `where am I?` | Check current pipeline status | Anytime mid-pipeline to see your position |
| `what stage am I in?` | Alias for where am I | Same as above |
| `check pipeline status` | Alias for where am I | Same as above |

---

## 🛠️ Utility Commands

Helper and history tools

| Command | What it does | When to use |
|---------|-------------|-------------|
| `what did we do today?` | Search session history for daily digest | Recall recent work |
| `how did we fix X?` | Keyword search in session history | Find past solutions |
| `search history for <keyword>` | Session history search | Find specific conversations |
| `what is arcus?` | Launch ARCUS Guide (this helper) | Anytime you need help |
| `arcus help` | Alias for what is arcus | Same as above |
| `show arcus commands` | Alias for command reference | Same as above |

---

## 🎯 Quick Reference by Task

**Starting fresh:**
```
agentify this repo              # First-time setup
arcus story.md                  # Run your first story (gated mode, default)
plan story.md                   # Alternative trigger for gated mode
```

**Mid-pipeline (gated):**
```
where am I?                     # Check status
yes                             # Proceed to next stage
no                              # Pause for review
```

**Resuming work:**
```
where am I?                     # See current position
yes                             # Continue from last gate
```

**Question-gating without phase pauses:**
```
arcus story.md --intelligent    # intelligent mode (also cloud's automatic default)
```

**Need speed (experienced users):**
```
run afk on story.md             # AFK (autonomous) mode
forge story.md                  # AFK (autonomous) mode
afk story.md                    # AFK (autonomous) mode
```

**Fixing issues:**
```
fix story.md                    # Address review findings
```

**Driving Implementation directly (implementation-runner, not arcus-controller):**
```
implement story.md              # Resume/drive just the Implementation loop
code story.md                   # Alias for implement
```

**Getting help:**
```
what is arcus?                  # Launch this guide
show me commands                # Command reference
explain the pipeline            # Pipeline breakdown
troubleshooting                 # Common issues
```

---

## 💡 Command Tips

- **Case insensitive:** Commands work regardless of capitalization
- **Flexible phrasing:** Natural variations work (e.g., "start story.md" = "arcus story.md")
- **Tab completion:** Most tools support tab completion for file paths
- **Paths:** Use relative or absolute paths for story files
- **Resume phrases:** ARCUS tells you the exact resume command whenever it stops

---

## What's Next?

- **Understand the stages:** Ask "explain the pipeline"
- **Choose a mode:** Ask "gated, intelligent, or afk?"
- **Check your status:** Ask "where am I?"
- **Get troubleshooting help:** Ask "troubleshooting"
