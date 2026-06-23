# 🔧 Troubleshooting

Self-service solutions for common ARCUS issues

---

## Issue: Stage stuck / not progressing

**Symptoms:** Pipeline seems frozen, no response to commands

**Diagnosis:**
1. Check `.arcus/session-checkpoint.json` to see current stage
2. Look for stage status: `in_progress`, `awaiting_handoff`, or `pending`
3. Check terminal for any error messages

**Solutions:**

**If status is `awaiting_handoff`:**
- Say `"yes"` to proceed to next stage
- Or say `"no"` to pause and review artifacts

**If status is `in_progress`:**
- Stage may still be running (complex tasks take time)
- Wait for completion message
- Check terminal output for progress

**If status is corrupted:**
- Manually edit `.arcus/session-checkpoint.json`
- Set stage status back to `pending` or `complete`
- Resume with the stage's explicit phrase (e.g., `"implement story.md"`)

**Recovery commands (interactive mode resume phrases):**
```
# Check current status
where am I?

# Resume a specific stage if needed
implement story.md                      # Full pipeline (interactive)
plan story.md                           # Alternative for full pipeline
generate test plan for story.md         # Test plan
review story.md                         # Code review
create pull request for story.md        # Closure
```

---

## Issue: Spec finalizer keeps asking same questions

**Symptoms:** The `spec_finalizer` dialogue loops, similar questions repeated, feels circular

**Root Cause:** Original story lacks clarity or has circular dependencies

**Diagnosis:**
1. Pause pipeline: Say `"no"` at next gate
2. Review `.arcus/specs/[ID]/story.md`
3. Look for vague language, missing details, contradictions

**Solutions:**

**1. Improve your story file:**
- Add clear problem statement
- Define measurable acceptance criteria
- List explicit constraints
- Provide example scenarios
- Remove ambiguous language ("maybe", "if possible", "TBD")

**2. Restart planning:**
```
implement story.md
```

**Story quality checklist:**
- [ ] Problem is clearly stated
- [ ] Success criteria are measurable
- [ ] Technical constraints are explicit
- [ ] No "TBD" or "maybe" language
- [ ] Examples provided where helpful

---

## Issue: Tests failing during Implementation

**Symptoms:** Task marked complete but tests don't pass

**Diagnosis:**
1. Check terminal output for test failure details
2. Run tests manually to see full error messages
3. Review `test-plan.md` to verify expected behavior

**Solutions:**

**1. Run tests manually:**
Check `.context/testing-patterns.md` for test execution commands:
```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # E2E tests
```

**2. Review test-plan.md:**
- Ensure tests align with implementation
- Check if expectations are correct
- Verify test cases are realistic

**3. Don't defer to `code_review` — the gate will block:**
- The `code_review` deterministic gate runs the **full test suite** over the whole branch before any semantic review
- A failing test there is a hard block (`critical`) that returns `changes_requested` immediately
- So fix failures now rather than carrying them forward

**4. Manual fix if critical:**
- Edit code to fix failing tests
- Re-run tests to verify
- Say `"continue"` to proceed

**5. Check for environment issues:**
- Dependencies installed?
- Database migrations run?
- Environment variables set?
- Test database configured?

---

## Issue: Review loop won't exit

**Symptoms:** `code_review` keeps returning `changes_requested`, cycling back into the task loop repeatedly

**Root Cause:** Review loop is bounded to 3 rounds maximum to prevent infinite loops

**Diagnosis:**
1. Check `review.md` for persistent critical issues
2. **Identify which tier is blocking** — the report's *Deterministic Gate* table shows which tooling check (typecheck/tests/build/secret) failed, separate from the semantic findings below it
3. Check `.arcus/session-checkpoint.json` for `review_round` count
4. Identify if issues are genuine or false positives

**First, split by tier:**
- **Tier 1 (deterministic gate) failures** are objective — the repo's own tooling failed. These are almost never false positives; the code genuinely doesn't compile, a test fails, the build breaks, or a secret was detected. Fix the concrete breakage; you can't override these by judgment.
- **Tier 2 (semantic) findings** are judgment calls and *can* be over-strict. The override advice below applies to these.

**Solutions:**

