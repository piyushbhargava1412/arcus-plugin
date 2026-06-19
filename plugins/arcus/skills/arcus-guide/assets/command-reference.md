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
| `solution-architect <STORY>.md` | Start the **gated** chain (entry skill) | Begin work on any story (default, recommended) |
| `plan <STORY>.md` | Alias for solution-architect (gated entry) | Same as above |
| `run afk on <STORY>.md` | Start the pipeline in **AFK** mode (autonomous, via `arcus-controller`) | High-confidence stories, familiar codebases |
| `forge <STORY>.md` | AFK trigger | Same as above |
| `implement <STORY> --afk` | Start the pipeline with the AFK flag | Same as above |

> **Gated vs AFK:** `solution-architect` / `plan` enter the **gated self-handoff chain**.
> AFK phrases (`afk`, `--afk`, `forge`, `run afk on …`) activate the **`arcus-controller`**,
> which runs every stage unattended. `arcus-controller` is **AFK-only**.

---

## ⏭️ Gated Resume Phrases

In gated mode, each stage's Handoff Protocol names its successor. To cold-resume a later
stage in a fresh session, use that stage's explicit phrase.

| Command | Resumes / runs | When to use |
|---------|----------------|-------------|
| `solution-architect <STORY>` | Planning (entry: scaffold → context_pack → spec_finalizer → blueprint) | Start or resume planning |
| `plan <STORY>` | Alias for solution-architect | Same as above |
| `generate test plan for <STORY>` | The `test_plan` stage | Resume or restart test planning |
| `implement <STORY>` | Implementation (creates the branch, then the task loop) | Resume or restart implementation |
| `review <STORY>` | The `code_review` stage | Resume or restart code review |
| `code review <STORY>` | Alias for review | Same as above |
| `sync context for <STORY>` | The `context_sync` stage | Resume or run the post-review `.context/` drift sync (also: `sync context`) |
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

**💡 Tip:** In gated mode, you can pause at any gate and resume hours or days later.

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
solution-architect story.md     # Run your first story (gated entry)
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

**Need speed (experienced users):**
```
run afk on story.md             # Autonomous mode
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
- **Choose a mode:** Ask "gated or afk?"
- **Check your status:** Ask "where am I?"
- **Get troubleshooting help:** Ask "troubleshooting"
