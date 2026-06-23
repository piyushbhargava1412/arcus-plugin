---
name: repo-agentifier
description: >
  Orchestrator meta-skill that makes a repository agent-ready in one shot. Scans the repo with
  isolated subagents (repository scanning, flow discovery, test pattern extraction) to build the
  shared .context/ snapshot, then "agentifies" the repo by generating an AGENTS.md navigation index
  and a CLAUDE.md that imports it. Parallelizes independent stages for efficiency. Use when user says
  "agentify this repo", "wire me up", "make this repo agentic", "build context", "initialize context",
  "generate shared context", "bootstrap the .context folder", or "generate AGENTS.md".
layer: coordinator
standalone: true
---

# Repo Agentifier (Meta-Skill)

## Intent Detection

Activate this orchestration pipeline when the user's message matches ANY of:
- "agentify this repo" / "agentify the repository" / "make this repo agentic"
- "wire me up" / "wire up this repo"
- "generate AGENTS.md" / "create AGENTS.md"
- "build context" / "build shared context"
- "initialize context" / "init context"
- "generate context" / "generate shared context"
- "bootstrap context" / "bootstrap .context"
- "create repository context"
- "scan this repo" / "scan the repository"

When activated, follow the **Execution Pipeline** below.

## Key Principles

- **Subagent Isolation**: Each stage dispatches a fresh subagent with scoped context. The orchestrator stays lean — dispatch, verify output, proceed.
- **Parallelization**: Stages that share no dependency run in parallel (Stage 2a, 2b, and 2c).
- **Model Strategy**: Resolve model tier via the `arcus:model-strategy` skill for each subagent.
- **Evidence-Based**: All outputs are grounded in actual repository evidence. No speculation.
- **Template Adherence**: Subagents MUST follow the templates defined in their respective skill's `assets/` folder.

## Prerequisites

