# ⚙️ Modes Explained

Choosing between Gated and AFK modes

---

## Side-by-Side Comparison

| Aspect | Gated Mode (Default) | AFK Mode (Autonomous) |
|--------|---------------------|----------------------|
| **Driver** | Self-handoff chain entered via `solution-architect` (no router, no shared pipeline file) | `arcus-controller` runs every stage one-shot |
| **Control** | Pauses between stages | Runs all stages back-to-back |
| **User Role** | Review artifacts, say "yes"/"proceed" to advance | Hands-off until PR ready |
| **Best For** | Novel domains, high-risk changes, learning | Familiar codebases, simple features |
| **Intervention Points** | A handoff after each stage | Milestone-only output |
| **Session Resumability** | Yes — cold resume = the next stage's explicit phrase + the checkpoint | Resume-capable via checkpoint; intended to run uninterrupted |
| **Spec Finalization** | Recommendation-first dialogue (one question at a time, each with a Recommended option) | One-shot auto-resolution |
| **Output Verbosity** | Full progress updates at each gate | Compact, milestone output only |
| **When to Use** | Default for safety and learning | When you're confident in the spec |
| **Typical Duration** | 30-90 min active time (spread over hours/days) | 30-90 min uninterrupted |
| **Mistakes Caught** | Early (at each handoff before proceeding) | Late (after full implementation) |
| **Context Switching** | Friendly (pause anytime, resume later) | Hostile (must complete in one session) |

> **Gated is a chain of self-handing-off skills**, entered at `solution-architect`. Each
> stage skill embeds a **Handoff Protocol** naming only its immediate successor; on a
> same-session "yes"/"proceed" it loads the successor. **AFK is the `arcus-controller`
> skill** — it drives AFK only and does *not* drive gated mode.

---

## Decision Tree

Should you use AFK mode? Follow this flowchart:

```mermaid
graph TD
    A[Should I use AFK mode?] --> B{First story in this repo?}
    B -->|Yes| C[Use Gated Mode]
    B -->|No| D{Spec complete and unambiguous?}
    D -->|No| C
    D -->|Yes| E{High confidence in story?}
    E -->|No| C
    E -->|Yes| F{Want to learn ARCUS workflows?}
    F -->|Yes| C
    F -->|No| G{Available for 30-90 min uninterrupted?}
    G -->|No| C
    G -->|Yes| H[✅ AFK Mode is appropriate]
    
    C --> I[✅ Use Gated Mode]
    
    style H fill:#e1ffe8
    style I fill:#fff4e1
```

---

## When to Choose Gated Mode

✅ **First time using ARCUS in this repository**  
You need to see how ARCUS interprets your patterns

✅ **Story has ambiguities or missing details**  
Gated mode asks clarifying questions interactively

✅ **Unfamiliar domain or complex requirements**  
Review each stage to catch misunderstandings early

✅ **Want to review each stage's output before proceeding**  
See `plan.md`, test plan, and implementation incrementally

✅ **Need to pause and resume across multiple sessions**  
Real work isn't always uninterrupted — gated mode respects that

✅ **Learning how ARCUS works**  
See the workflow stage-by-stage to understand the process

✅ **High-risk changes (security, performance, critical paths)**  
Extra review gates prevent costly mistakes

✅ **Working with a new team or codebase**  
Verify ARCUS follows your conventions

---

## When to Choose AFK Mode

✅ **High-confidence, well-defined story**  
No ambiguities, clear acceptance criteria, obvious approach

✅ **Familiar codebase and domain**  
ARCUS knows your patterns, you trust its decisions

✅ **Simple feature or bug fix**  
Straightforward changes with low risk

✅ **Can dedicate 30-90 minutes uninterrupted**  
You're available for the full session without context switching

✅ **Trust ARCUS to handle ambiguities automatically**  
Spec finalizer's one-shot mode makes good default choices

✅ **Experienced ARCUS user**  
You know what to expect and trust the outputs

✅ **Tight deadline, need speed**  
AFK mode is faster (no handoff pauses)

---

## How to Trigger Each Mode

### Gated Mode (Default)

Enter the gated chain via `solution-architect`:

```
solution-architect story.md
plan story.md
```

No flags needed — gated is the default.

**What happens:**
- `solution-architect` runs `scaffold` (folder + checkpoint, **no git branch yet**)
- The self-handoff chain walks `context_pack → spec_finalizer → blueprint → test_plan`
- You advance with `yes` / `proceed` at each handoff (or `no` to pause)
- Cold-resuming a later stage uses that stage's explicit phrase — e.g.
  `generate test plan for story.md`, `implement story.md`, `review story.md`,
  `create pull request for story.md`

