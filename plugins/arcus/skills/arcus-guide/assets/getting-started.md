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

**Command to run (`gated` mode, default):**
```
arcus path/to/story.md
```

Or use the planning alias:
```
plan path/to/story.md
```

**What happens:** ARCUS walks an ordered Spec → Code → PR pipeline:

1. **scaffold** — Creates `.arcus/specs/[STORY-ID]/`, copies the story, and inits the
   checkpoint (recording the *planned* branch name). **No git branch is created yet.**
2. **context_pack** — Builds story-specific context → `context-pack.md`
3. **spec_finalizer** — Resolves ambiguities → `grounded-spec.md`
4. **plan** — Captures design deliberation and decomposes into atomic tasks → `plan.md`
5. **test_plan** — Designs the test matrix → `test-plan.md`
6. **branch** — **Creates the git branch `arcus/[STORY-ID]` now**, at the start of
   Implementation (bumps the name on collision)
7. **task_1..N** — Implements each task → committed code + tests
8. **code_review** — Holistic two-tier quality gate → `review.md`
9. **context_sync** — On approval, reconciles only the `.context/` artifacts the diff materially
   drifted (no new artifact; rationale in the sync commit), then auto-continues
10. **closure** — Creates the pull request

**Default mode:** **`gated`** — the `arcus-controller` orchestrator stops for Brainstorm open
questions and, optionally, at configurable phase boundaries.

**Your role:**
- Review artifacts at each handoff
- Say **"yes"** / **"proceed"** to advance to the next stage
- Say **"no"** to pause and return later (resume with that stage's phrase)

**Duration:** 30-90 minutes of active time (can be spread over hours/days)

---

## Quick Decision: Which of the Three Modes?

ARCUS runs the same pipeline in one of **three modes** — `gated`, `intelligent`, `afk` — all driven
by the same `arcus-controller` orchestrator:

**Use `gated` Mode (default) if:**
- ✅ First time using ARCUS in this repository
- ✅ Story has ambiguities or unknowns
- ✅ High-risk or complex changes
- ✅ Want to learn how ARCUS works
- ✅ Need to pause and resume across sessions

**Use `intelligent` Mode if:**
- ✅ Running in cloud/CI (this is automatic — every cloud run scaffolds `--mode intelligent`)
- ✅ Locally: you want the open-questions gate without any phase-boundary pauses

**Use `afk` Mode (autonomous) if:**
- ✅ High-confidence, well-defined story
- ✅ Familiar codebase and domain
- ✅ Simple feature or bug fix
- ✅ Can dedicate 30-90 minutes uninterrupted

**To use `intelligent` mode**:
```
arcus path/to/story.md --intelligent
```

**To use `afk` mode**:
```
run afk on path/to/story.md
forge path/to/story.md
afk path/to/story.md
arcus path/to/story.md --afk
```

### `.arcus/config.json`: choosing where `gated` pauses

`gated` mode's phase-boundary gates default to pausing after **all three** transitions
(`test_plan`, `implementation`, `code_review`). If you want fewer stops, create an optional,
developer-authored, **gitignored** `.arcus/config.json` at the repo root **before** scaffolding:

```json
{ "stop_after": ["test_plan", "code_review"] }
```

Only the three keys above are valid, and the file only ever **narrows** the default set — it never
adds a fourth gate or reorders them. It's read once, at scaffold time, for `gated` mode only —
never on `resume <STORY>`, and never for `intelligent`/`afk`. If the file is missing, malformed, or
contains unknown keys, `gated` falls back to (or drops just the bad entries from) the built-in
default — it never hard-fails a scaffold.

---

## Interactive Setup Assistance

{SETUP_OFFER}

---

## Next Steps

1. **If .context/ is ready:** Write your first story and run `arcus story.md` or `plan story.md`
2. **If .context/ is missing:** Run `agentify this repo` now
3. **Need help deciding?** Ask: "Should I use gated, intelligent, or afk mode?"
4. **Want to understand more?** Ask: "Explain the pipeline"

---

**💡 Pro Tips:**
- Your first story should use **`gated` mode** to learn the workflow
- Keep stories focused and atomic (one feature or fix per story)
- Answer the open questions carefully — they are your one chance to steer before code is written
- You can pause anytime and resume later (`gated` mode's phase-boundary gates only; open-question
  pauses work the same way in `intelligent` too)
- Check status anytime with: **"where am I?"**
