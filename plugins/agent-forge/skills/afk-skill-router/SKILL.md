---
name: afk-skill-router
description: >
  AFK Orchestrator meta-skill. When the user says
  "implement <STORY>.md" or "build <STORY>.md", this skill activates and autonomously
  orchestrates the full pipeline (Init → Architect → TestGen → Code → Closure) without
  human intervention.
metadata:
  version: "2.0.0"
  team: krill
  type:
    - orchestrator
    - meta-skill
---

# AFK Skill Router (Orchestrator Meta-Skill)

## Intent Detection

Activate this orchestration pipeline when the user's message matches ANY of:
- "implement ..." (followed by a path to a .md file)
- "build ..." (followed by a path to a .md file)
- "execute story ..."
- "run afk on ..."
- "forge ..."

When activated, follow the **Execution Pipeline** below. Do NOT ask clarifying questions. Execute autonomously.

## Key Principles

- **No Human Gates**: Execute all stages autonomously. Never ask questions. Resolve ambiguities using existing skills.
- **Stdout Discipline**: Your chat output is limited to milestone lines only.
- **Deterministic Ops via Scripts**: Use helper scripts for git operations, never reason about branch names or commit messages yourself.
- **Subagent Isolation**: Each reasoning-heavy stage dispatches a fresh subagent with scoped context. This prevents token accumulation across stages. You (the orchestrator) stay lean — dispatch, read response, update state.
- **Checkpoint Awareness**: Before starting, check if `.aforge/specs/[STORY-ID]/session-checkpoint.json` exists. If it does, skip completed stages (any stage marked `true`).

## Stdout Output (STRICTLY ENFORCED)

Your chat response MUST contain ONLY these milestone lines (maximum):
```
[AFK] Story: [STORY-ID]
[Architect] Complete: <N> tasks, <M> decisions
[TestGen] Complete: <N> test cases
[Code] Complete: <N> files changed, <M> tests passing
[Complete] PR deployed: <link>
```

**FORBIDDEN in chat**: Narrative, explanations, "Let me...", "Now I'll...", "Perfect!", step-by-step commentary.

## Helper Scripts

Call these via shell for deterministic operations. The session bootstrap hook stages them into
the active workspace at `.aforge/bin/`. Resolve the script directory in this order and use the
first that exists: `.aforge/bin/` (preferred, staged by the plugin) → `$AFORGE_HOME/scripts/`
(read `AFORGE_HOME` from `.aforge/env`) → `.github/scripts/` (legacy vendored install). The table
below uses the preferred `.aforge/bin/` path.

| Script | Usage | Purpose |
|--------|-------|---------|
| `.aforge/bin/extract_story_id.sh <story.md>` | Outputs `STORY_ID: xxx` | Extract story identifier |
| `.aforge/bin/branch.sh <story-id>` | Creates branch + workspace | Git isolation + scaffold |
| `.aforge/bin/commit.sh <story-id> <message>` | Stages + commits | Conventional commit |
| `.aforge/bin/pr.sh <story-id>` | Push + create PR | Closure |
| `.aforge/bin/checkpoint.sh <action> <story-id> [stage]` | Manage state | read/init/complete |

## Execution Pipeline

### Stage 0: Init

1. **Extract Story ID**: Run `.aforge/bin/extract_story_id.sh <STORY_FILE>` and capture the STORY_ID.
   - If the script is not found, extract the ID from the filename (strip `.md` extension and path).
2. **Check for existing checkpoint**: Run `.aforge/bin/checkpoint.sh read <STORY_ID>`.
   - If checkpoint exists with completed stages, skip to the first incomplete stage.
3. **Create branch + workspace**: Run `.aforge/bin/branch.sh <STORY_ID>`.
   - This creates the isolation branch, scaffolds `.aforge/specs/<STORY_ID>/`, and copies the story file.
   - **Capture** `BRANCH_NAME` and `BASE_BRANCH` from the script output (lines like `BRANCH_NAME: xxx` and `BASE_BRANCH: xxx`).
4. **Initialize checkpoint**: Run `.aforge/bin/checkpoint.sh init <STORY_ID> <BRANCH_NAME> <BASE_BRANCH>`.
   - Pass the branch name and base branch captured from step 3. This ensures `pr.sh` targets the correct base branch.
5. **Mark init complete**: Run `.aforge/bin/checkpoint.sh complete <STORY_ID> init`.
6. **Output**: `[AFK] Story: <STORY_ID>`

### Stage 1: Architect

