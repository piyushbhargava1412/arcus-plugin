---
name: subagent-task-dispatcher
description: >
  Protocol for dispatching implementation tasks to isolated subagents. Each subagent
  receives scoped context (single task + relevant tests + constraints) to prevent
  token bleed between tasks. Used by the afk-skill-router orchestrator during the
  Code stage.
metadata:
  version: "2.0.0"
  team: krill
  type:
    - orchestrator
    - protocol
---

# Subagent Task Dispatcher

## Overview

Defines the protocol for the orchestrator to dispatch individual implementation tasks to fresh subagents. Each subagent operates in isolation with only the context it needs — preventing token accumulation and context drift across a multi-task story.

## When to Use

The orchestrator (afk-skill-router) invokes this protocol during **Stage 3: Implementation** when it needs to execute tasks from the blueprint sequentially via subagents.

## Dispatch Protocol

### Step 1: Extract Task Context

For task N from `blueprint.md`, extract:

1. **Task definition**: The full `### Task N:` section (description, files to modify, DoD)
2. **Relevant test cases**: From `test-plan.md`, extract only the test cases mapped to Task N
3. **Constraints**: From `assumptions.md`, extract only the decisions relevant to this task's domain
4. **Prior task outcomes** (if any): Summary of what tasks 1..N-1 produced (file list only, not full content)

### Step 2: Build Subagent Prompt

Use the template at `assets/task-prompt-template.md` to construct the subagent prompt. The prompt includes:

- Repository context (from `context-pack.md` — architecture section only, not full flows)
- The specific task to implement
- Test cases that must pass
- Constraints and decisions that apply
- Expected output format

### Step 3: Dispatch

Resolve the task's model before dispatching:
1. Read the `complexity` field from the task definition (e.g., `heavy`, `medium`, `light`). If missing, default to `medium`.
2. Look up the complexity-to-model mapping in the `agent-forge:model-strategy` skill to get the model tier.
3. Look up the tier-to-platform mapping in the same file to get the platform model string.

Invoke the subagent using `runSubagent` with:
- **prompt**: The constructed prompt from Step 2
- **description**: `"Task N: <short task title>"`
- **model**: The resolved platform model string (e.g., `"Claude Sonnet 4.6 (copilot)"`)

### Step 4: Handle Response

The subagent returns one of three statuses:

| Status | Meaning | Orchestrator Action |
|--------|---------|-------------------|
| `DONE` | Task complete, tests passing | Commit changes, proceed to Task N+1 |
| `BLOCKED` | Cannot proceed — missing info or unresolvable conflict | Log to stdout, attempt once with additional context, then stop pipeline if still blocked |
| `NEEDS_CONTEXT` | Requires information not in the scoped context | Orchestrator provides the requested file/section, re-dispatches |

### Step 5: Verify & Commit

After a `DONE` response:
1. Confirm the `TDD_EVIDENCE` line shows a RED step (a test that failed first) followed by GREEN. If the implementer skipped the failing-test step, re-dispatch requiring proper TDD.
2. Run the test suite to confirm tests actually pass
3. Use `get_errors` on modified files to check for lint/compile issues
4. If verification passes: proceed to Step 6 (Review)
5. If verification fails: re-dispatch implementer subagent with error output as additional context (max 2 retries)

### Step 6: Review (Two-Pass)

After verification passes, run a two-pass review before committing:

**Pass 1 — Spec Compliance:**
1. Dispatch a reviewer subagent:
   - **Prompt**: Include the full task requirements (from blueprint), the implementer's status report (FILES_MODIFIED, TESTS_PASSING, NOTES), and the instruction: "Read and follow the `agent-forge:spec-compliance-reviewer` skill. Review Task N."
   - **Description**: `"Review: spec-compliance Task N"`
   - **Model**: Resolve complexity `medium` via the `agent-forge:model-strategy` skill
2. Read the VERDICT:
   - `PASS` → proceed to Pass 2
   - `FAIL` → re-dispatch the implementer subagent with the ISSUES list as additional context. After fix, re-run Pass 1. Max 2 attempts.

**Pass 2 — Code Quality:**
1. Dispatch a reviewer subagent:
   - **Prompt**: Include the list of modified files, relevant architecture patterns from `context-pack.md`, and the instruction: "Read and follow the `agent-forge:code-quality-reviewer` skill. Review Task N."
   - **Description**: `"Review: code-quality Task N"`
   - **Model**: Resolve complexity `medium` via the `agent-forge:model-strategy` skill
2. Read the VERDICT:
   - `PASS` → proceed to Step 7 (Commit)
   - `FAIL` → re-dispatch the implementer subagent with the ISSUES list as additional context. After fix, re-run Pass 2 only (spec already passed). Max 2 attempts.

**If either review fails after 2 retry attempts**: Commit anyway with a note in the commit message: `"Task N: <desc> [review: unresolved]"`. Do not block the pipeline indefinitely.

### Step 7: Commit

After reviews pass (or retry limit reached):
- Commit via `.aforge/bin/commit.sh <STORY_ID> <COMMIT_MESSAGE>`

## Context Scoping Rules

**DO include in subagent prompt:**
- The specific task definition from blueprint
- Mapped test cases from test-plan
- Relevant decisions from assumptions.md
- Architecture overview (brief) from context-pack
- List of files modified by prior tasks (so subagent doesn't conflict)

**DO NOT include in subagent prompt:**
- Full content of prior tasks' code changes
- Unrelated test cases
- Full flow documentation (only the relevant flow)
- Other tasks' definitions

## Retry Protocol

- **Implementation retries**: Max 2 retries per task (Step 4 BLOCKED/verification failures)
- **Review retries**: Max 2 retries per review pass (spec-compliance or code-quality)
- Each retry includes the error/issue output from the previous attempt
- **Escalation rule**: If implementation fails after 2 retries at the current complexity, promote complexity one level (light → medium → heavy), re-resolve the model via the `agent-forge:model-strategy` skill, and re-dispatch with the higher-tier model. Max 1 escalation per task.
- If implementation fails after escalation: mark as BLOCKED, stop pipeline
- If review fails after 2 retries: commit with `[review: unresolved]` tag, continue pipeline

## Success Criteria

- Each subagent starts with < 30% of total story context (scoped, not full)
- No token bleed between task executions
- Each task is independently verifiable (tests pass after each dispatch)