### AFK Mode (Opt-In)

Use an AFK trigger or the `--afk` flag — these activate the `arcus-controller` skill:

```
run afk on story.md
forge story.md
implement story.md --afk
```

**What happens:**
- `arcus-controller` runs every stage as a one-shot subagent, back-to-back
- No pauses (all handoffs auto-confirm)
- Milestone output only (less verbose)
- Returns when the PR is ready

---

## Example Scenarios

### Scenario 1: First Story in New Repo

**Situation:** You just agentified a new codebase, writing your first story

**Recommendation:** **Gated Mode**

**Why:**
- ARCUS needs to learn your patterns
- You need to verify it understood your conventions
- Review `plan.md` and blueprint before code is written
- Catch misalignments early

**Command:**
```
solution-architect story.md
```

---

### Scenario 2: 10th Story, Simple Bug Fix

**Situation:** Fixing a typo in validation message, well-understood change

**Recommendation:** **AFK Mode** (if time permits)

**Why:**
- You know exactly what needs to change
- Story is crystal clear ("Change error message from X to Y")
- Low risk, familiar code area
- ARCUS has proven pattern recognition in this repo

**Command:**
```
run afk on bug-fix-story.md
```

**Fallback:** Use gated if you might be interrupted

---

### Scenario 3: Complex Feature, Unclear Requirements

**Situation:** Adding new authentication flow, some details TBD

**Recommendation:** **Gated Mode**

**Why:**
- Ambiguities need resolution (interactive dialogue helps)
- Review `plan.md` before implementation starts
- Verify test coverage before code is written
- High-risk area (authentication)

**Command:**
```
solution-architect auth-feature-story.md
```

---

### Scenario 4: Well-Defined Feature, Tight Deadline

**Situation:** Clear spec, familiar domain, need it done today

**Recommendation:** **AFK Mode** if story quality is high, else **Gated**

**Why:**
- Speed matters (AFK saves 10-15 min on handoffs)
- BUT: Only if spec is genuinely unambiguous
- Bad spec + AFK = wasted time fixing wrong implementation

**Decision point:** Review your story:
- Clear acceptance criteria? → AFK candidate
- Any "TBD" or vague language? → Gated (dialogue will save time)

**Command if clear:**
```
run afk on feature-story.md
```

---

## Switching Modes Mid-Pipeline

**Can I switch from gated to AFK mid-pipeline?**  
No, mode is set at pipeline start and persists through all stages.

**Can I switch from AFK to gated?**  
No, AFK runs to completion without pauses.

**Workaround:** Pause at next gate (gated only), restart with different mode if needed.

---

## Common Mistakes

### ❌ Using AFK for First Story
**Problem:** ARCUS hasn't learned your patterns yet  
**Result:** May miss conventions, generate non-idiomatic code  
**Fix:** Use gated mode for first 2-3 stories, then switch to AFK

### ❌ Using Gated When Unavailable
**Problem:** Start gated mode, then get interrupted and don't return for days  
**Result:** Context is stale, hard to remember where you were  
**Fix:** Use AFK if you can't commit to reviewing gates promptly, or use `where am I?` to resume

### ❌ Using AFK with Vague Story
**Problem:** Spec has ambiguities, AFK auto-resolves incorrectly  
**Result:** Implementation doesn't match intent, requires rework  
**Fix:** Use gated dialogue to clarify ambiguities first

### ❌ Expecting AFK to Pause
**Problem:** Start AFK mode, realize you need to intervene  
**Result:** Can't pause (no gates), have to let it complete or abort  
**Fix:** Only use AFK when you're truly hands-off

---

## Mode Selection Checklist

Before running `solution-architect story.md`, ask yourself:

**Gated Mode if ANY of these are true:**
- [ ] First 1-3 stories in this repo
- [ ] Story has any ambiguities or unknowns
- [ ] I want to review each stage before proceeding
- [ ] I might need to pause and resume later
- [ ] I'm learning ARCUS or exploring workflows
- [ ] High-risk change (security, performance, core logic)

**AFK Mode if ALL of these are true:**
- [ ] Story is 100% clear and unambiguous
- [ ] I trust ARCUS patterns in this repo (not first story)
- [ ] I can dedicate 30-90 min uninterrupted
- [ ] I don't need to review intermediate artifacts
- [ ] Low-to-medium risk change
- [ ] I've used ARCUS successfully here before

**When in doubt:** Use **Gated Mode** (default, safe)

---

## What's Next?

- **Understand the stages:** Ask "explain the pipeline"
- **See all commands:** Ask "command reference"
- **Check your setup:** Ask "getting started"
- **Get help:** Ask "troubleshooting"