1. **Build context pack** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `agent-forge:context-pack-builder` skill. Story ID: `<STORY_ID>`. Produce `.aforge/specs/<STORY_ID>/context-pack.md`."
   - **Description**: "Architect: context-pack-builder"
   - **Model**: Resolve complexity `medium` via the `agent-forge:model-strategy` skill
   - Verify output file exists after subagent returns.
   - Run `.aforge/bin/checkpoint.sh complete <STORY_ID> context_pack`.
2. **Finalize spec** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `agent-forge:spec-finalizer` skill. Story ID: `<STORY_ID>`. Produce `.aforge/specs/<STORY_ID>/assumptions.md`."
   - **Description**: "Architect: spec-finalizer"
   - **Model**: Resolve complexity `heavy` via the `agent-forge:model-strategy` skill
   - Verify output file exists after subagent returns.
   - Run `.aforge/bin/checkpoint.sh complete <STORY_ID> spec_finalizer`.
3. **Create implementation plan** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `agent-forge:implementation-planner` skill. Story ID: `<STORY_ID>`. Produce `.aforge/specs/<STORY_ID>/blueprint.md`."
   - **Description**: "Architect: implementation-planner"
   - **Model**: Resolve complexity `heavy` via the `agent-forge:model-strategy` skill
   - Verify output file exists after subagent returns.
   - Run `.aforge/bin/checkpoint.sh complete <STORY_ID> blueprint`.
4. **Output**: `[Architect] Complete: <N> tasks, <M> decisions`
   - N = count of `### Task` headings in blueprint.md
   - M = count of decisions in assumptions.md

### Stage 2: TestGen

1. **Compile test spec** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `agent-forge:test-spec-compiler` skill. Story ID: `<STORY_ID>`. Produce `.aforge/specs/<STORY_ID>/test-plan.md`."
   - **Description**: "TestGen: test-spec-compiler"
   - **Model**: Resolve complexity `medium` via the `agent-forge:model-strategy` skill
   - Verify output file exists after subagent returns.
   - Run `.aforge/bin/checkpoint.sh complete <STORY_ID> test_plan`.
2. **Output**: `[TestGen] Complete: <N> test cases`

### Stage 3: Code

1. **Read the dispatch protocol**: Read and follow the `agent-forge:subagent-task-dispatcher` skill for the full dispatch workflow.
2. **Read the model strategy**: Load the `agent-forge:model-strategy` skill for complexity-to-model resolution.
3. **Parse tasks** from `.aforge/specs/<STORY_ID>/blueprint.md` (each `### Task N:` heading).
4. **For each task** (in order), follow the Subagent Task Dispatcher protocol (Steps 1–7 in that skill). Pass these parameters:
   - `STORY_ID`: The current story identifier
   - `TASK_N`: The task number
   - `COMPLEXITY`: The `complexity` field from the task (e.g., `heavy`, `medium`, `light`). If missing, default to `medium`.
   - `COMMIT_MESSAGE`: `"Task N: <short description from blueprint>"`
   - After each task completes, run `.aforge/bin/checkpoint.sh complete <STORY_ID> task_<N>` (e.g., `task_1`, `task_2`).
4. **Output**: `[Code] Complete: <N> files changed, <M> tests passing`

### Stage 4: Closure

1. **Build PR description** — Dispatch a subagent:
   - **Prompt**: "Read and follow the `agent-forge:pull-request-builder` skill. Story ID: `<STORY_ID>`. Produce `.aforge/specs/<STORY_ID>/PR_DESCRIPTION.md`."
   - **Description**: "Closure: pull-request-builder"
   - **Model**: Resolve complexity `light` via the `agent-forge:model-strategy` skill
   - Verify output file exists after subagent returns.
2. **Create PR**: Run `.aforge/bin/pr.sh <STORY_ID>`.
3. **Mark complete**: Run `.aforge/bin/checkpoint.sh complete <STORY_ID> pr`.
4. **Output**: `[Complete] PR deployed: <link from pr.sh output>`

## Resumption Protocol

If `session-checkpoint.json` has stages already marked `true`, skip them:
- Read the checkpoint JSON. Find the first stage with value `false`.
- Resume from that stage. The stage keys in order are:
  `init` → `context_pack` → `spec_finalizer` → `blueprint` → `test_plan` → `task_1`..`task_N` → `pr`
- Read the existing artifacts (blueprint.md, test-plan.md, etc.) to understand context from prior stages.
- For task resumption: if `task_2` is `false` but `task_1` is `true`, start from Task 2 in the blueprint.

## Error Handling

- If a helper script fails (non-zero exit): Attempt once more. If still failing, output `[ERROR] <stage>: <reason>` and stop.
- If a skill execution produces no output file: Stop with `[ERROR] <stage>: <skill> produced no output`.
- Do NOT proceed to the next stage if the current stage's required artifacts are missing.
