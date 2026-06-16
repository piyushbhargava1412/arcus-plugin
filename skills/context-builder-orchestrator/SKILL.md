---
name: context-builder-orchestrator
description: >
  Orchestrator meta-skill that bootstraps shared repository context by dispatching
  isolated subagents for repository scanning, flow discovery, and test pattern extraction.
  Parallelizes independent stages for efficiency. Use when user says "build context",
  "initialize context", "generate shared context", or "bootstrap the .context folder".
metadata:
  version: "1.0.0"
  team: krill
  type:
    - orchestrator
    - meta-skill
---

# Context Builder Orchestrator (Meta-Skill)

## Intent Detection

Activate this orchestration pipeline when the user's message matches ANY of:
- "build context" / "build shared context"
- "initialize context" / "init context"
- "generate context" / "generate shared context"
- "bootstrap context" / "bootstrap .context"
- "create repository context"
- "scan this repo" / "scan the repository"

When activated, follow the **Execution Pipeline** below.

## Key Principles

- **Subagent Isolation**: Each stage dispatches a fresh subagent with scoped context. The orchestrator stays lean — dispatch, verify output, proceed.
- **Parallelization**: Stages that share no dependency run in parallel (Stage 2a and 2b).
- **Model Strategy**: Resolve model tier via `.github/skills/shared/model-strategy.md` for each subagent.
- **Evidence-Based**: All outputs are grounded in actual repository evidence. No speculation.
- **Template Adherence**: Subagents MUST follow the templates defined in their respective skill's `assets/` folder.

## Prerequisites

The orchestrator MUST be invoked from the root of a git repository with the skills folder present (`.github/skills/` or the workspace's skills directory).

## Overwrite Guardrail

Before executing, check if `.context/` exists and contains files:
- If YES: Ask the user — "Shared context already exists in `.context/`. Rebuild from scratch? (y/N)"
- If user declines: Stop. Output `[Context] No changes made.`
- If user confirms or `.context/` does not exist: Proceed with the pipeline.

## Stdout Output

Your chat response MUST contain ONLY these milestone lines:
```
[Context] Starting repository context build...
[Stage 1] Repository context: complete (repo_scope.md, repo_map.md)
[Stage 2] Flow discovery: complete (<N> flows)
[Stage 2] Test patterns: complete (testing-patterns.md)
[Context] Done. Artifacts in .context/
```

**FORBIDDEN in chat**: Narrative, explanations, "Let me...", "Now I'll...", step-by-step commentary.

## Execution Pipeline

### Stage 1: Build Repository Context (Sequential — must complete before Stage 2)

**Purpose**: Produce `.context/repo_scope.md` and `.context/repo_map.md`.

1. Ensure `.context/` directory exists.
2. Read the subagent prompt template at `.github/skills/context-builder-orchestrator/assets/repo-context-prompt.md`.
3. Dispatch a subagent:
   - **Prompt**: The template content (it references the `repository-context-builder` skill internally)
   - **Description**: `"Context: repository-context-builder"`
   - **Model**: Resolve complexity `heavy` via `.github/skills/shared/model-strategy.md`
4. **Verify**: Confirm both `.context/repo_scope.md` and `.context/repo_map.md` exist and are non-empty.
   - If missing: Report `[ERROR] Stage 1 failed: missing output files` and STOP.
5. **Output**: `[Stage 1] Repository context: complete (repo_scope.md, repo_map.md)`

### Stage 2: Parallel Discovery (depends on Stage 1 outputs)

After Stage 1 completes successfully, read the contents of `.context/repo_scope.md` and `.context/repo_map.md`. These will be injected into Stage 2 subagent prompts.

Dispatch **both** subagents in parallel:

#### Stage 2a: Flow Discovery

1. Read the subagent prompt template at `.github/skills/context-builder-orchestrator/assets/flow-discovery-prompt.md`.
2. Inject the contents of `repo_scope.md` and `repo_map.md` into the template's designated placeholders.
3. Dispatch a subagent:
   - **Prompt**: The populated template
   - **Description**: `"Context: flow-and-scope-discovery"`
   - **Model**: Resolve complexity `heavy` via `.github/skills/shared/model-strategy.md`
4. **Verify**: Confirm `.context/flows/` directory exists and contains at least one `.md` file.
   - If empty: Report `[WARN] No flows discovered — repository may lack clear entry surfaces.`

#### Stage 2b: Test Pattern Discovery

1. Read the subagent prompt template at `.github/skills/context-builder-orchestrator/assets/test-pattern-prompt.md`.
2. Inject the contents of `repo_scope.md` and `repo_map.md` into the template's designated placeholders.
3. Dispatch a subagent:
   - **Prompt**: The populated template
   - **Description**: `"Context: test-pattern-discovery"`
   - **Model**: Resolve complexity `medium` via `.github/skills/shared/model-strategy.md`
4. **Verify**: Confirm `.context/testing-patterns.md` exists and is non-empty.
   - If missing: Report `[WARN] Test patterns not generated — no test files detected.`

### Stage 2 Completion

Wait for both subagents to return before producing output:
- `[Stage 2] Flow discovery: complete (<N> flows)` — where N = count of `.md` files in `.context/flows/`
- `[Stage 2] Test patterns: complete (testing-patterns.md)`

## Error Handling

- If a subagent produces no output: Retry **once** with the same prompt. If still failing, report the specific failure and STOP (for Stage 1) or WARN (for Stage 2).
- If the skills folder cannot be located: Report `[ERROR] Skills directory not found. Is Agent-Forge installed?` and STOP.
- If not in a git repository: Report `[ERROR] Must be run from root of a git repository.` and STOP.
- Do NOT proceed to Stage 2 if Stage 1 failed.

## Expected Output

After successful execution, the repository must contain:
- `.context/repo_scope.md`
- `.context/repo_map.md`
- `.context/flows/*.md` (one per discovered flow)
- `.context/testing-patterns.md`

## Completion

Output only:
```
[Context] Done. Artifacts in .context/
```

Followed by a brief summary:
- repo_scope.md: created/refreshed
- repo_map.md: created/refreshed
- flows: <N> files
- testing-patterns.md: created/refreshed