**If round < 3:**
- Address critical issues in review findings
- Let loop continue (it's working as designed)
- Focus on **critical** severity items first

**If round = 3 (max reached):**
- Manual intervention required
- Review findings in `.arcus/specs/[ID]/review.md`
- Assess if critical issues are genuine
- Options:
  1. Fix critical issues manually and resume closure: `"create pull request for story.md"`
  2. Accept the code as-is (override the semantic verdict)
  3. Restart implementation: `"implement story.md"`

**If findings are false positives:**
- Review findings may be overly strict
- Use your judgment to override
- Resume closure: `"create pull request for story.md"`

---

## Issue: Checkpoint corrupted or inconsistent

**Symptoms:** Pipeline state doesn't match reality, stages out of order, impossible state

**Diagnosis:**
1. Inspect `.arcus/session-checkpoint.json`
2. Check for impossible states:
   - `closure` complete but no PR exists
   - `task_*` pending but code was committed
   - Negative review_round
3. Check for syntax errors in JSON

**Solutions:**

**1. Soft reset (edit checkpoint):**
```bash
# Open checkpoint file
code .arcus/session-checkpoint.json

# Set current_stage to last known good stage
# Set stage status to appropriate value
# Save and retry
```

**2. Hard reset (delete and restart):**
```bash
# Delete corrupted workspace
rm -rf .arcus/specs/[STORY-ID]/

# Restart from the scaffold stage
implement story.md
```

**3. Manual checkpoint repair:**
```json
{
  "story_id": "STORY-123",
  "mode": "interactive",
  "branch_name": "arcus/STORY-123",
  "base_branch": "main",
  "stages": {
    "scaffold":       {"status": "complete"},
    "context_pack":   {"status": "pending"},
    "spec_finalizer": {"status": "pending"},
    "blueprint":      {"status": "pending"},
    "test_plan":      {"status": "pending"},
    "branch":         {"status": "pending"},
    "task_1":         {"status": "pending"},
    "code_review":    {"status": "pending"},
    "closure":        {"status": "pending"}
  },
  "review_round": 0,
  "last_updated": "2026-06-18T10:30:00Z"
}
```

---

## Issue: Context feels stale or inaccurate

**Symptoms:** ARCUS references outdated files, misses new patterns, generates code inconsistent with current codebase

**Root Cause:** `.context/` was created before significant codebase changes

**Diagnosis:**
1. Check `.context/repo_scope.md` for verification commit hash
2. Compare with current HEAD
3. Review flows and patterns for staleness

**Solutions:**

**1. Full context refresh:**
```
agentify this repo
```
This overwrites all `.context/` files with fresh analysis.

**2. Selective refresh (faster):**

Refresh flows only:
```
discover and persist flows
```

Refresh test patterns only:
```
discover and persist testing patterns
```

Refresh structure only:
```
build shared repository context
```

**When to refresh:**
- After major refactoring
- After adding new frameworks or libraries
- After restructuring directories
- After changing test frameworks
- When ARCUS generates outdated patterns

---

## Issue: .arcus/ directory not found

**Symptoms:** Pipeline commands fail with "no checkpoint found", "workspace not initialized"

**Root Cause:** Bootstrap didn't run, or `.arcus/` was accidentally deleted

**Diagnosis:**
1. Check if `.arcus/` exists: `ls -la .arcus/`
2. Check if `.arcus/` is in `.gitignore` (it should be)
3. Check file system permissions

**Solutions:**

**1. Reinitialize workspace:**
```
implement story.md
```
This triggers the `scaffold` stage (`scaffold.sh`), which creates `.arcus/`.

**2. Check .gitignore:**
```bash
# .arcus/ should be git-ignored
echo ".arcus/" >> .gitignore
```

**3. Check permissions:**
```bash
# Ensure you have write permissions
ls -ld .
```

**4. If persists, check session bootstrap:**
- Session start hook should run `scripts/bootstrap.sh`
- This stages `.arcus/bin/` scripts
- Check if plugin is properly installed

---

## Issue: Can't find my story artifacts

**Symptoms:** Can't locate `plan.md`, `blueprint.md`, `test-plan.md`, etc.

**Diagnosis:**
- Story artifacts live in `.arcus/specs/[STORY-ID]/`
- Story ID is extracted from filename or first header in story.md
- May have wrong story ID expectation

**Solutions:**

**1. Find your story ID:**
```bash
# Check checkpoint for story_id
cat .arcus/session-checkpoint.json | grep story_id
```

**2. Navigate to story workspace:**
```bash
cd .arcus/specs/[STORY-ID]
```

**3. List all artifacts:**
```bash
ls -la .arcus/specs/[STORY-ID]/
```

**4. If story ID is unclear:**
```bash
# List all story workspaces
ls -la .arcus/specs/
```

**5. Check current pipeline:**
```
where am I?
```
This shows active story ID and current stage.

---

## Issue: Subagent task failing repeatedly

**Symptoms:** Same task fails during Implementation across multiple attempts

**Diagnosis:**
1. Check if task definition in `blueprint.md` is clear
2. Check if task has conflicting constraints in `plan.md`
3. Review task complexity (might be too heavy)
4. Check if dependent tasks completed successfully

**Solutions:**

**1. Pause and refine blueprint:**
```
# Pause at next gate
no

# Edit blueprint
code .arcus/specs/[STORY-ID]/blueprint.md

# Clarify task description
# Split into smaller tasks if too complex
# Verify Definition of Done is clear

# Resume
yes
```

**2. Check `plan.md`:**
- Verify constraints don't conflict
- Ensure patterns referenced actually exist in codebase
- Check if architecture decision is feasible

**3. Simplify task:**
- Break heavy tasks into medium/light subtasks
- Remove ambiguous requirements
- Add explicit examples

---

## Issue: Autonomous mode started but I want to intervene

**Symptoms:** Autonomous mode running, realized spec has issues, need to pause

**Root Cause:** Autonomous mode has no handoff gates (by design)

**Solutions:**

**Option 1: Let it complete**
- Autonomous mode will run to completion
- Review outputs after it finishes
- Fix issues in a follow-up story or manual edits

**Option 2: Abort and restart (drastic)**
- Interrupt the session (Ctrl+C if applicable)
- Delete `.arcus/specs/[STORY-ID]/`
- Fix story file
- Restart in interactive mode: `implement story.md`

**Prevention:**
- Only use autonomous mode when spec is solid
- Use interactive mode if any uncertainty
- Review story quality before starting autonomous mode

---

## Issue: Git conflicts during pipeline

**Symptoms:** Implementation or closure fails due to git conflicts

**Root Cause:** Base branch moved while pipeline was running

**Solutions:**

**1. Resolve conflicts manually:**
```bash
# Update base branch
git fetch origin main

# Rebase feature branch
git checkout arcus/[STORY-ID]
git rebase origin/main

# Resolve conflicts
# ... edit conflicted files ...
git add .
git rebase --continue
```

**2. Resume pipeline:**
```
# Check where you were
where am I?

# Continue from last stage
yes
```

**Prevention:**
- Run pipeline on stable base branch
- Coordinate with team to avoid concurrent changes to same files
- Use feature flags for long-running stories

---

## Issue: PR creation fails (closure stage)

**Symptoms:** The `closure` stage completes but PR not created

**Root Cause:** Usually `gh` CLI not configured

**Diagnosis:**
1. Check if `gh` CLI is installed: `gh --version`
2. Check if authenticated: `gh auth status`
3. Check if remote is set: `git remote -v`

**Solutions:**

**1. Install gh CLI:**
```bash
# macOS
brew install gh

# Linux
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Windows
# See: https://github.com/cli/cli/releases
```

**2. Authenticate:**
```bash
gh auth login
```

**3. Create PR manually:**
```bash
# PR description is in:
cat .arcus/specs/[STORY-ID]/PR_DESCRIPTION.md

# Create PR manually:
gh pr create --title "Your title" --body-file .arcus/specs/[STORY-ID]/PR_DESCRIPTION.md
```

**4. Alternative (use GitHub web UI):**
- Push branch: `git push origin arcus/[STORY-ID]`
- Open GitHub in browser
- Use "Compare & pull request" button
- Copy content from `PR_DESCRIPTION.md`

---

## General Troubleshooting Steps

When stuck, try this sequence:

1. **Check status:**
   ```
   where am I?
   ```

2. **Review artifacts:**
   ```bash
   ls -la .arcus/specs/[STORY-ID]/
   cat .arcus/session-checkpoint.json
   ```

3. **Check for errors:**
   - Review terminal output
   - Check for error messages
   - Look for stack traces

4. **Try recovery commands:**
   ```
   # Resume current or previous stage (interactive mode resume phrases)
   implement story.md
   plan story.md
   generate test plan for story.md
   review story.md
   create pull request for story.md
   ```

5. **If all else fails, restart:**
   ```bash
   rm -rf .arcus/specs/[STORY-ID]/
   implement story.md
   ```

---

## Getting More Help

If you're still stuck:

1. **Check FAQ:** Ask `"faq"` for quick answers
2. **Review artifacts guide:** Ask `"explain artifacts"`
3. **Understand the pipeline:** Ask `"explain the pipeline"`
4. **Check command reference:** Ask `"command reference"`
5. **Verify setup:** Ask `"getting started"`

---

## Prevention Tips

**Avoid common issues:**
- ✅ Write clear, unambiguous stories
- ✅ Use interactive mode for first 2-3 stories per repo
- ✅ Review artifacts at each gate before proceeding
- ✅ Keep `.context/` fresh (refresh after major changes)
- ✅ Don't manually edit checkpoint unless necessary
- ✅ Commit `.context/` to git for team sharing
- ✅ Don't commit `.arcus/` (it's git-ignored for a reason)
