# ❓ Frequently Asked Questions

Quick answers to common ARCUS questions

---

## Getting Started

### Q: What is ARCUS?

**A:** ARCUS (Any Repository Can Use Spec-driven development) is an agentic SDLC factory that turns written user stories into reviewed, tested pull requests. It's delivered as an installable plugin for GitHub Copilot CLI, Claude Code, and VS Code.

---

### Q: How do I install ARCUS?

**A:** Installation varies by tool:

**GitHub Copilot CLI:**
```
copilot
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

**Claude Code:**
```
claude
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

**VS Code:** Add marketplace to settings, then install via Command Palette

See the full README for detailed instructions.

---

### Q: What do I run first?

**A:** Run `agentify this repo` to scan your repository and build the shared context (`.context/` directory). This is required before running any stories.

---

### Q: How long does agentify take?

**A:** Usually 5-15 minutes depending on repository size. It scans structure, discovers flows, and captures test patterns.

---

## Using ARCUS

### Q: How do I start a story?

**A:** Use any of these commands:
```
implement path/to/story.md
build path/to/story.md
forge path/to/story.md
```

Default mode is **gated** (pauses at each stage). Add `--afk` for autonomous mode.

---

### Q: What's the difference between "implement" and "build"?

**A:** **None** — they're aliases. All three trigger the same pipeline:
- `implement <story>`
- `build <story>`
- `forge <story>`

Use whichever feels natural.

---

### Q: Can I edit artifacts manually?

**A:** **Yes**, most artifacts are safe to edit before proceeding to the next stage:

