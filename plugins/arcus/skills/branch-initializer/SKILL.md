---
name: branch-initializer
description: Initialize the workspace for a new story by setting up git branches and creating the specification directory. Use when starting a new task or story. Trigger on "initialize workspace", "start story", or "prepare git branch".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - agents
    - infrastructure
---

# Branch Initializer

## Key Rules
- **NO GIT COMMITS**: Do not perform any `git commit` operations. The orchestrator will handle the consolidated commit at the end of the workflow.
- **Story-Isolation**: Never modify the target branch directly; always create and work on the isolation branch.

## Overview
Prepares the environment for an "Away From Keyboard" agentic development run. It ensures the workspace is clean, creates a dedicated feature branch, and scaffolds the artifact directory where all subsequent skills will store their findings.

## Workflow

### Step 1: Identity (INPUT)
- The `branch-initializer` expects a `STORY_ID` to be provided by the caller. It SHOULD NOT attempt to perform story-id extraction itself.
- Input contract: the orchestrator or caller MUST provide `STORY_ID` (for example: `STORY_ID: CATFISH-2895`) before invoking this skill.
- Format the branch name as `arcus/[STORY-ID]`.

### Step 2: Workspace Scaffolding
- Create the specification directory: `.arcus/specs/[STORY-ID]/`.
- If the full story text was provided, write it to `.arcus/specs/[STORY-ID]/story.md`.

### Step 3: Git Preparation
- Run `git status` to ensure there are no uncommitted changes in the base branch.
- Create and switch to the new feature branch:
  `git checkout -b arcus/[STORY-ID]`
- If the branch already exists, switch to it: `git checkout arcus/[STORY-ID]`.

### Step 4: Verification
- Confirm the directory exists and the branch is active.

## Success Criteria
- **Clean State**: Workflow starts from a known base (main/develop).
- **Isolated**: All work is performed on a unique branch.
- **Bootstrapped**: The `.arcus/specs/` folder is ready for the `context-pack-builder`.

## Safety Rules
- Do NOT force checkout if there are uncommitted local changes that might be lost. Ask the user to stash or commit first.
