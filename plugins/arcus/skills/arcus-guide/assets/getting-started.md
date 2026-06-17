# 🚀 Getting Started with ARCUS

Welcome! Let's get you up and running with ARCUS in three simple phases.

---

## Pre-Flight Checklist

Let me check your repository setup:

{SETUP_STATUS}

---

## Three-Phase Quickstart

### Phase 1: Agentify Your Repo 🔧

**What it does:** Scans your repository to build the shared context snapshot (`.context/` directory)

**Command to run:**
```
agentify this repo
```

Or alternatives:
```
wire me up
generate context
```

**What happens:**
- Analyzes repository structure → `repo_scope.md` and `repo_map.md`
- Discovers business flows → `flows/*.md` files
- Captures test patterns → `testing-patterns.md`
- Generates `AGENTS.md` navigation index
- Creates `CLAUDE.md` to import it

**Expected output:** `.context/` directory populated with all artifacts

**Duration:** 5-15 minutes depending on repository size

**When to re-run:** After major codebase restructuring or tech stack changes

---

### Phase 2: Write Your Story 📝

**Where:** Create a `story.md` file anywhere in your repository

**What to include:**
- Clear problem statement
- Measurable acceptance criteria  
- Technical constraints (if any)
- Example scenarios

**Checklist for Good Stories:**
- [ ] Clear problem statement (what needs to change and why)
- [ ] Measurable success criteria (how do we know it's done)
- [ ] Technical constraints listed (required architecture, frameworks, patterns)
- [ ] Example scenarios or user flows described

**Example story structure:**
```markdown
# User Story: Add Email Validation

## Problem
Currently, user registration accepts invalid email addresses,
causing bounce rates and poor data quality.

## Acceptance Criteria
- Email validation on registration form
- Validation feedback shown inline
- Invalid emails rejected before submission
- Existing validation errors displayed on page load

## Constraints
- Must use existing Validator utility
- Follow form validation patterns in auth flows
- Maintain accessibility (ARIA labels)

## Examples
- Valid: user@example.com → accepts
- Invalid: user@example → shows error "Invalid email format"
- Invalid: @example.com → shows error "Email address required"
```

---

### Phase 3: Run the Pipeline 🎯

**Command to run:**
```
implement path/to/story.md
```

Or alternatives:
```
build path/to/story.md
forge path/to/story.md
```

**What happens:** ARCUS runs a 6-stage SDLC pipeline:

1. **Init** — Creates branch `arcus/[STORY-ID]`, scaffolds workspace
2. **Brainstorm** — Resolves ambiguities and creates implementation plan → `assumptions.md` + `blueprint.md`
3. **Test Plan** — Designs test matrix → `test-plan.md`
4. **Code** — Implements tasks → committed code
5. **Review** — Holistic quality check → `review.md`
6. **Closure** — Creates pull request

**Default mode:** **Gated** (pauses at each handoff gate for your review)

**Your role:**
- Review artifacts at each gate
- Say **"yes"** to proceed to next stage
- Say **"no"** to pause and return later

**Duration:** 30-90 minutes of active time (can be spread over hours/days)

---

## Quick Decision: Gated or AFK Mode?

**Use Gated Mode (default) if:**
- ✅ First time using ARCUS in this repository
- ✅ Story has ambiguities or unknowns
- ✅ High-risk or complex changes
- ✅ Want to learn how ARCUS works
- ✅ Need to pause and resume across sessions

**Use AFK Mode if:**
- ✅ High-confidence, well-defined story
- ✅ Familiar codebase and domain
- ✅ Simple feature or bug fix
- ✅ Can dedicate 30-90 minutes uninterrupted

**To use AFK mode:**
```
run afk on path/to/story.md
implement path/to/story.md --afk
```

---

## Interactive Setup Assistance

{SETUP_OFFER}

---

## Next Steps

1. **If .context/ is ready:** Write your first story and run `implement story.md`
2. **If .context/ is missing:** Run `agentify this repo` now
3. **Need help deciding?** Ask: "Should I use gated or AFK mode?"
4. **Want to understand more?** Ask: "Explain the pipeline"

---

**💡 Pro Tips:**
- Your first story should use **gated mode** to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Review artifacts at each gate before proceeding
- You can pause anytime and resume later (gated mode only)
- Check status anytime with: **"where am I?"**