**✅ Safe to edit:**
- All `.context/` files (repo_scope.md, flows/*.md, etc.)
- `assumptions.md` (refine before Stage 2)
- `blueprint.md` (adjust tasks before Stage 3)
- `test-plan.md` (add tests before Stage 3)

**⚠️ Edit with caution:**
- `session-checkpoint.json` (only if you understand state schema)

**❌ Don't edit:**
- `review.md` (regenerated each round)
- Scripts in `.arcus/bin/` (managed by bootstrap)

See **Artifacts Guide** for full editing guidelines.

---

### Q: How do I skip a stage?

**A:** Use jump commands:
```
brainstorm <story>      # Jump to Stage 1
generate tests <story>  # Jump to Stage 2
implement <story>       # Jump to Stage 3
review <story>          # Jump to Stage 4
close <story>           # Jump to Stage 5
```

⚠️ **Warning:** Skipping stages may result in missing artifacts or incomplete context.

---

### Q: Can I pause and resume later?

**A:** **Yes**, in gated mode only. At any handoff gate:
- Say `"no"` to pause
- Return hours or days later
- Say `"where am I?"` to check status
- Say `"yes"` to resume from where you left off

Your progress is saved in `.arcus/session-checkpoint.json`.

---

## Modes & Configuration

### Q: What's the difference between gated and AFK mode?

**A:** 

| Aspect | Gated (Default) | AFK (Autonomous) |
|--------|----------------|------------------|
| Control | Pauses at each gate | Runs end-to-end |
| User role | Review and approve | Hands-off |
| Best for | Learning, high-risk | Simple, familiar |
| Resumable | Yes | No |

**Use gated** for safety and learning.  
**Use AFK** when story is clear and you trust the system.

See **Modes Explained** for detailed decision framework.

---

### Q: When should I use AFK mode?

**A:** Use AFK mode when **all** of these are true:
- ✅ Story is 100% clear and unambiguous
- ✅ You trust ARCUS patterns in this repo (not first story)
- ✅ You can dedicate 30-90 min uninterrupted
- ✅ Low-to-medium risk change
- ✅ You've used ARCUS successfully here before

**When in doubt:** Use gated mode (default, safe).

---

### Q: Can I switch modes mid-pipeline?

**A:** **No**, mode is set at pipeline start and persists through all stages. To change modes, you'd need to restart the pipeline.

---

## Pipeline & Stages

### Q: What are the 6 stages?

**A:**
1. **Init** — Branch creation, workspace setup
2. **Brainstorm** — Resolve ambiguities and finalize plan → `assumptions.md` + `blueprint.md`
3. **Test Plan** — Design test matrix → `test-plan.md`
4. **Code** — Implement tasks → committed code
5. **Review** — Holistic quality check → `review.md`
6. **Closure** — Create pull request

See **Pipeline Overview** for detailed breakdown.

---

### Q: How long does a full pipeline take?

**A:** 
- **Gated mode:** 30-90 minutes of *active time* (spread over hours/days if you pause)
- **AFK mode:** 30-90 minutes *uninterrupted*

Time varies based on story complexity, codebase size, and number of tasks.

---

### Q: What happens at a handoff gate?

**A:** ARCUS pauses and asks: "Ready to proceed to next stage?"
- Say `"yes"` (or "proceed", "continue", "go") to continue
- Say `"no"` (or "pause", "stop", "hold") to pause and review

You can resume anytime with `"yes"`.

---

### Q: What if code review fails?

**A:** ARCUS automatically loops back to Stage 3 (Code) with fix-tasks generated from review findings. This loop is **bounded to 3 rounds maximum**. If still failing after 3 rounds, manual intervention is required.

---

## Artifacts & Files

### Q: What's in the `.context/` directory?

**A:** Shared repository context committed to git:
- `repo_scope.md` — Tech stack, boundaries
- `repo_map.md` — Navigation index
- `flows/*.md` — Business flows
- `testing-patterns.md` — Test conventions

Created by `agentify this repo`, used by all stories.

---

### Q: What's in the `.arcus/` directory?

**A:** Session workspace (git-ignored), per-story working data:
- `session-checkpoint.json` — Pipeline state
- `specs/[STORY-ID]/` — Story artifacts (assumptions, blueprint, test-plan, review, PR description)
- `bin/` — Helper scripts

Not committed to git, safe to delete after PR merged.

---

### Q: Should I commit `.context/` to git?

**A:** **✅ Yes!** It's shared knowledge for your team. Commit and push it.

---

### Q: Should I commit `.arcus/` to git?

**A:** **❌ No!** It's git-ignored by design. It's ephemeral working data, not source code.

---

### Q: What if I accidentally delete `.arcus/`?

**A:** You lose pipeline state and will need to restart from Stage 0. But `.context/` is safe (committed to git), so you won't lose repository knowledge.

---

### Q: Where's my PR description?

**A:** `.arcus/specs/[STORY-ID]/PR_DESCRIPTION.md` after Stage 5 completes.

---

## Advanced

### Q: Can I run multiple stories in parallel?

**A:** **No**, ARCUS maintains a single session checkpoint (`.arcus/session-checkpoint.json`). Running multiple stories concurrently would cause state conflicts.

**Workaround:** Complete one story through Stage 5, then start the next.

---

### Q: Does ARCUS commit automatically?

**A:** **Yes**, during Stage 3 (Code), each task is committed incrementally to the `arcus/[STORY-ID]` branch. You control whether to create the final PR (Stage 5 asks for confirmation in gated mode).

---

### Q: Can I use custom test frameworks?

**A:** **Yes!** `test-pattern-discovery` (part of `agentify this repo`) automatically detects your existing test frameworks:
- Unit tests (Jest, Vitest, pytest, JUnit, etc.)
- Integration tests
- E2E tests (Playwright, Cypress, Selenium, etc.)
- Shell script tests

ARCUS adapts to your patterns rather than enforcing its own.

---

### Q: How do I customize review criteria?

**A:** Review criteria are embedded in reviewer skills. Currently not user-configurable, but you can:
1. Review findings in `review.md` after Stage 4
2. Override verdict by editing code and skipping to Stage 5: `"close <story>"`

**Future:** Reviewer configuration files may be supported.

---

### Q: What if I disagree with the blueprint?

**A:** 
1. Pause at **GATE B** (after test-plan.md, before Stage 3)
2. Say `"no"` to pause
3. Edit `.arcus/specs/[STORY-ID]/blueprint.md` to adjust tasks
4. Say `"yes"` when ready to proceed with your changes

---

### Q: How do I refresh stale context?

**A:** Re-run `agentify this repo` to regenerate all `.context/` files with fresh analysis.

**Selective refresh:**
- Flows only: `discover and persist flows`
- Tests only: `discover and persist testing patterns`
- Structure only: `build shared repository context`

---

## Troubleshooting

### Q: How do I check my current status?

**A:** Say `"where am I?"` to see:
- Current story ID
- Current stage and status
- Last action
- Next step

---

### Q: Pipeline seems stuck, what do I do?

**A:** 
1. Check status: `"where am I?"`
2. Check checkpoint: `cat .arcus/session-checkpoint.json`
3. Try recovery: `"yes"` or jump to specific stage
4. See **Troubleshooting** for detailed solutions

---

### Q: Tests are failing in Stage 3, what should I do?

**A:** 
1. Run tests manually (check `.context/testing-patterns.md` for commands)
2. Review test failures
3. Let holistic review (Stage 4) catch it if it's cross-cutting
4. Or fix manually and continue

See **Troubleshooting** for detailed solutions.

---

### Q: Review loop won't exit, help!

**A:** Review loops are bounded to 3 rounds maximum. If you hit the limit:
1. Review findings in `.arcus/specs/[ID]/review.md`
2. Fix critical issues manually if needed
3. Skip to Stage 5: `"close <story>"`

See **Troubleshooting** for detailed solutions.

---

### Q: What if `.arcus/` directory is missing?

**A:** Reinitialize with `implement story.md` to trigger workspace setup. See **Troubleshooting** for details.

---

## Help & Support

### Q: Where can I get more help?

**A:** Ask me! I'm the ARCUS Guide. Try:
- `"getting started"` — Setup guide
- `"command reference"` — All commands
- `"explain the pipeline"` — Stage breakdown
- `"gated or afk"` — Mode selection
- `"explain artifacts"` — File system map
- `"troubleshooting"` — Common issues

Or ask natural language questions like:
- "How do I start a new story?"
- "What files does ARCUS create?"
- "Should I use gated or AFK mode?"

---

### Q: How do I report a bug or request a feature?

**A:** Check the plugin's repository (usually linked in README or plugin manifest) for issue tracking and contribution guidelines.

---

### Q: Can I contribute new skills to ARCUS?

**A:** **Yes!** ARCUS is modular and extensible. See the plugin's README for contribution guidelines and skill development documentation.

---

### Q: What if my question isn't here?

**A:** Just ask me in natural language! I understand questions about ARCUS and can guide you to the right information. Try:
- "How do I [task]?"
- "What does [term] mean?"
- "Why is [thing] happening?"
- "Show me [information]"

---

## Quick Reference

**Most common commands:**
```
agentify this repo          # Initial setup
implement story.md          # Start story (gated)
run afk on story.md         # Start story (autonomous)
where am I?                 # Check status
yes                         # Proceed at gate
no                          # Pause at gate
what is arcus?              # Launch this guide
```

**Most common questions:**
- "How do I get started?" → Getting Started section above
- "What's the difference between gated and AFK?" → Modes section above
- "Where are my artifacts?" → Artifacts section above
- "Something's not working" → Troubleshooting guide
- "How do I [specific task]?" → Command Reference

---

**Need more help?** Ask me anything! I'm here to help you succeed with ARCUS.
