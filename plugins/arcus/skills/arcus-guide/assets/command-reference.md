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

Begin the SDLC pipeline

| Command | What it does | When to use |
|---------|-------------|-------------|
| `implement <STORY>.md` | Start the pipeline in **interactive** mode (default) | Begin work on any story (default, recommended) |
| `plan <STORY>.md` | Planning-only alias for interactive mode | Same as above |
| `brainstorm <STORY>.md` | Run **kick-off** coordinator (context-pack + spec-finalizer only, no implementation) | When you want planning artifacts without implementation |
| `kick off <STORY>.md` | Alias for brainstorm | Same as above |
| `architect <STORY>.md` | Alias for brainstorm | Same as above |
| `run afk on <STORY>.md` | Start the pipeline in **autonomous** mode | High-confidence stories, familiar codebases |
| `forge <STORY>.md` | Autonomous trigger | Same as above |
| `afk <STORY>.md` | Autonomous trigger | Same as above |

> **Interactive vs Autonomous:** Both modes use the **`arcus-controller`** orchestrator.
> Interactive mode (default) pauses at handoff gates for review.
> Autonomous mode (`afk`, `forge`, `run afk on`) runs all stages unattended.

---

## ⏭️ Interactive Mode Resume Phrases

In interactive mode, the orchestrator pauses at handoff gates. To cold-resume a later
stage in a fresh session, use that stage's explicit phrase.

| Command | Resumes / runs | When to use |
|---------|----------------|-------------|
| `implement <STORY>` | Full pipeline from start (interactive mode) | Start or resume from beginning |
| `plan <STORY>` | Alias for implement | Same as above |
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

Navigate handoff gates

| Command | What it does | When to use |
|---------|-------------|-------------|
| `yes` | Proceed to next stage | At any handoff gate when ready to continue |
| `proceed` | Alias for yes | Same as above |
| `continue` | Alias for yes | Same as above |
| `go` | Alias for yes | Same as above |
| `no` | Pause pipeline | At handoff gate when you need time to review |
| `pause` | Alias for no | Same as above |
| `stop` | Alias for no | Same as above |
| `hold` | Alias for no | Same as above |

**💡 Tip:** In interactive mode, you can pause at any gate and resume hours or days later.

---

## 🔄 Review & Fix Commands

Handle review loops

| Command | What it does | When to use |
|---------|-------------|-------------|
| `fix <STORY>` | Loopback: feed review findings into the task loop as fix-tasks | After `code_review` returns `changes_requested` verdict |

**Note:** Review loops are automatic (up to 3 rounds). This command is for manual intervention.

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
implement story.md              # Run your first story (interactive mode)
plan story.md                   # Alternative trigger for interactive mode
```

**Mid-pipeline (interactive):**
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

**Need speed (experienced users):**
```
run afk on story.md             # Autonomous mode
forge story.md                  # Autonomous mode
afk story.md                    # Autonomous mode
```

**Brainstorm only (no implementation):**
```
brainstorm story.md             # Run kick-off coordinator
kick off story.md               # Alternative trigger
architect story.md              # Alternative trigger
```

**Fixing issues:**
```
fix story.md                    # Address review findings
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
- **Flexible phrasing:** Natural variations work (e.g., "build story.md" = "implement story.md")
- **Tab completion:** Most tools support tab completion for file paths
- **Paths:** Use relative or absolute paths for story files
- **Resume phrases:** ARCUS tells you exact resume commands at each gate

---

## What's Next?

- **Understand the stages:** Ask "explain the pipeline"
- **Choose a mode:** Ask "interactive or autonomous?"
- **Check your status:** Ask "where am I?"
- **Get troubleshooting help:** Ask "troubleshooting"
