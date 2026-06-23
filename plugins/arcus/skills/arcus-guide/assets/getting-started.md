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
- Captures design & coding patterns → `design-and-coding-patterns.md`
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

**Command to run (interactive mode, default):**
```
implement path/to/story.md
```

Or use the planning alias:
```
plan path/to/story.md
```

**What happens:** ARCUS walks an ordered Spec → Code → PR pipeline:

1. **scaffold** — Creates `.arcus/specs/[STORY-ID]/`, copies the story, and inits the
   checkpoint (recording the *planned* branch name). **No git branch is created yet.**
2. **context_pack** — Builds story-specific context → `context-pack.md`
3. **spec_finalizer** — Resolves ambiguities → consolidated `plan.md`
4. **blueprint** — Decomposes into atomic tasks → `blueprint.md`
5. **test_plan** — Designs the test matrix → `test-plan.md`
6. **branch** — **Creates the git branch `arcus/[STORY-ID]` now**, at the start of
   Implementation (bumps the name on collision)
7. **task_1..N** — Implements each task → committed code + tests
8. **code_review** — Holistic two-tier quality gate → `review.md`
9. **context_sync** — On approval, reconciles only the `.context/` artifacts the diff materially
   drifted (no new artifact; rationale in the sync commit), then auto-continues
10. **closure** — Creates the pull request

**Default mode:** **Interactive** — the `arcus-controller` orchestrator runs in interactive mode, pausing between stages for your review.

**Your role:**
- Review artifacts at each handoff
- Say **"yes"** / **"proceed"** to advance to the next stage
- Say **"no"** to pause and return later (resume with that stage's phrase)

**Duration:** 30-90 minutes of active time (can be spread over hours/days)

---

## Quick Decision: Interactive or Autonomous Mode?

**Use Interactive Mode (default) if:**
- ✅ First time using ARCUS in this repository
- ✅ Story has ambiguities or unknowns
- ✅ High-risk or complex changes
- ✅ Want to learn how ARCUS works
- ✅ Need to pause and resume across sessions

**Use Autonomous Mode (afk) if:**
- ✅ High-confidence, well-defined story
- ✅ Familiar codebase and domain
- ✅ Simple feature or bug fix
- ✅ Can dedicate 30-90 minutes uninterrupted

**To use autonomous mode**:
```
run afk on path/to/story.md
forge path/to/story.md
afk path/to/story.md
```

---

## Interactive Setup Assistance

{SETUP_OFFER}

---

## Next Steps

1. **If .context/ is ready:** Write your first story and run `implement story.md` or `plan story.md`
2. **If .context/ is missing:** Run `agentify this repo` now
3. **Need help deciding?** Ask: "Should I use interactive or autonomous mode?"
4. **Want to understand more?** Ask: "Explain the pipeline"

---

**💡 Pro Tips:**
- Your first story should use **interactive mode** to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Review artifacts at each gate before proceeding
- You can pause anytime and resume later (interactive mode only)
- Check status anytime with: **"where am I?"**
