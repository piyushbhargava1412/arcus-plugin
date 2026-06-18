---
name: pull-request-builder
description: Finalize the development workflow by summarizing changes and creating a pull request. Use when all tasks in the blueprint are completed and verified. Trigger on "finalize workflow", "create pull request", or "submit changes".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - engineering
---

# Pull Request Builder

## Overview
Acts as the "Final Gatekeeper" to wrap up the automated development cycle. It gathers all evidence of work (logs, tests, changed files), synthesizes a high-quality PR description, and handles the submission to the repository platform.

## Workflow

### Step 1: Evidence Gathering
Read the following from `.arcus/specs/[STORY-ID]/`:
1. `story.md`: The original intent.
2. `plan.md`: The tech lead decisions.
3. `blueprint.md`: The plan (to verify all tasks are marked as done).
4. `test-plan.md`: The verification evidence.

### Step 2: Change Summarization
- Use `git diff --stat` to list exactly which files were modified.
- Categorize changes into Features, Fixes, and Tests.
- Draft the PR description using `./assets/pr-template.md`.

### Step 3: Final Artifact Generation
- Run the full test suite one last time on the feature branch.
- Save the final, synthesized PR description to `.arcus/specs/[STORY-ID]/PR_DESCRIPTION.md`.
- Ensure the description includes a high-level summary, the list of changed files, and evidence of successful verification.

## Success Criteria
- **Professional**: PR description is technical, concise, and accurate.
- **Complete**: All story requirements are mapped to PR features.
- **Clean**: No debugging code or excessive comments are left behind.
- **Artifact-Ready**: The file `PR_DESCRIPTION.md` exists in the workspace.

## Resources
- **PR Template**: `./assets/pr-template.md`