The orchestrator MUST be invoked from the root of a git repository with the `arcus` plugin enabled (or its skills available in the workspace's skills directory).

## Overwrite Guardrail

Before executing, check if `.context/` exists and contains files:
- If YES: Ask the user — "Shared context already exists in `.context/`. Rebuild from scratch? (y/N)"
- If user declines: Stop. Output `[Context] No changes made.`
- If user confirms or `.context/` does not exist: Proceed with the pipeline.

Separately, before Stage 3 writes the agentification files, detect which files already exist at the
repository root and offer the matching options. Resolve the user's choice into a **Stage 3 mode**:

- **Neither `AGENTS.md` nor `CLAUDE.md` exists** → proceed in `create` mode (no prompt needed).

- **`AGENTS.md` exists** → ask:
  > "`AGENTS.md` already exists. How should I proceed?
  > [U]pdate — refresh the generated navigation index while preserving any custom sections you added.
  > [O]verwrite — replace the whole file with a freshly generated index.
  > [S]kip — leave it untouched."
  Map `U` → `update`, `O` → `overwrite`, `S` → `skip`.

- **`CLAUDE.md` exists but `AGENTS.md` does NOT** → ask:
  > "`CLAUDE.md` exists but there is no `AGENTS.md`. How should I proceed?
  > [M]igrate — create `AGENTS.md` from the existing `CLAUDE.md` content, fold in the generated
  > navigation index, then replace `CLAUDE.md` with an `@AGENTS.md` import that references it.
  > [O]verwrite — generate a fresh `AGENTS.md` and reset `CLAUDE.md` to a plain `@AGENTS.md` import.
  > [S]kip — leave both untouched."
  Map `M` → `migrate`, `O` → `overwrite`, `S` → `skip`.

- **Both exist** → apply the `AGENTS.md` prompt above (`update`/`overwrite`/`skip`); in `update` and
  `overwrite` modes also ensure `CLAUDE.md` contains an `@AGENTS.md` import (add it if missing,
  preserving any other content already in `CLAUDE.md`).

If the user chooses `skip`, skip Stage 3 and output `[Stage 3] Agentify: skipped (existing files preserved)`.

## Stdout Output

Your chat response MUST contain ONLY these milestone lines:
```
[Context] Starting repository context build...
[Stage 1] Repository context: complete (repo_scope.md, repo_map.md)
[Stage 2] Flow discovery: complete (<N> flows)
[Stage 2] Test patterns: complete (testing-patterns.md)
[Stage 2] Design patterns: complete (design-and-coding-patterns.md)
[Stage 3] Agentify: complete (AGENTS.md, CLAUDE.md)
[Context] Done. Artifacts in .context/ + AGENTS.md, CLAUDE.md
```

**FORBIDDEN in chat**: Narrative, explanations, "Let me...", "Now I'll...", step-by-step commentary.

## Execution Pipeline

### Stage 1: Build Repository Context (Sequential — must complete before Stage 2)

**Purpose**: Produce `.context/repo_scope.md` and `.context/repo_map.md`.

1. Ensure `.context/` directory exists.
2. Read the subagent prompt template at `./assets/repo-context-prompt.md`.
3. Dispatch a subagent:
   - **Prompt**: The template content (it references the `repository-context-builder` skill internally)
   - **Description**: `"Context: repository-context-builder"`
   - **Model**: Resolve complexity `heavy` via the `arcus:model-strategy` skill
4. **Verify**: Confirm both `.context/repo_scope.md` and `.context/repo_map.md` exist and are non-empty.
   - If missing: Report `[ERROR] Stage 1 failed: missing output files` and STOP.
5. **Output**: `[Stage 1] Repository context: complete (repo_scope.md, repo_map.md)`

### Stage 2: Parallel Discovery (depends on Stage 1 outputs)

After Stage 1 completes successfully, read the contents of `.context/repo_scope.md` and `.context/repo_map.md`. These will be injected into Stage 2 subagent prompts.

Dispatch **all three** subagents in parallel:

#### Stage 2a: Flow Discovery

1. Read the subagent prompt template at `./assets/flow-discovery-prompt.md`.
2. Inject the contents of `repo_scope.md` and `repo_map.md` into the template's designated placeholders.
3. Dispatch a subagent:
   - **Prompt**: The populated template
   - **Description**: `"Context: flow-and-scope-discovery"`
   - **Model**: Resolve complexity `heavy` via the `arcus:model-strategy` skill
4. **Verify**: Confirm `.context/flows/` directory exists and contains at least one `.md` file.
   - If empty: Report `[WARN] No flows discovered — repository may lack clear entry surfaces.`

#### Stage 2b: Test Pattern Discovery

1. Read the subagent prompt template at `./assets/test-pattern-prompt.md`.
2. Inject the contents of `repo_scope.md` and `repo_map.md` into the template's designated placeholders.
3. Dispatch a subagent:
   - **Prompt**: The populated template
   - **Description**: `"Context: test-pattern-discovery"`
   - **Model**: Resolve complexity `medium` via the `arcus:model-strategy` skill
4. **Verify**: Confirm `.context/testing-patterns.md` exists and is non-empty.
   - If missing: Report `[WARN] Test patterns not generated — no test files detected.`

#### Stage 2c: Design Pattern Discovery

1. Read the subagent prompt template at `./assets/design-pattern-prompt.md`.
2. Inject the contents of `repo_scope.md` and `repo_map.md` into the template's designated placeholders.
3. Dispatch a subagent:
   - **Prompt**: The populated template
   - **Description**: `"Context: design-pattern-discovery"`
   - **Model**: Resolve complexity `heavy` via the `arcus:model-strategy` skill
4. **Verify**: Confirm `.context/design-and-coding-patterns.md` exists and is non-empty.
   - If missing: Report `[WARN] Design patterns not generated — no first-party source detected.`

### Stage 2 Completion

Wait for all three subagents to return before producing output:
- `[Stage 2] Flow discovery: complete (<N> flows)` — where N = count of `.md` files in `.context/flows/`
- `[Stage 2] Test patterns: complete (testing-patterns.md)`
- `[Stage 2] Design patterns: complete (design-and-coding-patterns.md)`

### Stage 3: Agentify — Generate AGENTS.md + CLAUDE.md (depends on Stages 1–2)

**Purpose**: Turn the freshly built `.context/` snapshot into an agent-facing navigation index so
any coding agent (Claude Code, Copilot, etc.) can orient itself instantly.

This stage runs **inline** in the orchestrator — no subagent is dispatched, since the context files
are already on disk and only need to be read and indexed.

1. Honor the Stage 3 portion of the **Overwrite Guardrail** above and resolve the **Stage 3 mode**
   (`create` / `update` / `overwrite` / `migrate` / `skip`). If the mode is `skip`, skip this stage
   and emit `[Stage 3] Agentify: skipped (existing files preserved)`.
2. Read `.context/repo_scope.md` and `.context/repo_map.md`.
3. List the `.md` files in `.context/flows/` to build the dynamic Business Flows index. Derive a
   human-readable label from each kebab-case filename (e.g. `order-checkout.md` → "Order Checkout").
4. Read the template at `./assets/agents-template.md` and populate every placeholder using **only**
   evidence from the context files (repo name, generated date, 1–2 line summary, flow index). Do not
   invent content not present in `.context/`. Call this the **generated index**.
5. Produce `AGENTS.md` at the repository root according to the resolved mode:
   - `create` / `overwrite`: write the generated index as the full file contents.
   - `update`: merge the generated index into the existing `AGENTS.md` — replace the managed
     sections (Project Context, Navigation Index, Business Flows) with the freshly generated ones,
     and **preserve any other custom sections** the user added. Refresh the `Generated` date.
   - `migrate`: create `AGENTS.md` from the existing `CLAUDE.md` content, then fold the generated
     index into it (managed sections take the generated values; keep the migrated custom prose).
6. Produce `CLAUDE.md` at the repository root so Claude Code inlines the index at session start:
   - `create` / `overwrite` / `migrate`: write exactly one import line:
     ```
     @AGENTS.md
     ```
   - `update`: if `CLAUDE.md` already imports `AGENTS.md`, leave it untouched; otherwise add an
     `@AGENTS.md` import line while preserving any existing content.
7. **Verify**: Confirm `AGENTS.md` and `CLAUDE.md` exist and are non-empty, and that every
   `.context/...` link in `AGENTS.md` points to a file that exists.
   - If missing: Report `[WARN] Stage 3 incomplete — AGENTS.md/CLAUDE.md not written.`
8. **Output**: `[Stage 3] Agentify: complete (AGENTS.md, CLAUDE.md)`

## Error Handling

- If a subagent produces no output: Retry **once** with the same prompt. If still failing, report the specific failure and STOP (for Stage 1) or WARN (for Stage 2).
- If the skills folder cannot be located: Report `[ERROR] ARCUS skills not found. Is the arcus plugin enabled?` and STOP.
- If not in a git repository: Report `[ERROR] Must be run from root of a git repository.` and STOP.
- Do NOT proceed to Stage 2 if Stage 1 failed.

## Expected Output

After successful execution, the repository must contain:
- `.context/repo_scope.md`
- `.context/repo_map.md`
- `.context/flows/*.md` (one per discovered flow)
- `.context/testing-patterns.md`
- `.context/design-and-coding-patterns.md`
- `AGENTS.md` (repository root — agent navigation index)
- `CLAUDE.md` (repository root — imports `AGENTS.md`)

## Completion

Output only:
```
[Context] Done. Artifacts in .context/ + AGENTS.md, CLAUDE.md
```

Followed by a brief summary:
- repo_scope.md: created/refreshed
- repo_map.md: created/refreshed
- flows: <N> files
- testing-patterns.md: created/refreshed
- design-and-coding-patterns.md: created/refreshed
- AGENTS.md: created/refreshed
- CLAUDE.md: created/refreshed
